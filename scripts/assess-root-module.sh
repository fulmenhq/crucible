#!/usr/bin/env bash
# Run a full-root, check-only assessment without staged package selection crossing
# into the separately assessed tooling module.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
case "${1:-}" in
  pre-commit) categories=format,lint; severity=critical ;;
  pre-push) categories=format,lint,security; severity=high ;;
  *) echo 'error: expected pre-commit or pre-push assessment' >&2; exit 1 ;;
esac
candidate="${GONEAT_BIN:-$root/bin/goneat}"
binary="$(command -v "$candidate")"
[[ "$binary" == /* ]] || binary="$(cd "$(dirname "$binary")" && pwd -P)/$(basename "$binary")"
cd "$root"
GOWORK=off "$binary" assess --categories "$categories" --mode check \
  --fail-on "$severity" --staged-only=false --package-mode=false \
  --exclude '.cache/**' --exclude '.gocache/**' --exclude '.plans/**' \
  --exclude 'dist/**' --exclude 'bin/**' --exclude 'scripts/schema-contracts/**'
