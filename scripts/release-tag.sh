#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"

# Release tag creation script for fulmenhq/crucible
#
# Environment variables (see release-env.sh for shared explicit trust inputs):
#   FULMENHQ_CRUCIBLE_RELEASE_TAG   - Required canonical tag, matching VERSION
#   FULMENHQ_CRUCIBLE_GPG_HOMEDIR   - Dedicated signing keyring directory
#   FULMENHQ_CRUCIBLE_PGP_KEY_ID    - Optional exact pinned subkey fingerprint + !
#   FULMENHQ_CRUCIBLE_MINISIGN_KEY  - Required minisign secret key path
#   FULMENHQ_CRUCIBLE_TAGGER_NAME   - Tagger name; must match config/release/tagger-identity.txt
#   FULMENHQ_CRUCIBLE_TAGGER_EMAIL  - Tagger email; must match config/release/tagger-identity.txt
#   FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN - Set to 1 to allow tagging from non-main branch
#
# The tagger identity is read from config/release/tagger-identity.txt so it
# matches a UID on the pinned estate signing key (required for GitHub to show
# the tag Verified). After signing, scripts/verify-pinned-tag.sh must accept the
# tag; otherwise the local tag is deleted.

TAGGER_IDENTITY_FILE="config/release/tagger-identity.txt"
created_tag_ref=""
created_tag_object=""
created_payload=""
trust_work=""

rollback_release_tag() {
	local status=$?
	if [ "$status" -ne 0 ] && [ -n "$created_tag_object" ]; then
		# Compare-and-delete: never remove a ref another process replaced.
		git update-ref -d "$created_tag_ref" "$created_tag_object" || echo "error: tag rollback failed; inspect $created_tag_ref" >&2
		if [ -n "$created_payload" ]; then
			rm -f -- "$created_payload" "$created_payload.minisig"
		fi
	fi
	if [[ -n "$trust_work" ]]; then rm -rf "$trust_work"; fi
	return "$status"
}

repo_root() {
	git rev-parse --show-toplevel
}

read_version() {
	if [ ! -f VERSION ]; then
		echo "error: VERSION file not found" >&2
		exit 1
	fi
	tr -d ' \t\r\n' <VERSION
}

setup_gpg_tty() {
	if [ ! -t 0 ] || [ ! -t 1 ]; then
		echo "error: no TTY available for interactive gpg signing" >&2
		echo "hint: run make release-tag in an interactive terminal" >&2
		echo "hint: export GPG_TTY=\"\$(tty)\" && gpg-connect-agent updatestartuptty /bye" >&2
		exit 1
	fi

	if command -v tty >/dev/null 2>&1; then
		local tty_path
		tty_path="$(tty 2>/dev/null || true)"
		if [ -n "${tty_path}" ] && [ "${tty_path}" != "not a tty" ]; then
			export GPG_TTY="${tty_path}"
			gpg-connect-agent updatestartuptty /bye >/dev/null 2>&1 || true
		fi
	fi
}

ensure_gpg_signing_ready() {
	local key_id="${1:-}"
	if ! command -v gpg >/dev/null 2>&1; then
		echo "error: gpg not found in PATH (required for signed tags)" >&2
		exit 1
	fi
	PINNED_SIGNING_SUBKEY=$("$script_dir/pinned-signing-subkey.sh")
	if [[ -n "$key_id" && "$key_id" != "${PINNED_SIGNING_SUBKEY}!" ]]; then
		echo 'error: PGP_KEY_ID must equal the exact pinned signing subkey fingerprint followed by !' >&2
		exit 1
	fi
	local listing
	listing=$(gpg --batch --with-colons --with-subkey-fingerprint --list-secret-keys -- "${key_id:-$PINNED_SIGNING_SUBKEY}" 2>/dev/null) || listing=""
	if ! awk -F: -v pin="$PINNED_SIGNING_SUBKEY" -v now="$(date +%s)" '
		$1=="ssb" {eligible=($2 !~ /^[red]$/ && $12 ~ /s/ && $15 != "#" && ($7=="" || $7==0 || $7>now)); next}
		$1=="fpr" {if (eligible && $10==pin) found=1; eligible=0}
		END {exit !found}
	' <<<"$listing"; then
		echo "error: pinned signing subkey is not available${key_id:+ for key id: ${key_id}}" >&2
		echo "hint: set FULMENHQ_CRUCIBLE_GPG_HOMEDIR to your signing keyring directory" >&2
		echo "hint: run: gpg --list-secret-keys --keyid-format=long" >&2
		exit 1
	fi
}

# Sets TAGGER_NAME and TAGGER_EMAIL from the committed identity file.
read_tagger_identity() {
	if [[ "$(git ls-tree HEAD -- "$TAGGER_IDENTITY_FILE" | awk '{print $1}')" != 100644 ]]; then
		echo "error: ${TAGGER_IDENTITY_FILE} not found or empty" >&2
		exit 1
	fi
	local identity
	identity="$(git cat-file blob "HEAD:$TAGGER_IDENTITY_FILE")"
	if ! [[ "${identity}" =~ ^(.+)\ \<([^<>]+)\>$ ]]; then
		echo "error: ${TAGGER_IDENTITY_FILE} must hold 'Name <email>'" >&2
		exit 1
	fi
	TAGGER_NAME="${BASH_REMATCH[1]}"
	TAGGER_EMAIL="${BASH_REMATCH[2]}"

	local env_name="${FULMENHQ_CRUCIBLE_TAGGER_NAME:-}"
	local env_email="${FULMENHQ_CRUCIBLE_TAGGER_EMAIL:-}"
	if { [ -n "${env_name}" ] && [ "${env_name}" != "${TAGGER_NAME}" ]; } ||
		{ [ -n "${env_email}" ] && [ "${env_email}" != "${TAGGER_EMAIL}" ]; }; then
		echo "error: FULMENHQ_CRUCIBLE_TAGGER_NAME/EMAIL differ from ${TAGGER_IDENTITY_FILE} (${identity})" >&2
		exit 1
	fi
}

