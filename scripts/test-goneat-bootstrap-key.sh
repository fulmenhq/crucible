#!/usr/bin/env bash
set -euo pipefail

# Exercise the production Make recipe with a local installer double and real
# minisign signatures. No release assets are downloaded or installed.
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
command -v minisign >/dev/null
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/scripts" "$work/docs/security" "$work/bin"
cp "$ROOT/Makefile" "$work/Makefile"
cp "$ROOT/scripts/tool-version-matches.sh" "$work/scripts/"
minisign -G -W -s "$work/trusted.key" -p "$work/docs/security/fulmenhq-goneat-minisign.pub" >/dev/null
minisign -G -W -s "$work/foreign.key" -p "$work/foreign.pub" >/dev/null
printf 'controlled release checksums\n' >"$work/checksums"
cat >"$work/bin/sfetch" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == --version ]]; then echo 'sfetch 0.4.12' >&2; exit 0; fi
key=''
dest=''
required=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --minisign-key) key=$2; shift 2 ;;
    --dest-dir) dest=$2; shift 2 ;;
    --require-minisign) required=1; shift ;;
    *) shift ;;
  esac
done
[[ "$required" == 1 && "$key" == "$PWD/docs/security/fulmenhq-goneat-minisign.pub" ]]
minisign -Vm "$PWD/checksums" -p "$key" >/dev/null
printf '#!/usr/bin/env bash\necho "goneat v0.6.4"\n' > "$dest/goneat"
chmod +x "$dest/goneat"
EOF
chmod +x "$work/bin/sfetch"
minisign -Sm "$work/checksums" -s "$work/foreign.key" >/dev/null
if make --no-print-directory -C "$work" bootstrap-goneat >"$work/result" 2>&1; then
	echo 'foreign release signature accepted' >&2
	exit 1
fi
[[ ! -e "$work/bin/goneat" ]]
minisign -Sm "$work/checksums" -s "$work/trusted.key" >/dev/null
if ! make --no-print-directory -C "$work" bootstrap-goneat >"$work/result" 2>&1; then
	cat "$work/result" >&2
	exit 1
fi
[[ -x "$work/bin/goneat" ]]
echo '[ok] bootstrap supplies pinned key: foreign signature rejected, trusted signature accepted'
