#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
tag="$(require_release_tag)"
[[ $# -le 1 ]] || { echo 'error: at most one expected tag object argument' >&2; exit 1; }
if [[ $# == 1 ]]; then
	"$script_dir/verify-tag-attestation.sh" "$tag" "$1"
else
	"$script_dir/verify-tag-attestation.sh" "$tag"
fi
