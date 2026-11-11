#!/usr/bin/env bash
# Stage by default; publication requires the explicit publish subcommand.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd -P)"
exec python3 "$root/scripts/release-publication.py" "$@"
