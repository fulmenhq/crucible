# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Versions 0.1.0 through 0.1.4 were originally released with CalVer tags (v2025.10.1 through v2025.10.5). Retroactive SemVer tags have been added for migration continuity. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for details.

**Retention Policy**: This file contains the 10 most recent releases plus `[Unreleased]`. Older entries are preserved in individual `release-notes/v*.md` files. This policy keeps the changelog navigable while maintaining complete history in the release-notes archive.

## [0.4.16] - 2026-08-08

### Added

- **standards: host binary identity standard** — new cross-language standard defining the `version --extended` contract for identifying a compiled binary vs the SDK/SSOT pins it was built against: canonical field shape (version, commit, buildDate, dirty, runtime, platform), host-vs-pins separation (pins extended-only, never the host `Commit:`), explicit dirty semantics (true/false when determinable, unknown when not), `FULMEN_HOST_*` environment injection contract, and a trust boundary (informational, not attestation). Ships Phase A build-time injection recipes for Go (Makefile ldflags), Rust (`build.rs` + `env!`), TypeScript, and Python (build-time-stamp primary with documented env fallback), plus a Phase B gate for future resolver libraries. Wires the Cobra CLI guide and CLI-category README, and adds one-line runtime-vs-build cross-references from the app-identity guide and module; propagated to all language wrappers.

### Changed

- **deps: goneat tooling pin `v0.5.13 → v0.5.16` + minor/patch dependency pins** — lifted the Makefile `GONEAT_VERSION` and refreshed in-scope minor/patch deps across the root and TypeScript wrapper manifests (`js-yaml`, `@biomejs/biome`, `@types/node`); both Bun lockfiles refreshed and frozen-install verified; Go surface unchanged (`gopkg.in/yaml.v3` already current).
- **tooling: markdown aligned to the goneat v0.5.16 formatter** — whitespace-only markdown normalization (blank line after list markers) across root docs/schemas, release notes, and synced wrapper docs, matching the lifted tooling pin. No content change.

## [0.4.15] - 2026-06-23

### Fixed

- **schemas: complete the ADR-0012 absolute `$id` cross-references** — ADR-0012 (use absolute `$id` URLs for cross-schema `$ref`) was only partially rolled out: an earlier commit fixed `logger-config.schema.json` but left relative cross-file `$ref`s in `observability/logging`'s `log-event`, `severity-filter`, and `middleware-config`, plus an off-by-one relative `$ref` in `library/module-manifest` (`../../taxonomy/...` resolved one level short). Relative cross-file refs fail to resolve in memory-based validators (reproduced from tsfulmen and gofulmen). All 16 remaining relative cross-file `$ref`s across those 4 schemas (12 in `log-event`, 2 in `severity-filter`, 1 in `middleware-config`, 1 in `module-manifest`) are now absolute canonical `$id` URLs, and `logger-config`'s existing absolute middleware ref was repointed to the new version-in-path `$id`; internal `#/$defs/...` refs stay relative (ADR-0012 permits).

### Changed

- **observability/logging: `$id`s migrated to canonical version-in-path** — the 6 logging `$id`s moved from the deprecated version-in-filename form (`.../logging/log-event-v1.0.0.json`) to canonical version-in-path (`.../logging/v1.0.0/log-event.schema.json`), matching on-disk layout and the rest of the corpus. Identity change **within** the existing `v1.0.0` files (contents/version unchanged); no in-repo consumers referenced the old URIs (verified). External consumers resolving by the old canonical URI should switch to the version-in-path URIs.
- **upstream: vendored 3leaps/crucible `v0.1.12 → v0.1.14`** — refreshed to the just-released upstream (commit `18018788`). Minimal content delta within sync scope: vendored schemas (`classifiers`/`foundation`/`ailink`/`agentic` `v0`) are byte-identical; only 3 classifier docs got one-line wording reconciliations plus regenerated `PROVENANCE.md`. Upstream's new `auth/v0` schema and `dataeng` role are outside the sync scope and not vendored.
- **tooling: upstream-pull provenance attribution made model-agnostic** — `scripts/3leaps-crucible-upstream-pull.ts` no longer hardcodes a model version in the generated `PROVENANCE.md` "Synced By" line (it went stale across model changes; the precise model lives in the commit trailer).
- **docs: ADR-0012 status updated to phased-complete** — records the initial (logger-config) + completion (this release) rollout, notes the remaining deprecated version-in-filename `$id`s elsewhere in the corpus (migrate at next version bump), and upgrades the lint-check action item from optional to recommended.

