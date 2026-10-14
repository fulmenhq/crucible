#!/usr/bin/env bash
set -euo pipefail

# Release tag creation script for fulmenhq/crucible
#
# Environment variables (FULMENHQ_CRUCIBLE_* preferred, CRUCIBLE_* legacy):
#   FULMENHQ_CRUCIBLE_RELEASE_TAG   - Override tag (default: v<VERSION>)
#   FULMENHQ_CRUCIBLE_GPG_HOMEDIR   - Dedicated signing keyring directory
#   FULMENHQ_CRUCIBLE_PGP_KEY_ID    - GPG key id/email/fingerprint for signing
#   FULMENHQ_CRUCIBLE_MINISIGN_KEY  - Minisign secret key path (optional sidecar)
#   FULMENHQ_CRUCIBLE_MINISIGN_PUB  - Minisign public key path (default: docs/security/release-minisign.pub)
#   FULMENHQ_CRUCIBLE_TAGGER_NAME   - Tagger name; must match config/release/tagger-identity.txt
#   FULMENHQ_CRUCIBLE_TAGGER_EMAIL  - Tagger email; must match config/release/tagger-identity.txt
#   FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN - Set to 1 to allow tagging from non-main branch
#
# Legacy aliases (will be removed in future release):
#   CRUCIBLE_RELEASE_TAG, CRUCIBLE_GPG_HOMEDIR, CRUCIBLE_PGP_KEY_ID,
#   CRUCIBLE_MINISIGN_KEY, CRUCIBLE_MINISIGN_PUB, CRUCIBLE_ALLOW_NON_MAIN
#
# The tagger identity is read from config/release/tagger-identity.txt so it
# matches a UID on the pinned estate signing key (required for GitHub to show
# the tag Verified). After signing, scripts/verify-pinned-tag.sh must accept the
# tag; otherwise the local tag is deleted.

TAGGER_IDENTITY_FILE="config/release/tagger-identity.txt"
MINISIGN_PUB_PIN="docs/security/release-minisign.pub"

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

normalize_tag() {
	local raw="${1:-}"
	if [ -z "$raw" ]; then
		printf '%s' ""
		return 0
	fi
	if [[ "$raw" == v* ]]; then
		printf '%s' "$raw"
	else
		printf 'v%s' "$raw"
	fi
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
	if ! gpg --list-secret-keys --with-colons ${key_id:+"${key_id}"} 2>/dev/null | grep -q '^sec'; then
		echo "error: no usable GPG secret key found${key_id:+ for key id: ${key_id}}" >&2
		echo "hint: set FULMENHQ_CRUCIBLE_GPG_HOMEDIR to your signing keyring directory" >&2
		echo "hint: run: gpg --list-secret-keys --keyid-format=long" >&2
		exit 1
	fi
}

