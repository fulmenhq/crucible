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

Optional minisign sidecar attestation:

- `FULMENHQ_CRUCIBLE_MINISIGN_KEY`: minisign secret key path
- `FULMENHQ_CRUCIBLE_MINISIGN_PUB`: minisign public key path

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
- [ ] Pull script smoke test (optional) – `bun run scripts/crucible-pull.ts --validate`

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
- Automatic signature verification after creation

### 3. Verify the signed tag (optional manual check)

```bash
make release-verify-tag
# or:
git tag -v v$(cat VERSION)
```

### 4. Push

```bash
git push origin main
git push origin v$(cat VERSION)
```

## Post-Release Validation

- [ ] `go get github.com/fulmenhq/crucible@v<VERSION>` succeeds
- [ ] `bun add @fulmenhq/crucible@<VERSION>` succeeds in clean project
- [ ] Downstream sync script succeeds against the tagged version
- [ ] Monitoring/telemetry updated with release info

### Verify tag signature (optional)

**Local git** (most reliable):

```bash
git fetch --tags origin
git tag -v v$(cat VERSION)
```

**GitHub API** (CI-friendly):

```bash
TAG_SHA=$(gh api repos/fulmenhq/crucible/git/ref/tags/v$(cat VERSION) --jq .object.sha)
gh api repos/fulmenhq/crucible/git/tags/$TAG_SHA --jq .verification
```

**GitHub Web UI note**: A green "Verified" badge only appears if:

1. The signing public key is uploaded to the GitHub account
2. The tagger email matches a verified email on that account

Otherwise GitHub may show "Unverified" even though `git tag -v` succeeds locally.

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

| Target                           | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `make release-tag`               | Create signed git tag with all safety checks  |
| `make release-verify-tag`        | Verify an existing signed tag                 |
| `make release-guard-tag-version` | Verify tag matches VERSION file (CI-friendly) |

### Scripts

All scripts are in `scripts/` and can be run directly if needed.

**`scripts/release-tag.sh`** - The primary release script. Safety checks:

1. Validates tag format (`vMAJOR.MINOR.PATCH`)
2. Ensures working tree is clean (no uncommitted changes)
3. Ensures on `main` branch (override with `FULMENHQ_CRUCIBLE_ALLOW_NON_MAIN=1`)
4. Ensures tag doesn't already exist
5. Verifies GPG signing key is available
6. Creates signed annotated tag
7. Automatically verifies signature after creation

**`scripts/release-guard-tag-version.sh`** - Version consistency check:

- Compares current git tag (or `FULMENHQ_CRUCIBLE_RELEASE_TAG` env var) against `VERSION` file
- Use in CI with `FULMENHQ_CRUCIBLE_REQUIRE_TAG=1` to enforce tag presence
- Exits 0 if match, exits 1 if mismatch

**`scripts/release-verify-tag.sh`** - Signature verification:

- Verifies GPG signature on the tag for `VERSION` (or `FULMENHQ_CRUCIBLE_RELEASE_TAG`)
- Respects `FULMENHQ_CRUCIBLE_GPG_HOMEDIR` for dedicated keyrings

---

_See `docs/standards/release-checklist-standard.md` for guidance on using this template across Fulmen repositories._
