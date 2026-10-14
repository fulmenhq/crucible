# Release Checklist Template

> Copy this template into a release PR or issue and fill in the details for the specific version. Do **not** edit this file with release-specific information—keep it as the canonical playbook.
>
> **For operational workflow**: See [`docs/ops/repository/release-checklist.md`](docs/ops/repository/release-checklist.md) for the detailed Crucible-specific release process including SSOT sync requirements.

**IMPORTANT**: Always run `make prepush` before tagging. This ensures `sync-to-lang` runs and all `lang/*/config/` directories contain current SSOT assets. Skipping this can result in tags missing synced content (see v0.4.7 → v0.4.8 for example).

## Variables (Quick Reference)

- `FULMENHQ_CRUCIBLE_RELEASE_TAG`: optional override tag (e.g., `v0.3.0`)
- `FULMENHQ_CRUCIBLE_GPG_HOMEDIR`: dedicated signing keyring directory (recommended)
- `FULMENHQ_CRUCIBLE_PGP_KEY_ID`: key id/email/fingerprint for signing
- `FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN`: set to `1` to allow tagging from non-main branch
- `FULMENHQ_CRUCIBLE_TAGGER_NAME` / `FULMENHQ_CRUCIBLE_TAGGER_EMAIL`: optional; must equal `config/release/tagger-identity.txt` (the tagger is always taken from that file)

Optional minisign sidecar attestation:

- `FULMENHQ_CRUCIBLE_MINISIGN_KEY`: minisign secret key path (fulmenhq org release key)
- `FULMENHQ_CRUCIBLE_MINISIGN_PUB`: minisign public key path (default: `docs/security/release-minisign.pub`)

Legacy aliases (deprecated, will be removed):

- `CRUCIBLE_RELEASE_TAG`, `CRUCIBLE_GPG_HOMEDIR`, `CRUCIBLE_PGP_KEY_ID`, `CRUCIBLE_ALLOW_NON_MAIN`

> **Why `FULMENHQ_CRUCIBLE_`?** Multiple orgs in the 3 Leaps Galaxy have crucible repos (3leaps, enacthq, fulmenhq). The prefix disambiguates which crucible's release environment is being configured.

Note: These are not secrets and typically aren't stored in encrypted env bundles.

## Metadata

- Version: `<VERSION>`
- Target release date: `<YYYY-MM-DD>`
- Release captain: `<@handle>`

---

## Pre-Release Validation

- [ ] Root assets updated (`schemas/`, `docs/`, `templates/`)
- [ ] Language wrappers synced (`bun run sync:to-lang`)
- [ ] Version constants aligned (`bun run version:update`)
- [ ] Go tests passing (`bun run test:go`)
- [ ] TypeScript tests passing (`bun run test:ts`)
- [ ] Documentation/standards updated and reviewed
- [ ] Changelog / release notes drafted

## Packaging & Distribution

- [ ] Go module module checks (`go list`, `go test`) on clean tree
- [ ] npm package build (`cd lang/typescript && bun run build`)
- [ ] Schema normalization helpers verified (`lang/go`, `lang/typescript`)
- [ ] Pull script smoke test (optional) – `bun run scripts/pull/crucible-pull.ts --dry-run`

## Tagging (Signed Tag Required)

### 1. Set up GPG environment

```bash
# Enable pinentry prompts
export GPG_TTY="$(tty)"
gpg-connect-agent updatestartuptty /bye

# Point to dedicated signing keyring (recommended)
export FULMENHQ_CRUCIBLE_GPG_HOMEDIR="/path/to/signing-keyring"
export FULMENHQ_CRUCIBLE_PGP_KEY_ID="your-key-id"

# Verify key is available
GNUPGHOME="${FULMENHQ_CRUCIBLE_GPG_HOMEDIR}" gpg --list-secret-keys --keyid-format=long
```

### 2. Create the signed tag (with safety checks)

```bash
make release-tag
```

The script performs these safety checks before creating the tag:

- Tag format validation (`vMAJOR.MINOR.PATCH`)
- Clean working tree required
- Must be on `main` branch (set `FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1` to override)
- Tag must not already exist
- GPG signing key availability verified
- Tagger name and email stamped from `config/release/tagger-identity.txt`
- Automatic verification against the pinned release key after creation (`scripts/verify-pinned-tag.sh`); a tag that fails is deleted locally

### 3. Verify the signed tag (optional manual check)

```bash
make release-verify-tag
```

### 4. Push

The release commit is already on `main`. Push only the tag:

```bash
make release-push-tag
```

This verifies the local signature against the pin, requires the tagged commit to be on `origin/main` and the remote tag to be absent, pushes the tag ref, and confirms the remote tag object and GitHub's verified flag (when `gh` is available).

## Post-Release Validation

