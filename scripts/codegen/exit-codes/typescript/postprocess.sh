#!/usr/bin/env bash
# Format generated TypeScript code

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

echo "Formatting TypeScript code: $OUTPUT_FILE"

# Use biome via bunx (Crucible default)
if command -v bunx &> /dev/null; then
  bunx biome format --write "$OUTPUT_FILE"
elif command -v biome &> /dev/null; then
  biome format --write "$OUTPUT_FILE"
else
  echo "Warning: biome/bunx not found, skipping format" >&2
fi

echo "✓ TypeScript formatting complete"