main() {
	local root
	root="$(repo_root)"
	cd "$root"
	refuse_legacy_release_env
	require_approved_primary
	resolve_release_decernor

	local version
	version="$(read_version)"

	# Explicit input; VERSION is only a consistency constraint.
	local tag
	tag="$(require_release_tag)"

	if [ "$tag" != "v${version}" ]; then
		echo "error: release tag/version mismatch" >&2
		echo "  tag:     $tag" >&2
		echo "  VERSION: $version (expected tag: v$version)" >&2
		exit 1
	fi

	if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
		echo "error: invalid release tag '$tag' (expected vMAJOR.MINOR.PATCH)" >&2
		exit 1
	fi

	if [ -n "$(git status --porcelain)" ]; then
		echo "error: working tree is not clean (commit or stash changes before tagging)" >&2
		git status --porcelain >&2
		exit 1
	fi
	local creation_target
	creation_target="$(git rev-parse HEAD)"

	local branch
	branch="$(git branch --show-current 2>/dev/null || true)"
	if [ "$branch" != "main" ] && [ "${FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN:-}" != "1" ]; then
		echo "error: refusing to tag from branch '$branch' (set FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1 to override)" >&2
		exit 1
	fi

	if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
		echo "error: tag $tag already exists" >&2
		exit 1
	fi

	require_signing_keyring
	require_signing_program
	local pgp_key_id="${FULMENHQ_CRUCIBLE_PGP_KEY_ID:-}"
	trust_work="$(mktemp -d)"
	trap rollback_release_tag EXIT
	"$script_dir/release-verify-anchors.sh" "$creation_target" "$trust_work"

	read_tagger_identity

	ensure_gpg_signing_ready "${pgp_key_id}"
	setup_gpg_tty

	local minisign_key="${FULMENHQ_CRUCIBLE_MINISIGN_KEY:-}"
	local minisign_pub="$trust_work/minisign.pub"
	[[ -n "$minisign_key" ]] || {
		echo 'error: FULMENHQ_CRUCIBLE_MINISIGN_KEY is required for the release asset profile' >&2
		exit 1
	}
	if [ -n "$minisign_key" ]; then
		command -v minisign >/dev/null 2>&1 || {
			echo 'error: minisign requested but unavailable' >&2
			exit 1
		}
		[ -f "$minisign_key" ] && [ -f "$minisign_pub" ] || {
			echo 'error: minisign key files unavailable' >&2
			exit 1
		}
		for existing in "dist/release/${tag}.tag.txt" "dist/release/${tag}.tag.txt.minisig"; do
			[ ! -e "$existing" ] && [ ! -L "$existing" ] || {
				echo "error: refusing to overwrite $existing" >&2
				exit 1
			}
		done
	fi

	echo "→ Creating signed tag: $tag (tagger: ${TAGGER_NAME} <${TAGGER_EMAIL}>)"

	# The tag object takes its tagger from the committer identity.
	export GIT_COMMITTER_NAME="${TAGGER_NAME}"
	export GIT_COMMITTER_EMAIL="${TAGGER_EMAIL}"

	trap rollback_release_tag EXIT
	[[ "$(git rev-parse HEAD)" == "$creation_target" ]] || {
		echo 'error: HEAD changed during tag preflight' >&2
		exit 1
	}
	release_signing_git tag -s -a "$tag" "$creation_target" -u "${PINNED_SIGNING_SUBKEY}!" -m "Release $tag"
	created_tag_ref="refs/tags/$tag"
	created_tag_object=$(git rev-parse "$created_tag_ref")

	echo "→ Verifying tag signature against the pinned estate key: $tag"
	if ! "$script_dir/verify-pinned-tag.sh" "$tag" "$created_tag_object"; then
		echo "error: $tag is not signed by the pinned release key; rolling back local tag" >&2
		exit 1
	fi

	if [ -n "${minisign_key}" ]; then
		if ! command -v minisign >/dev/null 2>&1; then
			echo "error: minisign requested but not found in PATH" >&2
			exit 1
		fi

		local out_dir="dist/release"
		mkdir -p "${out_dir}"
		local payload="${out_dir}/${tag}.tag.txt"
		created_payload="$payload"

		local tag_object
		tag_object="$(git rev-parse "${tag}^{tag}")"
		local tag_target
		tag_target="$(git rev-parse "${tag}^{}")"

		cat >"${payload}" <<EOF
tag: ${tag}
tag_object: ${tag_object}
tag_target: ${tag_target}
EOF

		echo "→ Minisign tag attestation: ${payload}"
		minisign -Sm "${payload}" -s "${minisign_key}"
		minisign -Vm "${payload}" -p "${minisign_pub}" >/dev/null
		"$script_dir/verify-tag-attestation.sh" "$tag" "$created_tag_object"
		echo "✅ Minisign signature verified: ${payload}.minisig"
	fi

	rm -rf "$trust_work"
	trust_work=""
	trap - EXIT
	echo "✅ Created and verified signed tag: $tag"
	echo "Next:"
	echo "  make release-push-tag"
	if [ -f "dist/release/${tag}.tag.txt.minisig" ]; then
		echo "  # Stage and verify both required sidecars before explicit publication"
	fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
	main "$@"
fi
