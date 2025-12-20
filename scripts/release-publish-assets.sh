#!/usr/bin/env bash
set -euo pipefail

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

	if ! command -v gh >/dev/null 2>&1; then
		echo "error: gh (GitHub CLI) not found" >&2
		exit 1
	fi

	local version
	version="$(read_version)"
	local tag
	tag="$(normalize_tag "${CRUCIBLE_RELEASE_TAG:-${FULMEN_CRUCIBLE_RELEASE_TAG:-${RELEASE_TAG:-v${version}}}}")"

	local out_dir="dist/release"
	local payload="${out_dir}/${tag}.tag.txt"
	local sig="${payload}.minisig"

	if [ ! -f "${payload}" ] || [ ! -f "${sig}" ]; then
		echo "error: minisign attestation not found; expected:" >&2
		echo "  - ${payload}" >&2
		echo "  - ${sig}" >&2
		echo "hint: run make release-tag with CRUCIBLE_MINISIGN_KEY + CRUCIBLE_MINISIGN_PUB set" >&2
		exit 1
	fi

	local notes_file="release-notes/${version}.md"
	if [ ! -f "${notes_file}" ]; then
		echo "error: release notes file not found at ${notes_file}" >&2
		exit 1
	fi

	if gh release view "${tag}" >/dev/null 2>&1; then
		echo "→ Updating existing GitHub Release: ${tag}"
		gh release upload "${tag}" "${payload}" "${sig}" --clobber
		echo "✅ Uploaded assets to existing release: ${tag}"
		return 0
	fi

	echo "→ Creating GitHub Release: ${tag}"
	gh release create "${tag}" --title "${tag}" --notes-file "${notes_file}" "${payload}" "${sig}"
	echo "✅ Created release and uploaded assets: ${tag}"
}

main "$@"
