#!/usr/bin/env bash
set -euo pipefail

# Prove scripts/verify-pinned-tag.sh accepts only a tag signed by the pinned
# signing subkey with the committed tagger, and rejects every other shape.
# Uses throwaway keys in a throwaway repository; never touches real keyrings.
#
# Also checks GitHub repo detection in scripts/release-verify-remote-tag.sh
# for plain, aliased-SSH, ssh:// and https remotes.

root="$(git rev-parse --show-toplevel)"
source "$root/scripts/release-env.sh"
refuse_legacy_release_env
resolve_release_decernor
unset FULMENHQ_CRUCIBLE_RELEASE_TAG

if ! command -v gpg >/dev/null 2>&1; then
	echo "error: gpg is required for release tooling tests" >&2
	exit 1
fi

work="$(mktemp -d)"
cleanup() {
	gpgconf --homedir "$work/gnupg" --kill all >/dev/null 2>&1 || true
	gpgconf --homedir "$work/gnupg-foreign" --kill all >/dev/null 2>&1 || true
	gpgconf --homedir "$work/gnupg-multi" --kill all >/dev/null 2>&1 || true
	rm -rf "$work"
}
trap cleanup EXIT

failures=0
pass() { echo "  ok   $1"; }
fail() {
	echo "  FAIL $1" >&2
	failures=$((failures + 1))
}

# new_key HOMEDIR UID [SIGNING_SUBKEYS] -> prints primary fingerprint
new_key() {
	local home="$1" uid="$2" subkeys="${3:-1}" fpr i
	mkdir -p "$home"
	chmod 700 "$home"
	GNUPGHOME="$home" gpg --batch --quiet --passphrase '' --pinentry-mode loopback \
		--quick-gen-key "$uid" ed25519 cert 1y >/dev/null 2>&1
	fpr="$(GNUPGHOME="$home" gpg --batch --with-colons --list-keys "$uid" 2>/dev/null | awk -F: '$1=="fpr" {print $10; exit}')"
	for ((i = 0; i < subkeys; i++)); do
		GNUPGHOME="$home" gpg --batch --quiet --passphrase '' --pinentry-mode loopback \
			--quick-add-key "$fpr" ed25519 sign 1y 2>/dev/null
	done
	printf '%s' "$fpr"
}

signing_subkey() {
	GNUPGHOME="$1" gpg --batch --with-colons --with-subkey-fingerprint --list-keys "$2" 2>/dev/null |
		awk -F: '$1=="sub" {s=1; cap=$12; next} s && $1=="fpr" {if (cap ~ /s/) {print $10; exit}; s=0}'
}

# Minisign public key: comment line + base64("Ed" + 8-byte id + 32-byte key).
new_minisign_pub() {
	python3 - "$1" <<'PY'
import base64, os, sys
blob = b"Ed" + os.urandom(40)
with open(sys.argv[1], "w") as f:
    f.write("untrusted comment: test minisign public key\n")
    f.write(base64.b64encode(blob).decode() + "\n")
PY
}

minisign_anchor() {
	"$RELEASE_DECERNOR_BIN" fingerprint --class public --path-mode none "$1" |
		jq -r 'select(.fingerprint_scheme == "minisign-public-blob-sha256-v1") | .fingerprint'
}

write_anchors() {
	"$RELEASE_DECERNOR_BIN" fingerprint --class public --gpg-role primary --path-mode none \
		docs/security/release-signing-keys.asc docs/security/release-minisign.pub |
		jq -sc 'map(select(.fingerprint_scheme == "openpgp-fingerprint-v1" or .fingerprint_scheme == "minisign-public-blob-sha256-v1")) | sort_by(.kind) | .[]' >keys/expected-fingerprints.ndjson
	jq -r '"\(.kind) \(.fingerprint)"' keys/expected-fingerprints.ndjson >keys/expected-fingerprints.txt
}

tagger_name="Test Release"
tagger_email="release@example.invalid"
primary="$(new_key "$work/gnupg" "$tagger_name <$tagger_email>")"
export FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT="$primary"
subkey="$(signing_subkey "$work/gnupg" "$primary")"
foreign="$(new_key "$work/gnupg-foreign" "Foreign <foreign@example.invalid>")"
foreign_subkey="$(signing_subkey "$work/gnupg-foreign" "$foreign")"
multi="$(new_key "$work/gnupg-multi" "$tagger_name <$tagger_email>" 2)"

