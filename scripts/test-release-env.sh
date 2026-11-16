#!/usr/bin/env bash
# Fixture-only input-contract checks; the positive checker is the real,
# independently installed designated release supplied by the test operator.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/release-env.sh
source "$script_dir/release-env.sh"
refuse_legacy_release_env
resolve_release_decernor
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
reject_checker() {
	local candidate="$1" diagnostic="$2"
	if (
		FULMENHQ_CRUCIBLE_DECERNOR_BIN="$candidate"
		resolve_release_decernor
	) >"$work/log" 2>&1; then
		echo 'error: invalid checker accepted' >&2
		exit 1
	fi
	grep -q "$diagnostic" "$work/log" || {
		cat "$work/log" >&2
		exit 1
	}
}
reject_checker '' 'absolute regular'
reject_checker relative/path 'absolute regular'
reject_checker "$work" 'absolute regular'
touch "$work/nonexecutable"
reject_checker "$work/nonexecutable" 'absolute regular'
ln -s "$RELEASE_DECERNOR_BIN" "$work/link"
reject_checker "$work/link" 'non-symlink'
cat >"$work/checker" <<'SH'
#!/usr/bin/env bash
if [[ "$*" == 'version' ]]; then
  printf '%s %s\n' "${TEST_IDENTITY:-decernor}" "$TEST_VERSION"
else
  printf 'Version: %s\nCommit: fixture\nBuild Date: fixture\nGo Version: fixture\nGofulmen: fixture\nCrucible: fixture\n' "$TEST_VERSION"
fi
SH
chmod +x "$work/checker"
export TEST_VERSION=0.1.7
reject_checker "$work/checker" 'decernor >= 0.1.8 required'
export TEST_VERSION=0.1.9-dev
reject_checker "$work/checker" 'not a release of decernor'
export TEST_VERSION=0.1.9 TEST_IDENTITY=other
reject_checker "$work/checker" 'not a release of decernor'
echo '[ok] explicit checker identity, version floor and path controls'

mkdir -p "$work/repo/scripts"
cp "$script_dir/release-guard-tag-version.sh" "$script_dir/release-env.sh" "$work/repo/scripts/"
printf '1.2.3\n' >"$work/repo/VERSION"
FULMENHQ_CRUCIBLE_RELEASE_TAG=v1.2.3 bash "$work/repo/scripts/release-guard-tag-version.sh"
for tag in '' 1.2.3 v1.2.4; do
	if FULMENHQ_CRUCIBLE_RELEASE_TAG="$tag" bash "$work/repo/scripts/release-guard-tag-version.sh" >"$work/log" 2>&1; then
		echo "error: invalid version guard input accepted: $tag" >&2
		exit 1
	fi
done
if FULMENHQ_CRUCIBLE_RELEASE_TAG=v1.2.3 CRUCIBLE_RELEASE_TAG=v1.2.3 bash "$work/repo/scripts/release-guard-tag-version.sh" >"$work/log" 2>&1; then
	echo 'error: legacy guard input accepted' >&2
	exit 1
fi
echo '[ok] version guard requires explicit canonical input and rejects mismatches'