# Sets TAGGER_NAME and TAGGER_EMAIL from the committed identity file.
read_tagger_identity() {
	if [ ! -s "${TAGGER_IDENTITY_FILE}" ]; then
		echo "error: ${TAGGER_IDENTITY_FILE} not found or empty" >&2
		exit 1
	fi
	local identity
	identity="$(head -1 "${TAGGER_IDENTITY_FILE}")"
	if ! [[ "${identity}" =~ ^(.+)\ \<([^<>]+)\>$ ]]; then
		echo "error: ${TAGGER_IDENTITY_FILE} must hold 'Name <email>'" >&2
		exit 1
	fi
	TAGGER_NAME="${BASH_REMATCH[1]}"
	TAGGER_EMAIL="${BASH_REMATCH[2]}"

	local env_name="${FULMENHQ_CRUCIBLE_TAGGER_NAME:-${CRUCIBLE_TAGGER_NAME:-}}"
	local env_email="${FULMENHQ_CRUCIBLE_TAGGER_EMAIL:-${CRUCIBLE_TAGGER_EMAIL:-}}"
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

	local version
	version="$(read_version)"

	# Tag: FULMENHQ_CRUCIBLE_RELEASE_TAG > CRUCIBLE_RELEASE_TAG (legacy) > v<VERSION>
	local tag
	tag="$(normalize_tag "${FULMENHQ_CRUCIBLE_RELEASE_TAG:-${CRUCIBLE_RELEASE_TAG:-v${version}}}")"

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

	local branch
	branch="$(git branch --show-current 2>/dev/null || true)"
	# Allow non-main: FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN > CRUCIBLE_ALLOW_NON_MAIN (legacy)
	if [ "$branch" != "main" ] && [ "${FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN:-${CRUCIBLE_ALLOW_NON_MAIN:-}}" != "1" ]; then
		echo "error: refusing to tag from branch '$branch' (set FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1 to override)" >&2
		exit 1
	fi

	if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
		echo "error: tag $tag already exists" >&2
		exit 1
	fi

	# GPG homedir: FULMENHQ_CRUCIBLE_GPG_HOMEDIR > CRUCIBLE_GPG_HOMEDIR (legacy)
	local gpg_homedir="${FULMENHQ_CRUCIBLE_GPG_HOMEDIR:-${CRUCIBLE_GPG_HOMEDIR:-}}"

	if [ -n "${gpg_homedir}" ]; then
		if [ ! -d "${gpg_homedir}" ]; then
			echo "error: FULMENHQ_CRUCIBLE_GPG_HOMEDIR=${gpg_homedir} is not a directory" >&2
			exit 1
		fi
		export GNUPGHOME="${gpg_homedir}"
	fi

	# PGP key ID: FULMENHQ_CRUCIBLE_PGP_KEY_ID > CRUCIBLE_PGP_KEY_ID (legacy)
	local pgp_key_id="${FULMENHQ_CRUCIBLE_PGP_KEY_ID:-${CRUCIBLE_PGP_KEY_ID:-}}"
	if [ -n "${pgp_key_id}" ] && [ -z "${gpg_homedir}" ]; then
		echo "error: FULMENHQ_CRUCIBLE_PGP_KEY_ID is set but FULMENHQ_CRUCIBLE_GPG_HOMEDIR is not; set a dedicated signing homedir" >&2
		exit 1
	fi

	read_tagger_identity

	setup_gpg_tty
	ensure_gpg_signing_ready "${pgp_key_id}"

	echo "→ Creating signed tag: $tag (tagger: ${TAGGER_NAME} <${TAGGER_EMAIL}>)"

	# The tag object takes its tagger from the committer identity.
	export GIT_COMMITTER_NAME="${TAGGER_NAME}"
	export GIT_COMMITTER_EMAIL="${TAGGER_EMAIL}"

	if [ -n "${pgp_key_id}" ]; then
		git tag -s -a "$tag" -u "${pgp_key_id}" -m "Release $tag"
	else
		git tag -s -a "$tag" -m "Release $tag"
	fi

	echo "→ Verifying tag signature against the pinned estate key: $tag"
	if ! git verify-tag "$tag" >/dev/null || ! ./scripts/verify-pinned-tag.sh "$tag"; then
		git tag -d "$tag" >/dev/null
		echo "error: $tag is not signed by the pinned release key; local tag deleted" >&2
		exit 1
	fi

	echo "✅ Created and verified signed tag: $tag"

	# Minisign: FULMENHQ_CRUCIBLE_MINISIGN_* > CRUCIBLE_MINISIGN_* (legacy)
	local minisign_key="${FULMENHQ_CRUCIBLE_MINISIGN_KEY:-${CRUCIBLE_MINISIGN_KEY:-}}"
	local minisign_pub="${FULMENHQ_CRUCIBLE_MINISIGN_PUB:-${CRUCIBLE_MINISIGN_PUB:-${MINISIGN_PUB_PIN}}}"

	if [ -n "${minisign_key}" ]; then
		if ! command -v minisign >/dev/null 2>&1; then
			echo "error: minisign requested but not found in PATH" >&2
			exit 1
		fi

		local out_dir="dist/release"
		mkdir -p "${out_dir}"
		local payload="${out_dir}/${tag}.tag.txt"

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
		# The attestation must also verify under the committed org minisign pin.
		if ! minisign -Vm "${payload}" -p "${MINISIGN_PUB_PIN}" >/dev/null; then
			echo "error: minisign attestation does not verify under ${MINISIGN_PUB_PIN}" >&2
			exit 1
		fi
		echo "✅ Minisign signature verified: ${payload}.minisig"
	fi

	echo "Next:"
	echo "  make release-push-tag"
	if [ -f "dist/release/${tag}.tag.txt.minisig" ]; then
		echo "  # Optional: publish dist/release/${tag}.tag.txt* as release assets"
	fi
}

main "$@"
