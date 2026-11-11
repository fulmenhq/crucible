#!/usr/bin/env bash
# Key selection uses the same approved-primary gate as standalone verification.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
require_approved_primary
resolve_release_decernor
work="$(mktemp -d)"
trap 'gpgconf --homedir "$work/home" --kill all >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
mkdir -m 700 "$work/home" "$work/pins"
"$script_dir/release-verify-anchors.sh" "${1:-HEAD}" "$work/pins"
gpg --homedir "$work/home" --batch --quiet --import "$work/pins/pin.asc" 2>/dev/null
listing="$(gpg --homedir "$work/home" --batch --with-colons --with-subkey-fingerprint --list-keys)"
signing="$(awk -F: '$1=="sub" {s=1; cap=$12; valid=$2; next} s && $1=="fpr" {if (cap ~ /s/ && valid !~ /^[redi]$/) print $10; s=0}' <<<"$listing")"
[[ "$signing" =~ ^[0-9A-F]{40}$ ]] || {
	echo 'error: exactly one valid pinned signing subkey required' >&2
	exit 1
}
printf '%s\n' "$signing"
