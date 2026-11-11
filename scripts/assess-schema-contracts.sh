#!/usr/bin/env bash
# Assess the isolated tooling module from its own module root, without fixes.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
categories="${1:-format,lint,security}"
case "$categories" in
format,lint | format,lint,security) ;;
*)
	echo 'error: unsupported module assessment categories' >&2
	exit 1
	;;
esac
candidate="${GONEAT_BIN:-$root/bin/goneat}"
binary="$(command -v "$candidate")"
[[ "$binary" == /* ]] || binary="$(cd "$(dirname "$binary")" && pwd -P)/$(basename "$binary")"
cd "$root/scripts/schema-contracts"
GOWORK=off "$binary" assess --categories "$categories" --mode check --fail-on high
