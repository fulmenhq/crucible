#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/goneat" <<'EOF'
#!/usr/bin/env bash
if [[ "${TEST_VERSION_STREAM:-stdout}" == stderr ]]; then exec 1>&2; fi
printf '%s\n' "$TEST_VERSION_LINE" 'Module: v0.6.4'
exit "${TEST_VERSION_EXIT:-0}"
EOF
chmod +x "$TMP/goneat"
export TEST_VERSION_LINE='goneat v0.6.4'
"$ROOT/scripts/tool-version-matches.sh" "$TMP/goneat" 'goneat v0.6.4' version
for TEST_VERSION_LINE in 'goneat v0.6.40' 'goneat v0.6.4-rc1' 'goneat v0.6.4-extra' 'not-goneat v0.6.4' ''; do
  export TEST_VERSION_LINE
  if "$ROOT/scripts/tool-version-matches.sh" "$TMP/goneat" 'goneat v0.6.4' version; then
    echo "unexpected version acceptance: $TEST_VERSION_LINE" >&2
    exit 1
  fi
done
export TEST_VERSION_LINE='goneat v0.6.4' TEST_VERSION_EXIT=1
if "$ROOT/scripts/tool-version-matches.sh" "$TMP/goneat" 'goneat v0.6.4' version; then
  echo 'failed version command was accepted' >&2
  exit 1
fi
if "$ROOT/scripts/tool-version-matches.sh" "$TMP/missing" 'goneat v0.6.4' version; then
  echo 'missing binary was accepted' >&2
  exit 1
fi
export TEST_VERSION_LINE='sfetch 0.4.12' TEST_VERSION_EXIT=0 TEST_VERSION_STREAM=stderr
"$ROOT/scripts/tool-version-matches.sh" "$TMP/goneat" 'sfetch 0.4.12' --version
export TEST_VERSION_EXIT=23
if "$ROOT/scripts/tool-version-matches.sh" "$TMP/goneat" 'sfetch 0.4.12' --version; then
  echo 'failed sfetch version command was accepted' >&2
  exit 1
fi
echo 'Exact tool version checks passed'
