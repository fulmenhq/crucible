# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

---

## v0.3.1 - Patterns Catalog Fixes

Patch release fixing invalid examples in the Foundry patterns catalog.

### Highlights

- **JWT Example**: Replaced placeholder ellipsis with valid JWT compact serialization
- **UUID-v4 Example**: Fixed example from v1 format to valid v4 format (version nibble = 4)
- **ADR-0012**: Schema reference resolution ADR marked as implemented
- **CI Cleanup**: Removed duplicate YAML document start markers

### Fixed

- `jwt` pattern example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` → valid 3-segment JWT
- `uuid-v4` pattern example: `123e4567-e89b-12d3-...` → `123e4567-e89b-42d3-...`

### Impact

Helper libraries (gofulmen, pyfulmen, tsfulmen, rsfulmen) consuming patterns.yaml can now validate all examples against their regex patterns without skipping entries.

See [release-notes/v0.3.1.md](release-notes/v0.3.1.md) for details.

---

## v0.3.0 - Agentic Interface Overhaul

Major overhaul of Crucible's agentic interface with schema-validated role prompts, formal attribution baseline, and upstream vendoring patterns.

### Highlights

- **Role Prompt Migration**: 7 agent roles migrated from inline markdown to `config/agentic/roles/*.yaml`
- **Git Commit Attribution Baseline**: Canonical format for AI-assisted commits in `docs/catalog/agentic/attribution/git-commit.md`
- **Upstream Vendoring**: New `schemas/upstream/` pattern for cross-repository schema sharing
- **Release Phase Schema**: Extended with `release` (ga synonym) and `hotfix` values
- **Adoption Guide**: New `docs/guides/agentic-interface-adoption.md` for ecosystem maintainers

### Changed

- `AGENTS.md` now references YAML role configurations
- `MAINTAINERS.md` simplified structure
- Phase schema consolidation (goneat uses repository lifecycle-phase)
- Repository lifecycle standard clarifies lifecycle vs release phase
- CI workflow YAML cleanup

See [release-notes/v0.3.0.md](release-notes/v0.3.0.md) for details.

---

## v0.2.27 - Vendor Pattern Fix

Schema fix allowing leading digits in vendor names.

### Highlights

- **Vendor Pattern**: Updated `app-identity.schema.json` pattern from `^[a-z][a-z0-9]{0,62}[a-z0-9]$` to `^[a-z0-9]{2,64}$`
- **Cross-Language Safety**: Documented safety analysis for Go, Python, TypeScript, Rust
- **Style Fix**: Added YAML document start markers to workflow files

### Impact

Vendor names like `3leaps`, `37signals`, and `8x8` now pass validation.

See [release-notes/v0.2.27.md](release-notes/v0.2.27.md) for details.
