#!/usr/bin/env bash
# The independent primary constrains the candidate pin; it never replaces it.
set -euo pipefail
die() {
	echo "error: $*" >&2
	exit 1
}
[[ $# == 2 ]] || die 'usage: release-verify-anchors.sh COMMIT EMPTY_OUTPUT_DIRECTORY'
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
require_approved_primary
resolve_release_decernor
commit="$(git rev-parse --verify "$1^{commit}")"
out="$2"
[[ -d "$out" && ! -L "$out" && -z "$(ls -A "$out")" ]] || die 'existing empty output directory required'
committed() {
	[[ "$(git ls-tree "$commit" -- "$1" | awk '{print $1}')" == 100644 ]] || die "committed regular file required: $1"
	git cat-file blob "$commit:$1" >"$out/$2"
	[[ -s "$out/$2" ]] || die "empty committed file: $1"
}
committed keys/expected-fingerprints.txt anchors.txt
committed keys/expected-fingerprints.ndjson anchors.ndjson
committed docs/security/release-signing-keys.asc pin.asc
committed docs/security/release-minisign.pub minisign.pub
"$RELEASE_DECERNOR_BIN" fingerprint verify --anchors "$out/anchors.txt" \
	--anchors-ndjson "$out/anchors.ndjson" --gpg "$out/pin.asc" --minisign "$out/minisign.pub" >"$out/verification.ndjson"
[[ "$(awk '$1=="gpg" {print $2}' "$out/anchors.txt")" == "$FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT" ]] ||
	die 'pin in candidate commit is not the independently approved primary'
echo "[ok] committed pins match decernor anchors and approved primary in $commit" >&2
