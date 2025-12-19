#!/usr/bin/env bash
# Go postprocessing for fulpack types
# Formats generated Go code with gofmt and goimports

set -euo pipefail

OUTPUT_FILE="${1:-}"

if [[ -z "$OUTPUT_FILE" ]]; then
	echo "Usage: $0 <output-file>" >&2
	exit 1
fi

echo "Formatting with gofmt (version: $(go version))"

# Format the file
if command -v gofmt &>/dev/null; then
	gofmt -w "$OUTPUT_FILE"
else
	echo "Warning: gofmt not found, skipping format" >&2
	exit 1
fi

# Organize imports
if command -v goimports &>/dev/null; then
	goimports -w "$OUTPUT_FILE"
else
	echo "Warning: goimports not found, skipping import organization" >&2
fi

echo "✓ Formatted: $OUTPUT_FILE"
