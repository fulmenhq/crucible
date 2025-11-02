#!/usr/bin/env bash
# Format generated Python code

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

echo "Formatting Python code: $OUTPUT_FILE"

if command -v ruff &> /dev/null; then
  ruff format "$OUTPUT_FILE"
else
  echo "Warning: ruff not found, skipping format" >&2
fi

echo "✓ Python formatting complete"
