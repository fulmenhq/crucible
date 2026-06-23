# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.15 - ADR-0012 Cross-Ref Completion & Upstream v0.1.14

**Completes the ADR-0012 absolute-`$id` cross-reference rollout for the logging and module-manifest schemas, migrates the logging `$id`s to canonical version-in-path, and refreshes the vendored 3leaps/crucible pin to v0.1.14.**

### Why This Matters

**For library consumers (tsfulmen, gofulmen, etc.)**: cross-schema `$ref`s in `observability/logging` and `library/module-manifest` now resolve in memory-based validators. Previously, relative cross-file refs left over from a partial ADR-0012 rollout failed to resolve without filesystem context — the exact breakage tsfulmen and gofulmen reported.

**For schema identity**: the logging `$id`s move to the canonical version-in-path form so on-disk layout matches the canonical URI. This is an identity change within the existing `v1.0.0` files; external consumers resolving by the old version-in-filename URIs should switch to version-in-path (no in-repo consumers used the old URIs).

### Highlights

- **ADR-0012 completed**: 16 relative cross-file `$ref`s across 4 schemas converted to absolute canonical `$id` URLs, plus `logger-config`'s absolute ref repointed (finishing the rollout that had only covered `logger-config`)
- **module-manifest off-by-one fixed**: `../../taxonomy/...` → absolute `taxonomy/language` `$id`
- **logging `$id`s → version-in-path** within `v1.0.0` (matches corpus convention)
- **Upstream v0.1.14**: vendored 3leaps/crucible pin bumped from v0.1.12 (schemas byte-identical; docs/provenance only)
- **Tooling**: upstream-pull provenance "Synced By" made model-agnostic

### Changes

| Area     | Change                                                                                        |
| -------- | --------------------------------------------------------------------------------------------- |
| Schema   | Complete ADR-0012: 16 relative cross-file `$ref`s → absolute `$id` (logging, module-manifest) |
| Schema   | `observability/logging` `$id`s → canonical version-in-path (within `v1.0.0`)                  |
| Upstream | Bump vendored 3leaps/crucible `v0.1.12 → v0.1.14` (commit `18018788`)                         |
| Tooling  | upstream-pull provenance "Synced By" made model-agnostic                                      |
| Docs     | ADR-0012 status → phased-complete; lint-check action item recommended                         |

**No breaking changes** to public API or schema versions (all touched schemas stay `v1.0.0`). See the logging `$id` compatibility note in the full notes.

**Full release notes**: [release-notes/v0.4.15.md](release-notes/v0.4.15.md)

---

## v0.4.14 - app-identity `metadata.typescript` & Codegen StrEnum

**Adds a `metadata.typescript` packaging section to app-identity, finishes the Python enum `StrEnum` modernization at the generator, and moves CI off the Node 20 runtime.** **(Condensed — see [release-notes/v0.4.14.md](release-notes/v0.4.14.md) for full details)**

### Highlights

- New optional `metadata.typescript` object on the app-identity `v1.0.0` schema (`package_name` + `console_scripts` → package.json `bin`), mirroring `metadata.python`; additive, schema stays `v1.0.0`
- Codegen fix: fulpack/fulencode Python enum templates now emit `StrEnum` (ruff `UP042`), making regeneration idempotent
- CI off Node 20: checkout v5, setup-go v6, setup-bun v2, setup-uv v7; rust-toolchain `@v1`; goneat pin `v0.5.13`

---

## v0.4.13 - Agentic Role Catalog Contract-Parity

**Contract/schema/fixture parity focus across the `devlead`, `devrev`, and `qa` roles, plus YAML tooling stabilization.** **(Condensed — see [release-notes/v0.4.13.md](release-notes/v0.4.13.md) for full details)**

### Highlights

- `devlead`/`devrev`/`qa` roles (→ version 1.0.1) gain contract/schema/fixture parity guidance and checklists; guards against green-CI-only sign-off; propagated to all language wrappers
- Tooling: goneat pin `v0.5.3 → v0.5.12` + repository YAML reformatted to its conventions, so downstream-synced assets arrive already-formatted
- Added root `.yamllint` / `.yamlfmt` (2-space) aligned across the Fulmen galaxy

---

[View complete changelog →](CHANGELOG.md)