## [0.4.14] - 2026-06-16

### Added

- **app-identity: `metadata.typescript` packaging section** — adds an optional `metadata.typescript` object to the app-identity `v1.0.0` schema, mirroring `metadata.python` (`package_name` + `console_scripts: [{name, entry_point}]` → package.json `bin`). Lets TypeScript/npm packages declare their npm package name and bin entries first-class instead of via a custom metadata field. Additive and backward-compatible (`metadata.additionalProperties` was already `true`), so the schema stays `v1.0.0`; metadata parsing is pass-through, so no Go/Python/TS parser changes are required. Includes the standard doc (table row + example + vendor-vs-package-name pointer), example YAML, a new `typescript-package` fixture, and the parity-snapshot case; propagated to all language wrappers.

### Fixed

- **codegen: Python enum templates emit `StrEnum`** — the fulpack and fulencode Python enum codegen templates emitted `class X(str, Enum)`, which ruff `UP042` flags (lang/python targets py312) and which regressed the committed `StrEnum` enums on every `make sync`/`make precommit` (leaving local precommit effectively unrunnable). Both templates now emit `from enum import StrEnum` + `class X(StrEnum)`, matching the fulhash template; regeneration is now idempotent and ruff-clean.

### Changed

- **CI: GitHub Actions off the Node 20 runtime** — `actions/checkout` v4→v5, `actions/setup-go` v5→v6, `oven-sh/setup-bun` v1→v2, `astral-sh/setup-uv` v3→v7 (each verified node24 via `action.yml`). `Swatinem/rust-cache@v2` is already node24; `dtolnay/rust-toolchain` pinned `@master → @v1` (composite; stable tag honoring `toolchain: "1.89"`).
- **goneat pin** `v0.5.12 → v0.5.13` (Makefile), matching the current release and local toolchain.

## [0.4.13] - 2026-06-04

### Changed

- **Agentic role catalog — contract-parity focus** (`devlead`, `devrev`, `qa` → role version 1.0.1):
  - `devlead`: added contract/schema/fixture parity to mindset principles, responsibilities, and a new `implementation` checklist (contract / defaults / error-path / deferred-scope / fixture / cross-language parity + quality gates); scope narrows as code-review/PR oversight moves to `devrev`/`qa`; quality-gate guidance updated `make precommit` → `make check-all`; `qa` added to the "distinct from" context.
  - `devrev`: added contract-conformance review against synced schemas, fixtures, and standards; new schema/fixture parity review checklist; guards against approving on green CI alone when parity checks are missing.
  - `qa`: added schema/standard and fixture parity validation to the acceptance checklist; guards against green-CI-only sign-off.
  - Propagated to all language wrappers (`lang/{python,rust,typescript}/config/agentic/roles/`); Rust navigation catalog (`lang/rust/src/agentic.rs`) regenerated.
- **Tooling**: pinned goneat `v0.5.3` → `v0.5.12` (Makefile) and reformatted repository YAML to its conventions, so assets synced into downstream libraries (tsfulmen, pyfulmen, rsfulmen) arrive already-formatted and stop format churn at the consumer.

### Added

- **Root `.yamllint` and `.yamlfmt`** (2-space convention), aligned across the Fulmen galaxy (`tsfulmen`, `goneat`) to stabilize `actionlint`/`yamllint` behavior in CI and end the recurring spacing disagreements.

### Removed

- **Guardian git-hook browser-approval gate** removed from `.goneat/hooks/{pre-commit,pre-push}`, moving to the standard commit/push/PR flow (repo/merge-policy controls instead of local interception).

### Fixed

- **Role YAML syntax** in `devlead.yaml` and `devrev.yaml`, corrected after the v1.0.1 contract-parity edits.
- **Python enums** (`fulencode`, `fulpack`) modernized `(str, Enum)` → `StrEnum` (ruff UP042); Python floor is already 3.12. Behavior validated by the test suite.

### Dependencies

Conservative minor/patch wave (no majors; TypeScript 6, vitest 4, pytest 9, glob/ejs/thiserror majors deferred):