repo="$work/repo"
mkdir -p "$repo/scripts" "$repo/docs/security" "$repo/keys" "$repo/config/release"
cp "$root/scripts/verify-pinned-tag.sh" "$repo/scripts/"
cp "$root/scripts/release-env.sh" "$root/scripts/release-verify-anchors.sh" "$repo/scripts/"
cd "$repo"
git init --quiet -b main
git config user.name "$tagger_name"
git config user.email "$tagger_email"
git config gpg.program gpg
git config commit.gpgsign false
git config tag.gpgsign false

new_minisign_pub docs/security/release-minisign.pub
GNUPGHOME="$work/gnupg" gpg --batch --armor --export "$primary" >docs/security/release-signing-keys.asc
write_anchors
printf '%s <%s>\n' "$tagger_name" "$tagger_email" >config/release/tagger-identity.txt
git add -A
git commit --quiet -m "pinned trust files"
base="$(git rev-parse HEAD)"

# on_variant NAME -> fresh commit on a branch from the good baseline
on_variant() {
	git checkout --quiet -B "variant-$1" "$base"
}

commit_variant() {
	git add -A
	git commit --quiet --allow-empty -m "variant $1"
}

# sign_tag TAG HOMEDIR KEY [TAGGER_NAME TAGGER_EMAIL]
sign_tag() {
	GNUPGHOME="$2" GIT_COMMITTER_NAME="${4:-$tagger_name}" GIT_COMMITTER_EMAIL="${5:-$tagger_email}" \
		git tag -s -a "$1" -u "$3!" -m "Release $1"
}

expect() {
	local want="$1" name="$2" tag="$3" out
	if out="$("$root/scripts/verify-pinned-tag.sh" "$tag" 2>&1)"; then
		if [ "$want" = accept ]; then pass "$name"; else fail "$name (accepted: $out)"; fi
	else
		if [ "$want" = reject ]; then pass "$name"; else fail "$name (rejected: $out)"; fi
	fi
}

echo "→ verify-pinned-tag.sh"

sign_tag v1.0.0 "$work/gnupg" "$subkey"
expect accept "tag signed by pinned subkey with committed tagger" v1.0.0

reject_with() {
	local name="$1" diagnostic="$2"
	shift 2
	if "$@" >"$work/reject.log" 2>&1; then
		fail "$name (accepted)"
	elif grep -q "$diagnostic" "$work/reject.log"; then
		pass "$name"
	else
		cat "$work/reject.log" >&2
		fail "$name (wrong rejection)"
	fi
}
reject_with 'missing approved primary' 'independently approved primary' env -u FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'malformed approved primary' 'independently approved primary' env FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT=abc "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'missing checker' 'absolute regular non-symlink' env -u FULMENHQ_CRUCIBLE_DECERNOR_BIN "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'missing explicit tag' 'explicit TAG required' "$root/scripts/verify-pinned-tag.sh"
reject_with 'missing ceremony tag' 'never derived' env -u FULMENHQ_CRUCIBLE_RELEASE_TAG "$root/scripts/release-verify-tag.sh"
reject_with 'bare tag refused' 'retired input' env RELEASE_TAG=v1.0.0 "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'unprefixed TAG refused' 'retired input' env TAG=v1.0.0 "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'public pin override refused even when matching' 'committed-pin override' env FULMENHQ_CRUCIBLE_MINISIGN_PUB="$repo/docs/security/release-minisign.pub" "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'tag argument and ceremony env disagree' 'tag argument differs' env FULMENHQ_CRUCIBLE_RELEASE_TAG=v9.0.0 "$root/scripts/verify-pinned-tag.sh" v1.0.0
ln -s "$RELEASE_DECERNOR_BIN" "$work/decernor-link"
reject_with 'checker symlink refused' 'non-symlink' env FULMENHQ_CRUCIBLE_DECERNOR_BIN="$work/decernor-link" "$root/scripts/verify-pinned-tag.sh" v1.0.0
reject_with 'relative checker refused' 'absolute regular' env FULMENHQ_CRUCIBLE_DECERNOR_BIN=decernor "$root/scripts/verify-pinned-tag.sh" v1.0.0
for entry in release-tag release-push-tag release-verify-tag release-verify-remote-tag; do
	reject_with "$entry requires approved primary" 'independently approved primary' env -u FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT FULMENHQ_CRUCIBLE_RELEASE_TAG=v1.0.0 "$root/scripts/$entry.sh"
