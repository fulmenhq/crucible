#!/usr/bin/env bash
set -euo pipefail

# Compare the complete version line; prefix matches can accept a different patch.
if [[ $# -ne 3 || ! -x "$1" ]]; then
	exit 1
fi
# Some tools (including sfetch) report version identity on stderr.
if ! output=$("$1" "$3" 2>&1); then
	exit 1
fi
first_line=${output%%$'\n'*}
[[ "$first_line" == "$2" ]]