- **@biomejs/biome** 2.4.2 → 2.4.16 (root + lang/typescript), with `biome.json` `$schema` aligned to the installed CLI (2.4.16). (Note: goneat v0.5.12 bundles biome 2.4.6 internally, so `goneat assess` may still flag the `$schema` until goneat's bundled biome catches up — this does not affect the repo's biome or CI.)
- **js-yaml** 4.1.1 → 4.2.0 (root + lang/typescript).
- **@types/bun** 1.3.9 → 1.3.14; **@types/node** held on the v20 line (→ 20.19.41).
- **pytest-cov** 7.0.0 → 7.1.0; **ruff** 0.14.0 → 0.15.15 (lang/python).
- **CI**: `setup-bun` `bun-version` 1.2.1 → 1.3.9 (aligns with local).

(Rust crate deps float within unchanged `Cargo.toml` caps; `lang/rust/Cargo.lock` is not committed, so there is no lockfile change here.)

## [0.4.12] - 2026-02-19

### Added

- **Typed role catalog API** across all four language implementations

  - Go: `LoadRole(slug)`, `LoadRoleCatalog()`, `ListRoleSlugs()` + `RolePrompt` struct
  - TypeScript: `loadRole`, `loadRoleCatalog`, `listRoleSlugs` + `RolePrompt` interface
  - Python: `load_role`, `load_role_catalog`, `list_role_slugs` + `RolePrompt` dataclass
  - Rust: `Role` enum + `RoleMetadata` struct via codegen (`lang/rust/src/agentic.rs`)
  - Full schema field coverage: all `role-prompt.schema.json` fields represented
  - `RoleRequiredReading` / `RoleRequiredReadingFile` typed structs for structured `required_reading`

- **Three new agentic roles** (`status: draft`):

  - `cxotech` — Chief Experience Technology Officer (strategic governance, 6-18mo timeline)
  - `deliverylead` — Delivery Lead (project coordination, sprint-quarter timeline)
  - `infraeng` — Infrastructure Engineer (cloud infrastructure, platform reliability)
  - Catalog grows from 11 approved roles to 14 total (11 approved + 3 draft)

- **Rust role codegen infrastructure**:

  - `scripts/codegen/generate-role-types.ts` — Bun/TypeScript script rendering EJS → Rust source
  - `scripts/codegen/verify-role-types.ts` — drift detection for CI (`verify-codegen` target)
  - `scripts/codegen/role-types/rust/template.ejs` — EJS template for Role enum + RoleMetadata
  - `scripts/codegen/role-types/rust/postprocess.sh` — rustfmt post-processor
  - `make codegen-roles` — generation target; `make codegen-all` now includes roles

- **3leaps/crucible v0.1.12 upstream sync**: Provenance bump, no schema content changes

### Changed

- **Dependencies**: Updated runtime and dev dependencies
  - `glob`: 11.0.3 → 11.1.0
  - `js-yaml`: 4.1.0 → 4.1.1
  - `@biomejs/biome`: 2.3.2 → 2.4.2 (root and lang/typescript)
  - `@types/bun`: 1.2.23 → 1.3.9
  - Updated `biome.json` schema version to 2.4.2

### Fixed

- **Slug regex alignment**: All implementations now use schema-canonical `^[a-z][a-z0-9]*$`
  (was: `^[a-z0-9][a-z0-9_-]*$` — allowed hyphens/underscores/leading digits not in schema)
- **Missing `RolePrompt` fields**: `pre_push_checklist`, `required_reading`, `cross_role_note`
  added to Go struct, Python dataclass, and TypeScript interface; previously silently discarded
  during YAML unmarshalling
- **`make upstream-validate`**: Fixed goneat invocation (`--include` glob treated as literal path
  vs. directory + `--force-include` pattern); now correctly validates all 125+ upstream schemas

## [0.4.11] - 2026-02-09

### Added

- **Role catalog schema compliance**: All 11 agentic roles updated with `domains` property

  - Required by updated role-prompt.schema.json from 3leaps/crucible v0.1.10
  - Added `domains` to: cicd, dataeng, devlead, devrev, entarch, infoarch, prodmktg, qa, releng, secrev, uxdev
  - Domain assignments reflect business process organization (development, delivery, governance, etc.)
  - 15 process domains now defined: analytics, architecture, automation, consulting, coordination, delivery, development, documentation, governance, implementation, marketing, product, quality, security, strategy
  - Enables timeline-based and process-based role selection

