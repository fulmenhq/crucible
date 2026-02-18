#!/bin/bash
# Format Rust code using rustfmt
if command -v rustfmt &>/dev/null; then
	rustfmt "$1"
else
	echo "Warning: rustfmt not found, skipping formatting"
fi
