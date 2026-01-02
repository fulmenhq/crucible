#!/usr/bin/env bash
set -euo pipefail

# Release tag verification script for fulmenhq/crucible
#
# Environment variables (FULMENHQ_CRUCIBLE_* preferred, CRUCIBLE_* legacy):
#   FULMENHQ_CRUCIBLE_RELEASE_TAG  - Override tag (default: v<VERSION>)
#   FULMENHQ_CRUCIBLE_GPG_HOMEDIR  - Dedicated signing keyring directory
#   FULMENHQ_CRUCIBLE_MINISIGN_PUB - Minisign public key path (verifies sidecar)
#
# Legacy aliases (will be removed in future release):
#   CRUCIBLE_RELEASE_TAG, CRUCIBLE_GPG_HOMEDIR, CRUCIBLE_MINISIGN_PUB

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

main() {
	local root
	root="$(repo_root)"
	cd "$root"

	local version
	version="$(read_version)"

	# Tag: FULMENHQ_CRUCIBLE_RELEASE_TAG > CRUCIBLE_RELEASE_TAG (legacy) > v<VERSION>
	local tag
	tag="$(normalize_tag "${FULMENHQ_CRUCIBLE_RELEASE_TAG:-${CRUCIBLE_RELEASE_TAG:-v${version}}}")"

	# GPG homedir: FULMENHQ_CRUCIBLE_GPG_HOMEDIR > CRUCIBLE_GPG_HOMEDIR (legacy)
	local gpg_homedir="${FULMENHQ_CRUCIBLE_GPG_HOMEDIR:-${CRUCIBLE_GPG_HOMEDIR:-}}"

	if [ -n "${gpg_homedir}" ]; then
		if [ ! -d "${gpg_homedir}" ]; then
			echo "error: FULMENHQ_CRUCIBLE_GPG_HOMEDIR=${gpg_homedir} is not a directory" >&2
			exit 1
		fi
		export GNUPGHOME="${gpg_homedir}"
	fi

	echo "→ Verifying tag signature: $tag"
	git verify-tag "$tag" >/dev/null
	echo "✅ Tag verified: $tag"

	# Minisign pub: FULMENHQ_CRUCIBLE_MINISIGN_PUB > CRUCIBLE_MINISIGN_PUB (legacy)
	local minisign_pub="${FULMENHQ_CRUCIBLE_MINISIGN_PUB:-${CRUCIBLE_MINISIGN_PUB:-}}"
	if [ -n "${minisign_pub}" ]; then
		if ! command -v minisign >/dev/null 2>&1; then
			echo "error: FULMENHQ_CRUCIBLE_MINISIGN_PUB is set but minisign is not found in PATH" >&2
			exit 1
		fi

		local sig_dir="dist/release"
		local payload="${sig_dir}/${tag}.tag.txt"
		local sig="${payload}.minisig"
		if [ -f "${payload}" ] && [ -f "${sig}" ]; then
			minisign -Vm "${payload}" -p "${minisign_pub}" >/dev/null
			echo "✅ Minisign tag attestation verified: ${sig}"
		else
			echo "note: minisign pubkey set but no attestation found at ${sig}" >&2
		fi
	fi
}

main "$@"