done
reject_with 'key selection requires approved primary' 'independently approved primary' env -u FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT "$root/scripts/pinned-signing-subkey.sh"
reject_with 'attestation verifier requires approved primary' 'independently approved primary' env -u FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT "$root/scripts/verify-tag-attestation.sh" v1.0.0

on_variant foreign-consistent
GNUPGHOME="$work/gnupg-foreign" gpg --batch --armor --export "$foreign" >docs/security/release-signing-keys.asc
write_anchors
commit_variant foreign-consistent
sign_tag v1.0.5 "$work/gnupg-foreign" "$foreign_subkey"
reject_with 'foreign key plus matching anchors rejected by independent approval' 'not the independently approved primary' "$root/scripts/verify-pinned-tag.sh" v1.0.5
# The exact same candidate is cryptographically valid when independently approved.
if FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT="$foreign" "$root/scripts/verify-pinned-tag.sh" v1.0.5 >"$work/approved.log" 2>&1; then
	pass 'foreign-consistent control reaches authority constraint'
else
	cat "$work/approved.log" >&2
	fail 'foreign-consistent positive control'
fi

on_variant candidate-code
printf '#!/usr/bin/env bash\ntouch "%s"\nexit 0\n' "$work/candidate-executed" >scripts/release-verify-anchors.sh
commit_variant candidate-code
sign_tag v1.0.6 "$work/gnupg" "$subkey"
expect accept 'trusted verifier ignores candidate helper code' v1.0.6
if [[ ! -e "$work/candidate-executed" ]]; then pass 'candidate code never executed'; else fail 'candidate code executed'; fi

on_variant invalid-binding
# Corrupt only the public export's last binding signature packet. This is a
# deliberately malformed public fixture, not a second fingerprint derivation.
python3 -I - docs/security/release-signing-keys.asc <<'PY'
import base64, pathlib, sys
p = pathlib.Path(sys.argv[1])
lines = p.read_text().splitlines()
raw = bytearray(base64.b64decode(''.join(x for x in lines if x and not x.startswith(('-----', '=')) and ':' not in x)))
raw[-1] ^= 1
encoded = base64.b64encode(raw).decode()
p.write_text('-----BEGIN PGP PUBLIC KEY BLOCK-----\n\n' + '\n'.join(encoded[i:i+64] for i in range(0,len(encoded),64)) + '\n-----END PGP PUBLIC KEY BLOCK-----\n')
PY
commit_variant invalid-binding
sign_tag v1.0.7 "$work/gnupg" "$subkey"
expect reject 'invalid signing subkey binding' v1.0.7

on_variant alternate-subkey
GNUPGHOME="$work/gnupg" gpg --batch --quiet --passphrase '' --pinentry-mode loopback --quick-add-key "$primary" ed25519 sign 1y 2>/dev/null
alternate="$(GNUPGHOME="$work/gnupg" gpg --with-colons --with-subkey-fingerprint --list-keys "$primary" 2>/dev/null | awk -F: '$1=="fpr" {f=$10} END {print f}')"
GNUPGHOME="$work/gnupg" gpg --batch --armor --export-filter "drop-subkey=fpr = $subkey" --export "$primary" >docs/security/release-signing-keys.asc
write_anchors
commit_variant alternate-subkey
sign_tag v1.0.8 "$work/gnupg" "$alternate"
expect accept 'same-primary alternate valid signing subkey may authorize candidate policy' v1.0.8
on_variant baseline

reject_with 'exact object cannot be relabelled by tag argument' 'tag name mismatch' "$root/scripts/verify-pinned-tag.sh" v1.0.0 "$(git rev-parse refs/tags/v1.0.6)"
on_variant missing-ndjson
git rm --quiet keys/expected-fingerprints.ndjson
commit_variant missing-ndjson
sign_tag v1.0.9 "$work/gnupg" "$subkey"
reject_with 'missing committed NDJSON is fatal' 'committed regular file required: keys/expected-fingerprints.ndjson' "$root/scripts/verify-pinned-tag.sh" v1.0.9
on_variant baseline

