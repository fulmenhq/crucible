#!/usr/bin/env bash
# Compare an explicit canonical release tag with the checkout's VERSION.
# This checks version consistency only; it does not authorize a release.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
tag="$(require_release_tag)"
cd "$script_dir/.."
[[ -f VERSION ]] || {
	echo 'error: VERSION file not found' >&2
	exit 1
}
version="$(tr -d ' \t\r\n' <VERSION)"
[[ "$tag" == "v$version" ]] || {
	echo "error: release tag/version mismatch ($tag, expected v$version)" >&2
	exit 1
}
echo "[ok] explicit release tag matches VERSION ($tag)"
