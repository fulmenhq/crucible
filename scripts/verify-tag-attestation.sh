#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
[[ $# == 1 || $# == 2 ]] || {
	echo 'error: explicit release tag required' >&2
	exit 1
}
require_explicit_tag "$1"
cd "$(git rev-parse --show-toplevel)"
tag="${1:?release tag required}"
[[ "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
	echo 'error: canonical release tag required' >&2
	exit 1
}
object="${2:-$(git rev-parse --verify "refs/tags/$tag")}"
[[ "$object" =~ ^[0-9a-f]{40}$ ]] || {
	echo 'error: invalid expected annotated tag object' >&2
	exit 1
}
"$script_dir/verify-pinned-tag.sh" "$tag" "$object"
payload="dist/release/${tag}.tag.txt"
sig="$payload.minisig"
[[ "${FULMENHQ_CRUCIBLE_REQUIRE_MINISIGN:-1}" == 1 ]] || {
	echo 'error: required minisign attestation cannot be disabled' >&2
	exit 1
}
if [[ ! -e "$payload" && ! -L "$payload" && ! -e "$sig" && ! -L "$sig" ]]; then
	echo 'error: required minisign attestation is absent' >&2
	exit 1
fi
[[ -f "$payload" && ! -L "$payload" && -f "$sig" && ! -L "$sig" ]] || {
	echo 'error: incomplete or non-regular attestation pair' >&2
	exit 1
}
command -v minisign >/dev/null 2>&1 || {
	echo 'error: minisign required to verify attestation' >&2
	exit 1
}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
target=$(git rev-parse "$object^{commit}")
git cat-file blob "$target:docs/security/release-minisign.pub" >"$work/pin.pub"
cp "$payload" "$work/payload"
cp "$sig" "$work/signature"
printf 'tag: %s\ntag_object: %s\ntag_target: %s\n' "$tag" "$object" "$target" >"$work/expected"
cmp -s "$work/expected" "$work/payload" || {
	echo 'error: attestation payload does not match release tag objects' >&2
	exit 1
}
minisign -Vm "$work/payload" -x "$work/signature" -p "$work/pin.pub" >/dev/null
[[ "$(git rev-parse "refs/tags/$tag")" == "$object" ]] || {
	echo 'error: local tag changed during verification' >&2
	exit 1
}
echo "[ok] minisign attestation bound to $tag ($object)"
