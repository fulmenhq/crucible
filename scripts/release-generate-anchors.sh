#!/usr/bin/env bash
# Generate twice from committed PUBLIC pins into a new empty directory. Never
# overwrite an anchor. Review/compare the outputs before adding them to git.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
require_approved_primary
resolve_release_decernor
[[ $# == 2 && -d "$2" && ! -L "$2" && -z "$(ls -A "$2")" ]] || {
	echo 'error: COMMIT EMPTY_OUTPUT_DIRECTORY required' >&2
	exit 1
}
commit="$(git rev-parse --verify "$1^{commit}")"
out="$2"
for path in docs/security/release-signing-keys.asc docs/security/release-minisign.pub; do
	[[ "$(git ls-tree "$commit" -- "$path" | awk '{print $1}')" == 100644 ]] || exit 1
	git cat-file blob "$commit:$path" >"$out/$(basename "$path")"
done
for round in first second; do
	"$RELEASE_DECERNOR_BIN" fingerprint --class public --gpg-role primary --path-mode none \
		"$out/release-signing-keys.asc" "$out/release-minisign.pub" |
		jq -sc 'map(select(.fingerprint_scheme == "openpgp-fingerprint-v1" or .fingerprint_scheme == "minisign-public-blob-sha256-v1")) | sort_by(.kind) | .[]' >"$out/$round.ndjson"
	jq -r '"\(.kind) \(.fingerprint)"' "$out/$round.ndjson" >"$out/$round.txt"
done
cmp "$out/first.ndjson" "$out/second.ndjson"
cmp "$out/first.txt" "$out/second.txt"
[[ "$(awk '$1=="gpg" {print $2}' "$out/first.txt")" == "$FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT" ]] || {
	echo 'error: generated primary is not approved' >&2
	exit 1
}
"$RELEASE_DECERNOR_BIN" fingerprint verify --anchors "$out/first.txt" --anchors-ndjson "$out/first.ndjson" \
	--gpg "$out/release-signing-keys.asc" --minisign "$out/release-minisign.pub"
mv "$out/first.txt" "$out/expected-fingerprints.txt"
mv "$out/first.ndjson" "$out/expected-fingerprints.ndjson"