- **3leaps/crucible v0.1.10 upstream sync**: Latest galaxy-level standards
  - Formatted JSON schemas (enum arrays expanded for goneat consistency)
  - Updated role-prompt schema with `domains` property (required, 1-3 items)
  - New governance roles tracked (not synced to local roles/): deliverylead, cxotech
  - Three-tier governance model: dispatch (minutes-days) → deliverylead (sprint-quarter) → cxotech (strategic 6-18mo)
  - Synced 28 files: schemas, config/classifiers, docs/standards
  - Updated PROVENANCE.md to track v0.1.10 (commit c52fc1bf3ecb)
  - Minimum goneat version bumped to v0.5.3 for JSON Schema 2019-09 support

### Changed

- **Schema validation**: All role files now validate against updated schema with domains requirement
- **Upstream provenance**: Bumped from v0.1.6 to v0.1.10

## [0.4.10] - 2026-02-04

### Added

- **Documentation Improvements for Upstream Sync**: Enhanced agent-facing documentation to clarify bidirectional repository relationship

  - Added "Repository Relationship" section to AGENTS.md explaining fulmenhq/crucible vs 3leaps/crucible
  - Updated Quick Reference table in AGENTS.md with `make upstream-sync-3leaps` entry
  - Enhanced DO/DO NOT section with explicit upstream sync guidance and link to consumer guide
  - Added bidirectional relationship context to `docs/architecture/sync-model.md`
  - Added upstream sync to high-risk operations table in `docs/sop/repository-operations-sop.md`
  - Added clarifying comments to Makefile `upstream-sync-3leaps` target
  - Prevents confusion between two crucible repositories (3leaps vs fulmenhq)

- **3leaps/crucible Upstream Sync Infrastructure**: Automated sync tooling for galaxy-level standards

  - `scripts/3leaps-crucible-upstream-pull.ts` - Bun/TypeScript sync script with dry-run support
  - `make upstream-sync-3leaps` - Sync and validate in one command
  - `make upstream-check` - Check upstream content for format/lint issues (no auto-fix)
  - New directory structure: `schemas/upstream/<org>/<repo>/` for clear provenance
  - Synced content mirrors source structure: `schemas/`, `config/`, `docs/` subdirectories
  - PROVENANCE.md tracks source tag, commit, and date for audit trail

- **Data Classification Framework** (from 3leaps/crucible v0.1.6): Enterprise-grade classification dimensions

  - **7 classifier dimension definitions** (`config/classifiers/dimensions/`)
    - `sensitivity` - Data sensitivity levels (UNKNOWN through 6-eyes-only)
    - `volatility` - Update cadence (static → streaming)
    - `access-tier` - Distribution control (public → eyes-only)
    - `retention-lifecycle` - Retention policy (transient → legal-hold)
    - `schema-stability` - Schema evolution stage (experimental → deprecated)
    - `volume-tier` - Data scale planning (tiny → massive)
    - `velocity-mode` - Processing pattern (batch/streaming/hybrid)
  - **Classification meta-schemas** (`schemas/classifiers/v0/`)
    - `dimension-definition.schema.json` - Meta-schema for classifier dimensions
    - `sensitivity-level.schema.json` - Sensitivity enum schema
  - **8 classification standards** (`docs/standards/`)
    - Decision trees, handling matrices, and operational guidance per dimension
  - **Classifiers catalog** (`docs/catalog/classifiers/`)
  - Policy stance: Missing classification is an error; explicit `unknown` required

- **Foundation Schemas** (from 3leaps/crucible v0.1.6): Universal type primitives

  - `types.schema.json` - 25 portable types (slug, semver, timestamp, URL, paths, etc.)
  - `error-response.schema.json` - Standard error structure for APIs and CLIs
  - `lifecycle-phases.schema.json` - Project maturity phases
  - `release-phase.schema.json` - Release cadence (dev, rc, ga, hotfix)

- **Release Engineering Role**: New `releng` agentic role for release coordination with CI/CD validation
  - `config/agentic/roles/releng.yaml` - Full role definition
  - Version management and semantic versioning enforcement
  - Changelog and release notes maintenance
  - CI/CD workflow validation before push (actionlint, shellcheck)
  - Platform matrix enforcement and runner availability verification
  - Cross-repository release coordination
  - Key distinction: releng orchestrates releases while cicd handles mechanical execution

