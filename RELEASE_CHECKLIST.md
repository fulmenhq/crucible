# Release Checklist Template

> Copy this template into a release PR or issue and fill in the details for the specific version. Do **not** edit this file with release-specific information—keep it as the canonical playbook.
>
> **For operational workflow**: See [`docs/ops/repository/release-checklist.md`](docs/ops/repository/release-checklist.md) for the detailed Crucible-specific release process including SSOT sync requirements.

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

## Tagging & Publication

- [ ] `VERSION` committed with version bump
- [ ] Signed annotated git tag created (`make release-tag` or `git tag -s -a v<VERSION> -m "Release v<VERSION>"`)
- [ ] Optional: GitHub tag shows “Verified” (may be `unknown_key` until the org signing key + tagger email are configured; local `git tag -v` is authoritative)
- [ ] Tag pushed to origin
- [ ] Go module publishes (proxy fetch succeeds)
- [ ] npm package published (or prepared for release)
- [ ] Release notes file committed (`release-notes/<VERSION>.md`)
- [ ] Release notes posted (GitHub release or docs update)

## Post-Release Validation

- [ ] `go get github.com/fulmenhq/crucible@v<VERSION>` succeeds
- [ ] `bun add @fulmenhq/crucible@<VERSION>` succeeds in clean project
- [ ] Downstream sync script succeeds against the tagged version
- [ ] Monitoring/telemetry updated with release info

## Communication

- [ ] Release announcement shared (internal + community channels)
- [ ] Follow-up issues filed for deferred items

## Rollback Plan

- [ ] Command documented to delete tag and revert `VERSION`
- [ ] Communication plan ready if rollback triggered

---

_See `docs/standards/release-checklist-standard.md` for guidance on using this template across Fulmen repositories._