sign_tag v1.0.1 "$work/gnupg" "$subkey" "Someone Else" "other@example.invalid"
expect reject "wrong tagger identity" v1.0.1

git tag v1.0.2
expect reject "lightweight tag" v1.0.2

git tag -a v1.0.3 -m "Release v1.0.3"
expect reject "unsigned annotated tag" v1.0.3

sign_tag v1.0.4 "$work/gnupg-foreign" "$foreign_subkey"
expect reject "tag signed by a foreign key" v1.0.4

sign_tag v1.0 "$work/gnupg" "$subkey"
expect reject "non-canonical tag name" v1.0

on_variant gpg-anchor
printf 'gpg %s\nminisign %s\n' "$foreign" "$(minisign_anchor docs/security/release-minisign.pub)" >keys/expected-fingerprints.txt
commit_variant gpg-anchor
sign_tag v1.1.0 "$work/gnupg" "$subkey"
expect reject "gpg anchor does not match pin" v1.1.0
replaced_commit="$(git rev-parse 'v1.1.0^{commit}')"
git replace "$replaced_commit" "$base"
expect reject 'local replacement ref cannot replace signed candidate policy' v1.1.0
git replace -d "$replaced_commit" >/dev/null

on_variant minisign-anchor
new_minisign_pub docs/security/release-minisign.pub
commit_variant minisign-anchor
sign_tag v1.2.0 "$work/gnupg" "$subkey"
expect reject "minisign pub does not match anchor" v1.2.0

on_variant multi-subkey
GNUPGHOME="$work/gnupg-multi" gpg --batch --armor --export "$multi" >docs/security/release-signing-keys.asc
write_anchors
commit_variant multi-subkey
sign_tag v1.3.0 "$work/gnupg-multi" "$(signing_subkey "$work/gnupg-multi" "$multi")"
FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT="$multi" expect reject "pin with more than one signing subkey" v1.3.0

on_variant secret-pin
GNUPGHOME="$work/gnupg" gpg --batch --armor --passphrase '' --pinentry-mode loopback \
	--export-secret-keys "$primary" >docs/security/release-signing-keys.asc 2>/dev/null
commit_variant secret-pin
sign_tag v1.4.0 "$work/gnupg" "$subkey"
expect reject "pin containing secret key material" v1.4.0

on_variant missing-tagger
git rm --quiet config/release/tagger-identity.txt
commit_variant missing-tagger
sign_tag v1.5.0 "$work/gnupg" "$subkey"
expect reject "tagged commit without tagger identity file" v1.5.0

echo "→ release-verify-remote-tag.sh repo detection"
detect_fn="$(sed -n '/^detect_repo()/,/^}/p' "$root/scripts/release-verify-remote-tag.sh")"
for url in \
	git@github.com:fulmenhq/crucible.git \
	git@github-for-alias:fulmenhq/crucible.git \
	ssh://git@github.com/fulmenhq/crucible.git \
	https://github.com/fulmenhq/crucible.git \
	https://github.com/fulmenhq/crucible; do
	got="$(
		# shellcheck disable=SC2329 # invoked by detect_repo
		git() { printf '%s' "$url"; }
		eval "$detect_fn"
		detect_repo
	)" || got=""
	if [ "$got" = "fulmenhq/crucible" ]; then pass "detect $url"; else fail "detect $url (got '$got')"; fi
done

echo "→ release-tag.sh preflight and rollback"
on_variant creation
cp "$root/scripts/pinned-signing-subkey.sh" scripts/
printf '2.0.0\n' >VERSION
printf '/dist/\n' >.gitignore
minisign -G -W -f -s "$work/creation-minisign.key" -p docs/security/release-minisign.pub >/dev/null
write_anchors
commit_variant creation

# Source the production functions and replace only terminal setup. All signing
# uses the throwaway keyrings above; the production entry point still needs a TTY.
run_create() {
	local home="$1" key="${2:-}" mode="${3:-}"
	FULMENHQ_CRUCIBLE_GPG_HOMEDIR="$home" \
		FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1 \
		FULMENHQ_CRUCIBLE_RELEASE_TAG=v2.0.0 \
		FULMENHQ_CRUCIBLE_PGP_KEY_ID="" \
		FULMENHQ_CRUCIBLE_MINISIGN_KEY="$key" \
		TEST_MINISIGN_MODE="$mode" \
		PATH="$work/mock-bin:$PATH" \
		bash -c 'source "$1"; setup_gpg_tty() { :; }; main' bash "$root/scripts/release-tag.sh" >"$work/create.log" 2>&1
}
mkdir "$work/mock-bin"
if run_create "$work/gnupg-foreign"; then
	fail "foreign-only keyring accepted by creation preflight"
