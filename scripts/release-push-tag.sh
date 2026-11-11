#!/usr/bin/env bash
# release-push-tag.sh - Verify and push the signed version tag
#
# Safety checks:
# - Local tag exists and its signature verifies (release-verify-tag.sh)
# - Tagged commit is on origin/main
# - Remote tag does not already exist
# - Pushes only the tag ref, then confirms the remote tag object matches local
# - When gh is available, confirms GitHub reports the tag verified
#
# Requires the explicit tag, approved primary and checker from release-env.sh.

set -euo pipefail

die() {
	echo "error: $*" >&2
	exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
tag="$(require_release_tag)"
cd "$(git rev-parse --show-toplevel)"
[[ "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || die "canonical release tag required"

git rev-parse -q --verify "refs/tags/${tag}^{tag}" >/dev/null ||
	die "${tag} is not a local annotated tag (run 'make release-tag' first)"
local_object="$(git rev-parse "refs/tags/$tag")"
"$script_dir/release-verify-tag.sh" "$local_object"

git fetch --quiet origin main
tag_commit="$(git rev-parse "${local_object}^{commit}")"
git merge-base --is-ancestor "$tag_commit" origin/main ||
	die "${tag} points at ${tag_commit}, which is not on origin/main"

remote_refs=$(git ls-remote --tags origin "refs/tags/${tag}") || die "could not query remote tag; refusing publication"
[ -z "$remote_refs" ] ||
	die "remote tag ${tag} already exists"

echo "Pushing tag: ${tag}"
[[ "$(git rev-parse "refs/tags/$tag")" == "$local_object" ]] || die 'local tag changed before push'
git -c push.followTags=false push --no-follow-tags origin "${local_object}:refs/tags/${tag}"

remote_object="$(git ls-remote origin "refs/tags/${tag}" | awk '{print $1}')"
[ "$remote_object" = "$local_object" ] ||
	die "remote tag object (${remote_object:-missing}) differs from local (${local_object})"

if command -v gh >/dev/null 2>&1; then
	"$script_dir/release-verify-remote-tag.sh"
else
	echo "[--] gh not found; skipped GitHub verification check"
fi

echo "[ok] Pushed ${tag} (${local_object})"
