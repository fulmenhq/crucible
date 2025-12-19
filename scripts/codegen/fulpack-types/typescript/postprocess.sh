#!/usr/bin/env bash
# TypeScript postprocessing for fulpack types
# Formats generated TypeScript code with biome

set -euo pipefail

OUTPUT_FILE="${1:-}"

if [[ -z "$OUTPUT_FILE" ]]; then
	echo "Usage: $0 <output-file>" >&2
	exit 1
fi

echo "Formatting with biome (version: $(bunx biome --version))"

# Format the file
if command -v bunx &>/dev/null; then
	bunx biome format --write "$OUTPUT_FILE"
	bunx biome check --write "$OUTPUT_FILE" || true # Don't fail on lint errors
else
	echo "Warning: bunx not found, skipping format" >&2
	exit 1
fi

echo "✓ Formatted: $OUTPUT_FILE"
