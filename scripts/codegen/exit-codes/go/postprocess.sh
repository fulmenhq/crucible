#!/usr/bin/env bash
# Format generated Go code

set -euo pipefail

OUTPUT_FILE="${1:-}"

if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 <output-file>" >&2
  exit 1
fi

if [[ ! -f "$OUTPUT_FILE" ]]; then
  echo "Error: File not found: $OUTPUT_FILE" >&2
  exit 1
fi

echo "Formatting Go code: $OUTPUT_FILE"
gofmt -w "$OUTPUT_FILE"

if command -v goimports &> /dev/null; then
  goimports -w "$OUTPUT_FILE"
fi

echo "✓ Go formatting complete"