elif grep -q 'pinned signing subkey is not available' "$work/create.log" && ! git show-ref --verify --quiet refs/tags/v2.0.0; then
	pass "foreign-only keyring rejected before tag creation"
else
	cat "$work/create.log" >&2
	fail "foreign-key rejection lacked expected preflight evidence"
fi
if run_create "$work/gnupg"; then
	fail 'missing minisign signing input accepted'
elif grep -q 'MINISIGN_KEY is required' "$work/create.log" && ! git show-ref --verify --quiet refs/tags/v2.0.0; then
	pass 'missing minisign input rejected before tag creation'
else
	cat "$work/create.log" >&2
	fail 'missing minisign input lacked expected preflight evidence'
fi
if run_create "$work/gnupg" "$work/creation-minisign.key"; then
	pass "pinned subkey creation succeeds"
	git tag -d v2.0.0 >/dev/null
	rm -f dist/release/v2.0.0.tag.txt dist/release/v2.0.0.tag.txt.minisig
else
	cat "$work/create.log" >&2
	fail "pinned subkey creation failed"
fi

# Host signing settings are overridden on the signing command, not rejected.
git config gpg.format ssh
git config gpg.program /nonexistent/host-wrapper
git config gpg.openpgp.program /nonexistent/host-wrapper
if run_create "$work/gnupg" "$work/creation-minisign.key"; then
	pass 'explicit signing command overrides host format and both programs'
	git tag -d v2.0.0 >/dev/null
	rm -f dist/release/v2.0.0.tag.txt dist/release/v2.0.0.tag.txt.minisig
else
	cat "$work/create.log" >&2
	fail 'host signing override positive control'
fi
git config --unset gpg.format
git config gpg.program gpg
git config --unset gpg.openpgp.program

# Exercise post-create failure transaction independently of minisign crypto:
# mock signing writes a sidecar, then fails either signing or verification.
cat >"$work/mock-bin/minisign" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == -Sm ]]; then
  touch "$2.minisig"
  [[ "$TEST_MINISIGN_MODE" != signing ]]
else
  exit 1
fi
EOF
chmod +x "$work/mock-bin/minisign"
touch "$work/minisign-test.key"
for mode in signing verification; do
	if run_create "$work/gnupg" "$work/minisign-test.key" "$mode"; then
		fail "minisign $mode failure unexpectedly accepted"
	elif ! git show-ref --verify --quiet refs/tags/v2.0.0 &&
		[ ! -e dist/release/v2.0.0.tag.txt ] && [ ! -e dist/release/v2.0.0.tag.txt.minisig ] &&
		grep -q 'Minisign tag attestation:' "$work/create.log"; then
		pass "minisign $mode failure rolls back tag and generated sidecars"
	else
		cat "$work/create.log" >&2
		fail "minisign $mode failure did not roll back cleanly"
	fi
done

echo "→ tag attestation binding"
if ! command -v minisign >/dev/null 2>&1; then
	echo 'error: minisign is required for attestation regression tests' >&2
	exit 1
fi
on_variant attestation
cp "$root/scripts/verify-tag-attestation.sh" scripts/
cp "$root/scripts/release-publish-assets.sh" "$root/scripts/release-verify-remote-tag.sh" scripts/
printf '/dist/\n' >.gitignore
printf '3.0.0\n' >VERSION
mkdir -p release-notes
printf 'Test release\n' >release-notes/3.0.0.md
minisign -G -W -f -s "$work/real-minisign.key" -p docs/security/release-minisign.pub >/dev/null
write_anchors
commit_variant attestation
sign_tag v3.0.0 "$work/gnupg" "$subkey"
mkdir -p dist/release
payload=dist/release/v3.0.0.tag.txt
printf 'tag: v3.0.0\ntag_object: %s\ntag_target: %s\n' "$(git rev-parse refs/tags/v3.0.0)" "$(git rev-parse 'v3.0.0^{commit}')" >"$payload"
minisign -Sm "$payload" -s "$work/real-minisign.key" >/dev/null
if ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	pass 'valid tag-bound attestation'
else
	cat "$work/attestation.log" >&2
	fail 'valid tag-bound attestation rejected'
