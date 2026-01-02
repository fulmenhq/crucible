#!/usr/bin/env bash
set -euo pipefail

# Verify tag signature via GitHub API for fulmenhq/crucible
#
# Environment variables (FULMENHQ_CRUCIBLE_* preferred, CRUCIBLE_* legacy):
#   FULMENHQ_CRUCIBLE_RELEASE_TAG  - Override tag (default: v<VERSION>)
#   FULMENHQ_CRUCIBLE_GITHUB_REPO  - Override repo (default: auto-detect from origin)
#
# Legacy aliases (will be removed in future release):
#   CRUCIBLE_RELEASE_TAG, CRUCIBLE_GITHUB_REPO

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

detect_repo() {
	# FULMENHQ_CRUCIBLE_GITHUB_REPO > CRUCIBLE_GITHUB_REPO (legacy) > auto-detect
	if [ -n "${FULMENHQ_CRUCIBLE_GITHUB_REPO:-${CRUCIBLE_GITHUB_REPO:-}}" ]; then
		printf '%s' "${FULMENHQ_CRUCIBLE_GITHUB_REPO:-${CRUCIBLE_GITHUB_REPO:-}}"
		return 0
	fi

	local origin
	origin="$(git config --get remote.origin.url 2>/dev/null || true)"
	if [ -z "$origin" ]; then
		return 1
	fi

	# Supports:
	# - git@github.com:owner/repo.git
	# - https://github.com/owner/repo.git
	local path="${origin}"
	path="${path#git@github.com:}"
	path="${path#https://github.com/}"
	path="${path#http://github.com/}"
	path="${path%.git}"

	if [[ "$path" == */* ]]; then
		printf '%s' "$path"
		return 0
	fi

	return 1
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

	# Tag: FULMENHQ_CRUCIBLE_RELEASE_TAG > CRUCIBLE_RELEASE_TAG (legacy) > v<VERSION>
	local tag
	tag="$(normalize_tag "${FULMENHQ_CRUCIBLE_RELEASE_TAG:-${CRUCIBLE_RELEASE_TAG:-v${version}}}")"

	local repo
	if ! repo="$(detect_repo)"; then
		echo "error: could not detect GitHub repo (set FULMENHQ_CRUCIBLE_GITHUB_REPO=owner/repo)" >&2
		exit 1
	fi

	echo "→ GitHub remote verification: ${repo} tag ${tag}"

	local tag_sha
	tag_sha="$(gh api "repos/${repo}/git/ref/tags/${tag}" --jq .object.sha)"

	gh api "repos/${repo}/git/tags/${tag_sha}" --jq .verification
}

main "$@"
