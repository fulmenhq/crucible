#!/usr/bin/env bash
# Explicit inputs, adapted from 3leaps/crucible PDR-0008 release-env.sh.
# Source only from a reviewed operator checkout.
# Local replacement refs must not reinterpret the source objects a tag signs.
export GIT_NO_REPLACE_OBJECTS=1

refuse_legacy_release_env() {
	local name
	for name in TAG RELEASE_TAG CRUCIBLE_RELEASE_TAG CRUCIBLE_REQUIRE_TAG FULMENHQ_CRUCIBLE_REQUIRE_TAG DECERNOR_BIN CRUCIBLE_DECERNOR_BIN \
		CRUCIBLE_GPG_HOMEDIR CRUCIBLE_PGP_KEY_ID CRUCIBLE_TAGGER_NAME CRUCIBLE_TAGGER_EMAIL \
		CRUCIBLE_MINISIGN_KEY CRUCIBLE_MINISIGN_PUB CRUCIBLE_ALLOW_NON_MAIN CRUCIBLE_GITHUB_REPO \
		FULMENHQ_CRUCIBLE_MINISIGN_PUB FULMENHQ_CRUCIBLE_GPG_PUBLIC_KEY \
		FULMENHQ_CRUCIBLE_PUBLIC_KEY FULMENHQ_CRUCIBLE_ANCHORS; do
		if [[ -n "${!name+set}" ]]; then
			echo "error: retired input or committed-pin override is forbidden: $name" >&2
			return 1
		fi
	done
}

require_release_tag() {
	local tag="${FULMENHQ_CRUCIBLE_RELEASE_TAG:-}"
	[[ "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
		echo 'error: canonical FULMENHQ_CRUCIBLE_RELEASE_TAG required; the tag is never derived' >&2
		return 1
	}
	printf '%s\n' "$tag"
}

# Low-level callers retain an explicit TAG argument. A set ceremony variable
# must agree; neither form derives a tag from repository data.
require_explicit_tag() {
	[[ $# == 1 && "$1" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || {
		echo 'error: explicit canonical release tag argument required' >&2
		return 1
	}
	if [[ -n "${FULMENHQ_CRUCIBLE_RELEASE_TAG+set}" ]]; then
		[[ "$(require_release_tag)" == "$1" ]] || {
			echo 'error: release tag argument differs from FULMENHQ_CRUCIBLE_RELEASE_TAG' >&2
			return 1
		}
	fi
}

require_approved_primary() {
	[[ "${FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT:-}" =~ ^[0-9A-F]{40}$ ]] || {
		echo 'error: independently approved primary FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT required (40 uppercase hex)' >&2
		return 1
	}
}

resolve_release_decernor() {
	local candidate="${FULMENHQ_CRUCIBLE_DECERNOR_BIN:-}" short extended version i
	[[ "$candidate" == /* && -f "$candidate" && ! -L "$candidate" && -x "$candidate" ]] || {
		echo 'error: FULMENHQ_CRUCIBLE_DECERNOR_BIN must be an absolute regular non-symlink executable' >&2
		return 1
	}
	short="$("$candidate" version)" || return 1
	[[ "$short" =~ ^decernor\ ((0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*))$ ]] || {
		echo 'error: designated checker is not a release of decernor' >&2
		return 1
	}
	version="${BASH_REMATCH[1]}"
	extended="$("$candidate" version -e)" || return 1
	local labels=(Version Commit 'Build Date' 'Go Version' Gofulmen Crucible) line count=0
	while IFS= read -r line; do
		if ((count >= ${#labels[@]})) || ! [[ "$line" =~ ^${labels[count]}:[[:space:]]+[^[:space:]] ]]; then
			echo 'error: invalid decernor extended identity' >&2
			return 1
		fi
		count=$((count + 1))
	done <<<"$extended"
	[[ $count == 6 && "$extended" =~ ^Version:[[:space:]]+${version//./\\.}($'\n') ]] || return 1
	local have want=(0 1 8)
	IFS=. read -r -a have <<<"$version"
	for i in 0 1 2; do
		((have[i] > want[i])) && break
		if ((have[i] < want[i])); then
			echo 'error: decernor >= 0.1.8 required' >&2
			return 1
		fi
	done
	# shellcheck disable=SC2034 # Consumed by callers sourcing this helper.
	RELEASE_DECERNOR_BIN="$candidate"
}

release_signing_git() {
	git -c gpg.format=openpgp -c gpg.program=gpg -c gpg.openpgp.program=gpg "$@"
}

require_signing_program() {
	local key want effective configured rc
	for key in gpg.format gpg.program gpg.openpgp.program; do
		want=gpg
		[[ "$key" == gpg.format ]] && want=openpgp
		effective="$(release_signing_git config --get "$key")" || return 1
		[[ "$effective" == "$want" ]] || {
			echo "error: signing program pin failed: $key" >&2
			return 1
		}
		rc=0
		configured="$(git config --get-all "$key")" || rc=$?
		[[ $rc == 0 || $rc == 1 ]] || return 1
		if [[ $rc == 0 && "$configured" != "$want" ]]; then
			echo "note: configured $key overridden; release signing uses $want" >&2
		fi
	done
}

require_signing_keyring() {
	local home="${FULMENHQ_CRUCIBLE_GPG_HOMEDIR:-}" resolved default_home account_home record gpg_path candidate
	[[ "$home" == /* && -d "$home" && ! -L "$home" ]] || {
		echo 'error: FULMENHQ_CRUCIBLE_GPG_HOMEDIR must name a dedicated absolute non-symlink directory' >&2
		return 1
	}
	resolved="$(cd "$home" && pwd -P)" || return 1
	gpg_path="$(command -v gpg)" || return 1
	default_home="$(env -u GNUPGHOME "$(dirname "$gpg_path")/gpgconf" --list-dirs homedir)" || return 1
	if [[ "$(uname -s)" == Darwin ]]; then
		record="$(dscl . -read "/Users/$(id -un)" NFSHomeDirectory)" || return 1
		account_home="$(printf '%s' "$record" | tr -d '\n' | sed 's/^NFSHomeDirectory:[[:space:]]*//')"
	else
		record="$(getent passwd "$(id -un)")" || return 1
		account_home="$(printf '%s\n' "$record" | cut -d: -f6)"
	fi
	[[ "$default_home" == /* && "$account_home" == /* ]] || return 1
	for candidate in "$default_home" "$account_home/.gnupg"; do
		[[ -e "$candidate" ]] || continue
		[[ "$(cd "$candidate" && pwd -P)" != "$resolved" ]] || {
			echo 'error: default GPG keyring is forbidden; use a dedicated signing keyring' >&2
			return 1
		}
	done
	if [[ -n "${GNUPGHOME:-}" ]]; then
		[[ -d "$GNUPGHOME" && "$(cd "$GNUPGHOME" && pwd -P)" == "$resolved" ]] || {
			echo 'error: GNUPGHOME differs from the dedicated signing keyring' >&2
			return 1
		}
	fi
	export GNUPGHOME="$resolved"
}