fi
cp "$payload" "$work/good-payload"
if FULMENHQ_CRUCIBLE_REQUIRE_MINISIGN=0 ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	fail 'valid pair allowed mandatory attestation to be disabled'
elif grep -q 'required minisign attestation cannot be disabled' "$work/attestation.log"; then
	pass 'valid pair rejects disabling mandatory attestation'
else
	cat "$work/attestation.log" >&2
	fail 'disable rejection lacked expected diagnostic'
fi
printf 'tag: v99.0.0\ntag_object: unrelated\ntag_target: unrelated\n' >"$payload"
minisign -Sm "$payload" -s "$work/real-minisign.key" >/dev/null
if ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	fail 'unrelated signed payload accepted'
elif grep -q 'payload does not match' "$work/attestation.log"; then
	pass 'unrelated signed payload rejected'
else
	fail 'payload rejection lacked binding diagnostic'
fi
cp "$work/good-payload" "$payload"
minisign -G -W -s "$work/foreign-minisign.key" -p "$work/foreign-minisign.pub" >/dev/null
minisign -Sm "$payload" -s "$work/foreign-minisign.key" >/dev/null
if FULMENHQ_CRUCIBLE_MINISIGN_PUB="$work/foreign-minisign.pub" ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	fail 'foreign override bypassed committed minisign pin'
else
	pass 'foreign override cannot replace minisign pin'
fi
rm "$payload.minisig"
if ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	fail 'incomplete attestation pair accepted'
elif grep -q 'incomplete' "$work/attestation.log"; then
	pass 'incomplete attestation pair rejected'
else
	fail 'incomplete attestation failed for unexpected reason'
fi
rm "$payload"
if FULMENHQ_CRUCIBLE_REQUIRE_MINISIGN=1 ./scripts/verify-tag-attestation.sh v3.0.0 >"$work/attestation.log" 2>&1; then
	fail 'required absent attestation accepted'
elif grep -q 'required minisign attestation is absent' "$work/attestation.log"; then
	pass 'required absent attestation rejected'
else
	fail 'absent attestation failed for unexpected reason'
fi

