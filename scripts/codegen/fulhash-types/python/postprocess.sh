#!/usr/bin/env bash
# Format generated Python code with ruff (via uvx)
set -e

OUTPUT_FILE="$1"

if [ -z "$OUTPUT_FILE" ]; then
  echo "Usage: $0 <output_file>"
  exit 1
fi

# Resolve paths relative to repo root
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
CONFIG_PATH="$REPO_ROOT/lang/python/ruff.toml"

# Check if uvx is available
if ! command -v uvx &> /dev/null; then
  echo "Warning: uvx not found, skipping formatting"
  exit 0
fi

# Log ruff version for tracking
echo "Formatting with ruff (version: $(uvx ruff --version 2>&1 | head -1))"

# Format code (fixes quotes, indentation, imports)
uvx ruff format --config "$CONFIG_PATH" "$OUTPUT_FILE"

# Fix linting issues (import sorting, etc.)
uvx ruff check --fix --config "$CONFIG_PATH" "$OUTPUT_FILE" 2>/dev/null || true

echo "✓ Formatted: $OUTPUT_FILE"
