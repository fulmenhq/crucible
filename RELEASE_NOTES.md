# Release Notes

This file contains release notes for three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.10 - 3leaps/crucible Sync & Release Engineering Role

Brings galaxy-level data classification frameworks and release engineering infrastructure to the Fulmen ecosystem, adding the `releng` agentic role for orchestrating releases with CI/CD validation. Includes v0.1.6 update from upstream with enhanced role categories and improved documentation clarity.

### Why This Matters

**For data governance**: The 3leaps/crucible upstream provides enterprise-grade classification frameworks that define how data sensitivity, volatility, access control, retention, schema stability, volume, and processing velocity should be handled across the ecosystem. These are the building blocks for implementing GDPR, SOC2, and other compliance frameworks.

**For release quality**: The `releng` role ensures every release follows rigorous validation before pushing—checking workflows with actionlint, verifying runner availability, confirming platform matrix consistency, and requiring all changes to be documented in the changelog.

### Highlights

- **Documentation Improvements**: Clear distinction between fulmenhq/crucible and 3leaps/crucible repositories
- **Updated Upstream (v0.1.6)**: Latest schemas with expanded role categories (analytics, consulting, marketing)
- **Data Classification Framework**: 7 enterprise-grade classifier dimensions for data governance
- **Foundation Schemas**: Universal type primitives used across all FulmenHQ tools
- **Automated Upstream Sync**: One-command sync from 3leaps/crucible with validation
- **Release Engineering Role**: CI/CD-aware release coordination with quality gate enforcement
- **Provenance Tracking**: Audit trail for all vendored upstream content

### Added - Documentation Improvements

Enhanced agent-facing documentation to prevent confusion between the two crucible repositories:

- **AGENTS.md Updates**:
  - New "Repository Relationship" section explaining fulmenhq/crucible vs 3leaps/crucible
  - Added `make upstream-sync-3leaps` to Quick Reference table
  - Enhanced DO/DO NOT section with explicit upstream sync guidance
  - Links to [Upstream Sync Consumer Guide](docs/ops/upstream-sync-consumer.md)

- **Architecture Documentation**:
  - Added bidirectional relationship context to `docs/architecture/sync-model.md`
  - Clarifies consumer (from 3leaps) vs producer (to downstream) roles

- **Operations Documentation**:
  - Added upstream sync to high-risk operations table in `docs/sop/repository-operations-sop.md`
  - Includes protocol for reviewing upstream changes and handling breaking changes

- **Makefile Clarity**:
  - Added informative comments to `upstream-sync-3leaps` target
  - Explains vendored content destination

### Added - 3leaps/crucible Sync

- **Upstream Sync Tooling** (`scripts/3leaps-crucible-upstream-pull.ts`)
  - Bun/TypeScript sync script with dry-run support
  - Pulls from local 3leaps/crucible checkout to `schemas/upstream/3leaps/crucible/`
  - Mirrors source structure: `schemas/`, `config/`, `docs/` subdirectories
  - PROVENANCE.md tracks source tag, commit, and date for audit trail

- **Make Targets**
  - `make upstream-sync-3leaps` - Sync and validate in one command
  - `make upstream-check` - Check upstream content for format/lint issues (no auto-fix)
  - New directory structure: `schemas/upstream/<org>/<repo>/` for clear provenance

### Changed - Updated to 3leaps/crucible v0.1.6

- **Enhanced Role Categories**: role-prompt.schema.json now includes:
  - `analytics` - Data analysis and insights roles
  - `consulting` - Advisory and strategic guidance roles
  - `marketing` - Content and outreach roles
  - (In addition to existing: agentic, automation, governance, review)

- **Documentation**: Added README.md to `schemas/agentic/v0/` with usage guidance

- **Provenance**: Updated to track v0.1.6 (commit e2812cd84cec)

### Added - Data Classification Framework

From 3leaps/crucible v0.1.6:

- **7 Classifier Dimension Definitions** (`config/classifiers/dimensions/`)
  - `sensitivity` - Data sensitivity levels (UNKNOWN through 6-eyes-only)
  - `volatility` - Update cadence (static → streaming)
  - `access-tier` - Distribution control (public → eyes-only)
  - `retention-lifecycle` - Retention policy (transient → legal-hold)
  - `schema-stability` - Schema evolution stage (experimental → deprecated)
  - `volume-tier` - Data scale planning (tiny → massive)
  - `velocity-mode` - Processing pattern (batch/streaming/hybrid)

- **Classification Meta-Schemas** (`schemas/classifiers/v0/`)
  - `dimension-definition.schema.json` - Meta-schema for classifier dimensions
  - `sensitivity-level.schema.json` - Sensitivity enum schema

- **8 Classification Standards** (`docs/standards/`)
  - Decision trees, handling matrices, and operational guidance per dimension
  - Cross-links to compliance frameworks (GDPR, SOC2)