- [ ] `go get github.com/fulmenhq/crucible@v<VERSION>` succeeds
- [ ] `bun add @fulmenhq/crucible@<VERSION>` succeeds in clean project
- [ ] Downstream sync script succeeds against the tagged version
- [ ] Monitoring/telemetry updated with release info

### Verify tag signature (optional)

**Pinned key** (authoritative):

```bash
git fetch --tags origin
make release-verify-tag
```

**GitHub API**:

```bash
make release-verify-remote-tag
```

**GitHub Web UI note**: A green "Verified" badge only appears if:

1. The signing public key is uploaded to the GitHub account
2. The tagger email matches a verified email on that account

`config/release/tagger-identity.txt` holds a UID email on the estate signing key, so both conditions hold once the key is on the tagger account.

## Release keys

`scripts/verify-pinned-tag.sh` accepts a tag only when it carries one good, unexpired signature by the pinned signing subkey and the committed tagger identity. It reads these files from the tagged commit, not the working tree:

| File                                     | Holds                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `docs/security/release-signing-keys.asc` | Estate GPG public primary plus exactly one signing subkey        |
| `docs/security/release-minisign.pub`     | fulmenhq org minisign public key                                 |
| `keys/expected-fingerprints.txt`         | `gpg <primary fingerprint>` then `minisign <sha256 of key blob>` |
| `config/release/tagger-identity.txt`     | Required tagger name and email                                   |

The GPG files are the same bytes across estate repositories, and the minisign files are the same across fulmenhq repositories; copy them from a sibling rather than re-exporting. Tags created before these files were committed (v0.4.19 and earlier) do not pass the pinned check; `git tag -v` still verifies them against the key that signed them.

When the release key rotates:

- [ ] Update the pin and `keys/expected-fingerprints.txt` together by reviewed PR **before** creating the first tag signed by the new key
- [ ] Upload the new public key to the maintainer GitHub account (keeps the Verified badge green)
- [ ] The verifier accepts exactly one signing subkey, so the pin switches in the same PR; tags already pushed under the old key are unaffected

## Communication

- [ ] Release announcement shared (internal + community channels)
- [ ] Follow-up issues filed for deferred items

## Rollback

If issues are discovered after release:

```bash
# Delete remote tag
git push origin --delete v<VERSION>

# Delete local tag
git tag -d v<VERSION>

# If VERSION file needs revert
git revert <commit-hash>
```

---

## Release Tooling Reference

### Make Targets

| Target                           | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `make release-tag`               | Create signed git tag with all safety checks             |
| `make release-verify-tag`        | Verify an existing signed tag against the pinned key     |
| `make release-push-tag`          | Verify, push and confirm the signed version tag          |
| `make release-verify-remote-tag` | Confirm GitHub reports the tag verified                  |
| `make release-guard-tag-version` | Verify tag matches VERSION file (CI-friendly)            |
| `make test-release-tooling`      | Prove the pinned verifier rejects unpinned/tampered tags |

### Scripts

All scripts are in `scripts/` and can be run directly if needed.

**`scripts/release-tag.sh`** - The primary release script. Safety checks:

1. Validates tag format (`vMAJOR.MINOR.PATCH`)
2. Ensures working tree is clean (no uncommitted changes)
3. Ensures on `main` branch (override with `FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1`)
4. Ensures tag doesn't already exist
5. Verifies GPG signing key is available
6. Creates signed annotated tag with the committed tagger identity
7. Verifies the tag against the pinned release key (deletes the local tag on failure)

**`scripts/release-guard-tag-version.sh`** - Version consistency check:

- Compares current git tag (or `FULMENHQ_CRUCIBLE_RELEASE_TAG` env var) against `VERSION` file
- Use in CI with `FULMENHQ_CRUCIBLE_REQUIRE_TAG=1` to enforce tag presence
- Exits 0 if match, exits 1 if mismatch

**`scripts/release-verify-tag.sh`** - Signature verification:

- Verifies GPG signature on the tag for `VERSION` (or `FULMENHQ_CRUCIBLE_RELEASE_TAG`)
- Runs `scripts/verify-pinned-tag.sh` (pinned subkey, anchors, tagger identity)
- Verifies the minisign attestation in `dist/release/` against the committed public key when present
- Respects `FULMENHQ_CRUCIBLE_GPG_HOMEDIR` for dedicated keyrings

**`scripts/release-push-tag.sh`** - Tag push with confirmation:

- Re-verifies the local tag, requires the tagged commit on `origin/main` and no existing remote tag
- Pushes only the tag ref and confirms the remote tag object matches local
- Confirms GitHub reports the tag verified (`scripts/release-verify-remote-tag.sh`) when `gh` is available

---

_See `docs/standards/release-checklist-standard.md` for guidance on using this template across Fulmen repositories._
