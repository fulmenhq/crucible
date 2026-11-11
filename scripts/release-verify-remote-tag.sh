#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"

# Authenticate the existing local object before checking GitHub's exact object,
# commit, tag name and verified status. Never fetches or executes candidate code.
#
# Environment variables (plus shared trust inputs in release-env.sh):
#   FULMENHQ_CRUCIBLE_RELEASE_TAG  - Required explicit canonical tag
#   FULMENHQ_CRUCIBLE_GITHUB_REPO  - Override repo (default: auto-detect from origin)
#
repo_root() {
	git rev-parse --show-toplevel
}

detect_repo() {
	if [ -n "${FULMENHQ_CRUCIBLE_GITHUB_REPO:-}" ]; then
		printf '%s' "$FULMENHQ_CRUCIBLE_GITHUB_REPO"
		return 0
	fi

	local origin
	origin="$(git config --get remote.origin.url 2>/dev/null || true)"
	if [ -z "$origin" ]; then
		return 1
	fi

	# Supports:
	# - git@github.com:owner/repo.git
	# - git@<ssh-host-alias>:owner/repo.git (e.g. ~/.ssh/config Host aliases)
	# - ssh://git@github.com/owner/repo.git
	# - https://github.com/owner/repo.git
	local path="${origin%.git}"
	case "$path" in
	https://* | http://* | ssh://*)
		path="${path#*://}"
		path="${path#*/}"
		;;
	*:*)
		path="${path#*:}"
		;;
	esac

	if [[ "$path" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
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

	refuse_legacy_release_env
	local tag local_object target
	tag="$(require_release_tag)"
	local_object=$(git rev-parse --verify "refs/tags/$tag")
	"$script_dir/verify-pinned-tag.sh" "$tag" "$local_object"
	target=$(git rev-parse "$local_object^{commit}")
	[[ "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
		echo 'error: canonical release tag required' >&2
		exit 1
	}

	local repo
	if ! repo="$(detect_repo)"; then
		echo "error: could not detect GitHub repo (set FULMENHQ_CRUCIBLE_GITHUB_REPO=owner/repo)" >&2
		exit 1
	fi

	echo "→ GitHub remote verification: ${repo} tag ${tag}"

	local tag_sha
	tag_sha="$(gh api "repos/${repo}/git/ref/tags/${tag}" --jq .object.sha)"
	[[ "$(git cat-file -t "$local_object")" == tag && "$tag_sha" == "$local_object" ]] || {
		echo 'error: remote tag object differs from local annotated tag' >&2
		exit 1
	}

	local binding
	binding=$(gh api "repos/${repo}/git/tags/${tag_sha}" --jq '[.sha,.tag,.object.type,.object.sha,.verification.verified,.verification.reason] | @tsv')
	if [[ "$binding" != "$(printf '%s\t%s\tcommit\t%s\ttrue\tvalid' "$local_object" "$tag" "$target")" ]]; then
		echo "error: GitHub does not report ${tag} verified" >&2
		exit 1
	fi
	[[ "$(git rev-parse "refs/tags/$tag")" == "$local_object" ]] || {
		echo 'error: local tag changed during remote verification' >&2
		exit 1
	}
	echo "✅ GitHub reports ${tag} verified"
}

main "$@"