- **Classifiers Catalog** (`docs/catalog/classifiers/`)
  - Policy stance: Missing classification is an error; explicit `unknown` required

### Added - Foundation Schemas

From 3leaps/crucible v0.1.5:

- `types.schema.json` - 25 portable types (slug, semver, timestamp, URL, paths, etc.)
- `error-response.schema.json` - Standard error structure for APIs and CLIs
- `lifecycle-phases.schema.json` - Project maturity phases
- `release-phase.schema.json` - Release cadence (dev, rc, ga, hotfix)

### Added - Release Engineering Role

- **Role Definition** (`config/agentic/roles/releng.yaml`)
  - Version management (semantic versioning enforcement)
  - Changelog and release notes maintenance
  - Tag and branch management
  - Cross-repository release coordination
  - CI/CD workflow validation before push (actionlint, shellcheck)
  - Platform matrix enforcement and runner availability verification
  - Verify local/remote sync before running release workflows

- **Key Distinction**: releng orchestrates releases while cicd handles mechanical execution
  - releng = "Should we release? What version? Is everything validated?"
  - cicd = "How do we build? What runners? What workflow syntax?"

### Changed

- **Upstream Content Location**: Restructured from flat to hierarchical
  - Old: `schemas/upstream/3leaps/{ailink,agentic}/`
  - New: `schemas/upstream/3leaps/crucible/{schemas,config,docs}/`
  - Enables future multi-repo upstream support with clear provenance

### Removed

- **Legacy Role-Prompt Schema**: `schemas/upstream/3leaps/crucible/schemas/agentic/v0/role-prompt.schema.json`
  - Role definitions now sourced from 3leaps/crucible upstream
  - Local vendored schema no longer needed

See [release-notes/v0.4.10.md](release-notes/v0.4.10.md) for details.

---

## v0.4.9 - JSON Schema Meta-Schema Expansion & Fulencode Contracts

Two major additions: complete offline JSON Schema validation coverage (Draft-04 through Draft-2020-12) and implementable contracts for the Fulencode encoding/normalization module.

### Why This Matters

**For schema validation**: Helper libraries need to validate schemas during development and CI without reaching out to json-schema.org. With this release, FulmenHQ tools can validate Draft-04 through Draft-2020-12 schemas entirely offline—supporting legacy SchemaStore compatibility, modern tooling, and everything in between.

**For encoding operations**: The Fulencode module now has complete SSOT contracts—option schemas, result schemas, error envelopes, and parity test fixtures. Helper library teams can implement with confidence that cross-language behavior will be consistent.

### Highlights

- **Full JSON Schema Draft Coverage**: Draft-04, Draft-06, Draft-07, Draft 2019-09, Draft 2020-12
- **MetaSchemaRegistry API**: Helper libraries can implement consistent meta-schema discovery
- **Fulencode Method Contracts**: 11 schemas defining encode/decode/detect/normalize operations
- **Cross-Language Parity Fixtures**: Test vectors for both meta-schema detection and encoding operations
- **text_safe Profile**: Security-focused normalization preventing bidi/zero-width attacks

### Added - Meta-Schemas

- `schemas/meta/draft-04/schema.json` - Draft-04 (uses `id` instead of `$id`)
- `schemas/meta/draft-06/schema.json` - Draft-06 (introduced `$id`, `const`)
- `schemas/meta/draft-2019-09/schema.json` - Full meta-schema with vocabulary refs
- `schemas/meta/draft-2019-09/offline.schema.json` - Offline subset
- `schemas/meta/draft-2019-09/meta/` - Modular vocabularies (core, applicator, validation, etc.)
- `schemas/meta/fixtures/` - Test fixtures for all five drafts
- `schemas/meta/README.md` - Draft selection guidance table

### Added - Fulencode

- **Method schemas** (`schemas/library/fulencode/v1.0.0/`): encode-options, decode-options, detect-options, normalize-options
- **Result schemas**: encoding-result, decoding-result, detection-result, normalization-result, bom-result
- **Error envelope**: fulencode-error.schema.json
- **Parity fixtures** (`config/library/fulencode/fixtures/`): base64, bom, detection, normalization, telemetry
- **text_safe profile** (`docs/standards/library/modules/fulencode-text-safe.md`): Security-focused normalization

### Coming Next

- **Data Classification Sync**: Classifier dimensions from 3leaps/crucible v0.1.4

See [release-notes/v0.4.9.md](release-notes/v0.4.9.md) for details.

---

## v0.4.8 - Process Fix

Fixes sync process gap from v0.4.7 release.

### Fixed

- **Biome Schema**: Updated to 2.3.10 (was 2.3.2)
- **Precommit Sync**: Added `sync-to-lang` as explicit dependency of `precommit` target
  - v0.4.7 tag was missing `qa.yaml` in `lang/*/config/` due to sync running after tagging
  - Now ensures lang directories are current before any commit

See [release-notes/v0.4.8.md](release-notes/v0.4.8.md) for details.
