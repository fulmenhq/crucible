#!/usr/bin/env bash
# Format generated Python code with ruff
set -e

OUTPUT_FILE="$1"

if [ -z "$OUTPUT_FILE" ]; then
  echo "Usage: $0 <output_file>"
  exit 1
fi

# Resolve paths relative to repo root
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
CONFIG_PATH="$REPO_ROOT/lang/python/ruff.toml"

# Check if uv is available
if ! command -v uv &> /dev/null; then
  echo "Warning: uv not found, skipping formatting"
  exit 0
fi

# Format code (fixes quotes, indentation)
cd "$REPO_ROOT/lang/python" && uv run ruff format --config "$CONFIG_PATH" "$OUTPUT_FILE"

# Fix linting issues (import sorting, etc.)
cd "$REPO_ROOT/lang/python" && uv run ruff check --fix --config "$CONFIG_PATH" "$OUTPUT_FILE" 2>/dev/null || true

echo "✓ Formatted: $OUTPUT_FILE"
