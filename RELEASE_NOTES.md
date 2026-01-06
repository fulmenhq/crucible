# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

---

## v0.4.0 - Module Registry Weight Classification

Introduces weight classification and feature gate support for helper library modules, enabling consistent feature gating across all language implementations.

### Highlights

- **Weight Classification**: Binary `light`/`heavy` classification for dependency footprint
- **Feature Gate Defaults**: `default_inclusion` field for opt-in vs opt-out modules
- **Similarity Promotion**: Moved from foundry-catalogs to standalone platform module
- **Product Marketing Role**: New `prodmktg` agentic role for messaging and branding

### Added

- Module registry v1.1.0 schemas with `weight`, `default_inclusion`, `notes` fields
- Foundry catalog registry v1.1.0 with `feature_group` for library feature mapping
- `docs/standards/fulmen/module-registry.md` documenting weight classification semantics
- `prodmktg` role with new `marketing` category in role-prompt schema

### Fixed

- Schema `$id` host corrected from `fulmenhq.dev` to `schemas.fulmenhq.dev`

### Impact

- Helper libraries (rsfulmen, gofulmen, pyfulmen, tsfulmen) can implement feature gates using registry metadata
- Foundry catalogs reduced from 7 to 6 entries (similarity promoted)
- Platform modules increased from 18 to 19 entries (similarity added)

See [release-notes/v0.4.0.md](release-notes/v0.4.0.md) for details.

---

## v0.3.2 - Signal Handling & Schema Fixes

Adds SIGKILL as first-class signal, GNU timeout exit codes (124-127), and fixes sync-keys schema drift.

### Highlights

- **SIGKILL Signal**: Full metadata entry for process supervision tools (sysprims, rsfulmen)
- **Shell Exit Codes**: GNU timeout/shell conventions (124-127) for process control
- **Schema Fix**: Sync-keys schema now allows metadata objects

### Added

- SIGKILL in `signals.yaml`: id `kill`, unix_number 9, exit_code 137, platform support
- Shell category in `exit-codes.yaml`: EXIT_TIMEOUT (124), EXIT_TIMEOUT_INTERNAL (125), EXIT_CANNOT_EXECUTE (126), EXIT_NOT_FOUND (127)

### Fixed

- `sync-keys.schema.yaml`: Added optional `metadata` property with reserved keys (`sourceRepo`, `sourcePathBase`, `notes`)

### Impact

- rsfulmen can now consume signals and exit codes catalogs for sysprims foundation stage
- Offline schema validation works for sync-keys.yaml consumers

See [release-notes/v0.3.2.md](release-notes/v0.3.2.md) for details.

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