### Changed

- **Updated 3leaps/crucible to v0.1.6**: Synced latest upstream schemas and role definitions

  - Updated role-prompt.schema.json with new role categories: `analytics`, `consulting`, `marketing`
  - Added README.md to agentic schemas documentation
  - Updated PROVENANCE.md to track v0.1.6 (commit e2812cd)

- **Upstream Content Location**: Restructured from flat to hierarchical
  - Old: `schemas/upstream/3leaps/{ailink,agentic}/`
  - New: `schemas/upstream/3leaps/crucible/{schemas,config,docs}/`
  - Enables future multi-repo upstream support with clear provenance
  - Updated all path references in Makefile and documentation

### Removed

- **Legacy Role-Prompt Schema**: `schemas/upstream/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json`
  - Role definitions now sourced from 3leaps/crucible upstream
  - Local vendored schema no longer needed

## [0.4.9] - 2026-01-22

### Added

- **JSON Schema Meta-Schema Expansion**: Full draft coverage for offline schema validation

  - `schemas/meta/draft-04/schema.json` - Draft-04 meta-schema (single-file, uses `id`)
  - `schemas/meta/draft-06/schema.json` - Draft-06 meta-schema (single-file, introduced `$id`, `const`)
  - `schemas/meta/draft-2019-09/schema.json` - Draft 2019-09 with modular vocabulary refs
  - `schemas/meta/draft-2019-09/offline.schema.json` - Subset for offline validation (no external refs)
  - `schemas/meta/draft-2019-09/meta/` - Modular vocabularies (core, applicator, validation, meta-data, format, content)
  - `schemas/meta/fixtures/` - Test fixtures for all five drafts (draft-04 through draft-2020-12)
  - Aligns with goneat v0.5.2 meta-schema expansion
  - Enables helper libraries to implement MetaSchemaRegistry API
  - Supports SchemaStore and legacy tooling validation without network access
  - Updated `schemas/meta/README.md` with draft selection guidance table
  - Synced to Python, TypeScript, and Rust wrappers

- **Fulencode Module Contracts**: SSOT schemas for encoding/decoding/normalization operations
  - **Method option schemas** (`schemas/library/fulencode/v1.0.0/`):
    - `encode-options.schema.json`, `decode-options.schema.json`
    - `detect-options.schema.json`, `normalize-options.schema.json`
  - **Result schemas**:
    - `encoding-result.schema.json`, `decoding-result.schema.json`
    - `detection-result.schema.json`, `normalization-result.schema.json`
    - `bom-result.schema.json`
  - **Error envelope**: `fulencode-error.schema.json`
  - **Parity test fixtures** (`config/library/fulencode/fixtures/`):
    - `valid-encodings/base64.yaml`, `invalid-encodings/base64.yaml`
    - `bom/bom.yaml`, `detection/detection.yaml`
    - `normalization/text-safe.yaml`, `telemetry/telemetry-test-cases.yaml`
  - **text_safe normalization profile** (`docs/standards/library/modules/fulencode-text-safe.md`):
    - Security-focused profile for log-safe and UI-safe text
    - Prevents bidi injection, zero-width hiding, control character attacks
    - Deterministic algorithm: NFC → reject disallowed → combining mark cap

## [0.4.8] - 2026-01-19

### Fixed

- **Biome Schema Version**: Updated `biome.json` schema from 2.3.2 to 2.3.10 to match CLI
- **Lang Sync Process**: Added explicit `sync-to-lang` dependency to `precommit` target
  - Ensures synced assets in `lang/*/config/` are current before commits
  - Fixes gap where v0.4.7 tag was missing `qa.yaml` in lang directories

## [0.4.7] - 2026-01-19

### Added

- **Quality Assurance Role**: New `qa` agentic role for testing and validation
  - `config/agentic/roles/qa.yaml` - Full role definition
  - Layer-cake validation across Crucible SSOT, helper libraries, and templates
  - Coverage targets by language: Go ≥95%, TypeScript ≥85%, Python ≥90%
  - Fixture-based integration testing emphasis (real execution over mocks)
  - Dogfooding workflows and acceptance testing patterns
  - Quality gate enforcement via goneat/fulward
  - Escalation paths to devlead, secrev, entarch, and human maintainers
