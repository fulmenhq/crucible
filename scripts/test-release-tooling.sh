#!/usr/bin/env bash
set -euo pipefail

# Prove scripts/verify-pinned-tag.sh accepts only a tag signed by the pinned
# signing subkey with the committed tagger, and rejects every other shape.
# Uses throwaway keys in a throwaway repository; never touches real keyrings.
#
# Also checks GitHub repo detection in scripts/release-verify-remote-tag.sh
# for plain, aliased-SSH, ssh:// and https remotes.

root="$(git rev-parse --show-toplevel)"

if ! command -v gpg >/dev/null 2>&1; then
	echo "note: gpg not found; skipping release tooling test" >&2
	exit 0
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
		--quick-gen-key "$uid" ed25519 cert never >/dev/null 2>&1
	fpr="$(GNUPGHOME="$home" gpg --batch --with-colons --list-keys "$uid" 2>/dev/null | awk -F: '$1=="fpr" {print $10; exit}')"
	for ((i = 0; i < subkeys; i++)); do
		GNUPGHOME="$home" gpg --batch --quiet --passphrase '' --pinentry-mode loopback \
			--quick-add-key "$fpr" ed25519 sign never 2>/dev/null
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
	python3 - "$1" <<'PY'
import base64, hashlib, sys
line = open(sys.argv[1]).read().splitlines()[1]
print(hashlib.sha256(base64.b64decode(line)).hexdigest())
PY
}

tagger_name="Test Release"
tagger_email="release@example.invalid"
primary="$(new_key "$work/gnupg" "$tagger_name <$tagger_email>")"
subkey="$(signing_subkey "$work/gnupg" "$primary")"
foreign="$(new_key "$work/gnupg-foreign" "Foreign <foreign@example.invalid>")"
foreign_subkey="$(signing_subkey "$work/gnupg-foreign" "$foreign")"
multi="$(new_key "$work/gnupg-multi" "$tagger_name <$tagger_email>" 2)"

repo="$work/repo"
mkdir -p "$repo/scripts" "$repo/docs/security" "$repo/keys" "$repo/config/release"
cp "$root/scripts/verify-pinned-tag.sh" "$repo/scripts/"
cd "$repo"
git init --quiet -b main
git config user.name "$tagger_name"
git config user.email "$tagger_email"
git config gpg.program gpg
git config commit.gpgsign false
git config tag.gpgsign false

new_minisign_pub docs/security/release-minisign.pub
GNUPGHOME="$work/gnupg" gpg --batch --armor --export "$primary" >docs/security/release-signing-keys.asc
printf 'gpg %s\nminisign %s\n' "$primary" "$(minisign_anchor docs/security/release-minisign.pub)" >keys/expected-fingerprints.txt
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
	if out="$(./scripts/verify-pinned-tag.sh "$tag" 2>&1)"; then
		if [ "$want" = accept ]; then pass "$name"; else fail "$name (accepted: $out)"; fi
	else
		if [ "$want" = reject ]; then pass "$name"; else fail "$name (rejected: $out)"; fi
	fi
}

echo "→ verify-pinned-tag.sh"

sign_tag v1.0.0 "$work/gnupg" "$subkey"
expect accept "tag signed by pinned subkey with committed tagger" v1.0.0

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

on_variant minisign-anchor
new_minisign_pub docs/security/release-minisign.pub
commit_variant minisign-anchor
sign_tag v1.2.0 "$work/gnupg" "$subkey"
expect reject "minisign pub does not match anchor" v1.2.0

on_variant multi-subkey
GNUPGHOME="$work/gnupg-multi" gpg --batch --armor --export "$multi" >docs/security/release-signing-keys.asc
printf 'gpg %s\nminisign %s\n' "$multi" "$(minisign_anchor docs/security/release-minisign.pub)" >keys/expected-fingerprints.txt
commit_variant multi-subkey
sign_tag v1.3.0 "$work/gnupg-multi" "$(signing_subkey "$work/gnupg-multi" "$multi")"
expect reject "pin with more than one signing subkey" v1.3.0

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

if [ "$failures" -gt 0 ]; then
	echo "❌ release tooling test: $failures failure(s)" >&2
	exit 1
fi
echo "✅ release tooling test passed"