echo "→ remote object verification (mock GitHub only)"
git remote add origin https://github.com/example/test.git
mkdir -p "$work/gh-bin"
cat >"$work/gh-bin/gh" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  *git/ref/tags/*) printf '%s\n' "$MOCK_REMOTE_OBJECT" ;;
  *git/tags/*) printf '%s\tv3.0.0\tcommit\t%s\ttrue\tvalid\n' "$MOCK_REMOTE_OBJECT" "$MOCK_REMOTE_COMMIT" ;;
  *) exit 1 ;;
esac
EOF
chmod +x "$work/gh-bin/gh"
MOCK_REMOTE_OBJECT="$(git rev-parse refs/tags/v3.0.0)"
MOCK_REMOTE_COMMIT="$(git rev-parse 'v3.0.0^{commit}')"
export MOCK_REMOTE_OBJECT MOCK_REMOTE_COMMIT
export FULMENHQ_CRUCIBLE_RELEASE_TAG=v3.0.0
cp "$work/good-payload" "$payload"
minisign -Sm "$payload" -s "$work/real-minisign.key" >/dev/null
if MOCK_REMOTE_OBJECT=0000000000000000000000000000000000000000 PATH="$work/gh-bin:$PATH" "$root/scripts/release-verify-remote-tag.sh" >"$work/publish.log" 2>&1; then
	fail 'different remote tag accepted'
elif grep -q 'remote tag object differs' "$work/publish.log"; then
	pass 'different remote tag rejected'
else
	cat "$work/publish.log" >&2
	fail 'remote mismatch lacked expected fail-closed evidence'
fi
if PATH="$work/gh-bin:$PATH" "$root/scripts/release-verify-remote-tag.sh" >"$work/publish.log" 2>&1; then
	pass 'verified matching remote tag'
else
	cat "$work/publish.log" >&2
	fail 'valid remote control failed'
fi
reject_with 'GitHub verified with wrong commit is insufficient' 'does not report' env MOCK_REMOTE_COMMIT=0000000000000000000000000000000000000000 PATH="$work/gh-bin:$PATH" "$root/scripts/release-verify-remote-tag.sh"

echo "→ single-tag publication (throwaway local remote only)"
cp "$root/scripts/release-push-tag.sh" "$root/scripts/release-verify-tag.sh" scripts/
git init --bare -q "$work/remote.git"
git remote set-url origin "$work/remote.git"
git push -q origin HEAD:refs/heads/main
git tag -a unreviewed-tag -m 'Must remain local'
git config push.followTags true
REAL_GIT="$(command -v git)"
export REAL_GIT PUSH_TRACE="$work/push-trace"
mkdir "$work/git-bin"
cat >"$work/git-bin/git" <<'EOF'
#!/usr/bin/env bash
if [[ "${SWAP_TAG_OBJECT:-0}" == 1 ]]; then
  if [[ "$*" == 'rev-parse refs/tags/v3.0.0' && ! -e "$SWAP_MARKER" ]]; then
    "$REAL_GIT" "$@"
    "$REAL_GIT" update-ref refs/tags/v3.0.0 "$SWAP_GOOD"
    touch "$SWAP_MARKER"
    exit 0
  fi
  if [[ "$1" == fetch ]]; then
    "$REAL_GIT" update-ref refs/tags/v3.0.0 "$SWAP_BAD"
  fi
fi
if [[ "$1" == ls-remote && "${FAIL_LOOKUP:-0}" == 1 ]]; then
  exit 128
fi
for arg in "$@"; do
  if [[ "$arg" == push ]]; then printf '%s\n' "$*" >> "$PUSH_TRACE"; fi
done
exec "$REAL_GIT" "$@"
EOF
chmod +x "$work/git-bin/git"
SWAP_GOOD=$(git rev-parse refs/tags/v3.0.0)
SWAP_BAD=$(git cat-file tag "$SWAP_GOOD" | sed '/^-----BEGIN PGP SIGNATURE-----/,$d' | git mktag)
export SWAP_GOOD SWAP_BAD SWAP_MARKER="$work/swapped"
git update-ref refs/tags/v3.0.0 "$SWAP_BAD"
if SWAP_TAG_OBJECT=1 PATH="$work/git-bin:$work/gh-bin:$PATH" ./scripts/release-push-tag.sh >"$work/push.log" 2>&1; then
	fail 'unsigned captured object passed swapped-ref verification'
elif [ -e "$SWAP_MARKER" ] && [ ! -e "$PUSH_TRACE" ] && grep -q 'tag signature invalid' "$work/push.log"; then
	pass 'captured unsigned object rejected before push despite approved ref swap'
else
	cat "$work/push.log" >&2
	fail 'ref-swap control lacked pre-push signature rejection'
fi
git update-ref refs/tags/v3.0.0 "$SWAP_GOOD"
if FAIL_LOOKUP=1 PATH="$work/git-bin:$work/gh-bin:$PATH" ./scripts/release-push-tag.sh >"$work/push.log" 2>&1; then
	fail 'failed remote lookup accepted'
elif [ ! -e "$PUSH_TRACE" ] && grep -q 'could not query remote tag' "$work/push.log"; then
	pass 'failed remote lookup blocks push'
else
	cat "$work/push.log" >&2
	fail 'lookup failure did not stop before push'
fi
# The mock GitHub API remains pinned to the real local tag object. All Git
# transfers go only to the temporary bare repository above.
if FULMENHQ_CRUCIBLE_GITHUB_REPO=example/test PATH="$work/git-bin:$work/gh-bin:$PATH" ./scripts/release-push-tag.sh >"$work/push.log" 2>&1; then
	remote_tags=$(git --git-dir="$work/remote.git" for-each-ref --format='%(refname)' refs/tags)
	if [[ "$remote_tags" == refs/tags/v3.0.0 ]]; then
		pass 'push.followTags=true still publishes only the verified tag'
	else
		fail "unexpected remote tags: $remote_tags"
	fi
else
	cat "$work/push.log" >&2
	fail 'single-tag publication positive control failed'
fi

if [ "$failures" -gt 0 ]; then
	echo "❌ release tooling test: $failures failure(s)" >&2
	exit 1
fi
echo "✅ release tooling test passed"
