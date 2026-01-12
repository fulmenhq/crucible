# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Versions 0.1.0 through 0.1.4 were originally released with CalVer tags (v2025.10.1 through v2025.10.5). Retroactive SemVer tags have been added for migration continuity. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for details.

**Retention Policy**: This file contains the 10 most recent releases plus `[Unreleased]`. Older entries are preserved in individual `release-notes/v*.md` files. This policy keeps the changelog navigable while maintaining complete history in the release-notes archive.

## [Unreleased]

## [0.4.6] - 2026-01-12

### Added

- **OpenAPI Spec Coverage Standard**: Ecosystem-wide standard for OpenAPI documentation verification
  - `docs/architecture/decisions/ADR-0014-openapi-spec-coverage.md` - Decision record
  - Tiered requirements: Fixtures MUST, Workhorses SHOULD, DX tools MAY
  - Coverage test pattern comparing router registrations to spec paths
  - Intentional exclusions for experimental, internal, and self-referential endpoints
  - CI workflow integration guidance (`make openapi` before `make test`)
  - Swagger 2 and OpenAPI 3 compatibility
  - Release asset guidance for `dist/release/` inclusion
  - Provenance metadata via `info.x-*` extensions

- **OpenAPI Publication Section**: Added to Fixture Standard (`fulmen-fixture-standard.md`)
  - MUST requirements: generation, serving, coverage test, CI workflow
  - Build artifact patterns: `dist/` (gauntlet) and embedded (rampart) both acceptable
  - Coverage test implementation guidance
  - Cross-links to ADR-0014 and HTTP Server Patterns

- **OpenAPI Verification Section**: Added to HTTP Server Patterns guide
  - Spec drift problem statement
  - Coverage test implementation pattern with Go example
  - CI integration snippet
  - Intentional exclusions guidance

### Changed

- **HTTP REST Standard**: Added OpenAPI Documentation section
  - SHOULD publish spec for HTTP APIs
  - Generator and serving recommendations
  - Coverage testing reference

- **Workhorse Standard**: Added `/openapi.yaml` endpoint and ADR-0014 reference
  - SHOULD for workhorses exposing HTTP APIs

- **Codex Standard**: Added cross-link in Pillar III
  - Upstream spec quality expectation for ingested OpenAPI specs

- **Fixture Author Conformance Checklist**: Added OpenAPI items
  - OpenAPI spec generated and served
  - Coverage test passes

## [0.4.5] - 2026-01-10

### Added

- **TUI Design System Schemas**: Layered architecture for terminal UI theming
  - Core semantic vocabulary (`schemas/design/core/v1.0.0/`)
    - `semantic-colors.schema.json` - Color roles (primary, secondary, success, etc.) with WCAG contrast
    - `spacing-scale.schema.json` - Spacing tokens (xs through xl) with responsive tiers
    - `typography-roles.schema.json` - Text roles (headline, body, caption, code)
    - `component-states.schema.json` - UI states (default, hover, focus, disabled)
  - TUI implementation (`schemas/design/tui/v1.0.0/`)
    - `theme.schema.json` - Root composition aggregating all TUI schemas
    - `color-palette.schema.json` - Terminal colors with fallback chains (truecolor → 256 → 16 → basic)
    - `typography.schema.json` - Charset support, glyphs, CJK width handling, Nerd Font detection
    - `layout.schema.json` - Cell-based dimensions, responsive breakpoints, ribbons
    - `component.schema.json` - Widget patterns with state styling, extensible via additionalProperties
  - Reference themes (`examples/design/tui/v1.0.0/themes/`)
    - `dark.yaml` - Tokyo Night-inspired, WCAG AA compliant
    - `light.yaml` - Balanced light mode for daytime use, WCAG AA compliant
    - `high-contrast.yaml` - WCAG AAA compliant, ASCII-safe for maximum accessibility
  - Schema fixtures (`examples/design/tui/v1.0.0/{valid,invalid}/`)
  - Architecture README (`schemas/design/README.md`)
  - Designed for future `design/web/` parallel implementation

- **Standards Discoverability Architecture**: Guides now serve as compliance routing documents
  - `docs/guides/testing/README.md` - Testing guides family index
  - `docs/guides/testing/http-server-patterns.md` - Server/fixture implementation patterns with compliance checklists
  - `docs/guides/testing/http-client-patterns.md` - Client testing patterns with fixture usage
  - Compliance Requirements sections with explicit "read these standards first" lists
  - Pre-Implementation and Pre-Review checklists for devlead and devrev roles

- **Work-Type Standards Routing**: AGENTS.md now includes routing table
  - Maps work types (HTTP server, HTTP client, CLI, fixture, schema, release) to required reading
  - Enables agents and developers to discover applicable standards before implementation
  - "How to Use This Table" workflow guidance

- **HTTP Server Anti-Patterns Documentation**: Go-specific patterns from fixture development
  - `json.Encoder.Encode()` error handling after `WriteHeader()`
  - Response body close patterns with per-file test helpers
  - Context-aware delay handlers (no bare `time.Sleep()`)
  - Body limits and safe reads with `io.LimitReader`
  - Derived from 25+ lint fixes during rampart/gauntlet development

- **HTTP Client Testing Patterns**: Comprehensive fixture-based testing guide
  - Timeout tier testing (connect vs header vs body)
  - Redirect handling with loop detection
  - Retry and backoff behavior patterns
  - Auth failure handling (401 vs 403 semantics)
  - Streaming and chunked response testing
  - Multi-language examples (Go, Python, TypeScript, Rust)

- **Cross-Linking**: Updated related documents with bidirectional links
  - `docs/standards/testing/README.md` - Links to testing guides
  - `docs/standards/coding/go.md` - Section 8 links to HTTP server patterns
  - `docs/architecture/fulmen-fixture-standard.md` - Links to both testing guides
  - `docs/standards/protocol/http-rest-standards.md` - Links to both testing guides
  - `docs/guides/README.md` - New Testing section with guide descriptions

- **UX Developer Role**: New `uxdev` agentic role for frontend development
  - `config/agentic/roles/uxdev.yaml` - Full role definition
  - Covers TUI (tview, textual, ink/opentui, ratatui) and web (React, Vue, Svelte, HTMX)
  - Accessibility-first mindset with WCAG 2.1 AA compliance focus
  - Component, TUI-specific, and web-specific checklists
  - Tools reference for major frameworks across languages
  - Patterns for Model-View-Update, component composition, focus management

### Changed

- **Document Taxonomy Clarified**: Three distinct document types now formalized
  - Standards: Normative requirements (MUST/SHOULD)
  - Guides: Compliance routing + practical examples
  - Architecture: System structure and rationale

## [0.4.4] - 2026-01-08

### Added

- **Signal Resolution Standard**: Ergonomic signal name resolution interfaces for helper libraries
  - `resolveSignal(name)` - normalize and lookup (exact, numeric, case-insensitive, ID fallback)
  - `listSignalNames()` - enumerate for CLI completion
  - `matchSignalNames(pattern)` - glob matching with `*` and `?` wildcards
  - `docs/standards/library/foundry/interfaces.md` - Signal Resolution section
  - `config/library/foundry/signal-resolution-fixtures.yaml` - 41 cross-language test vectors
  - `schemas/library/foundry/v1.0.0/signal-resolution-fixtures.schema.json` - Fixture validation
  - Origin: rsfulmen memo 2026-01-08, standardized for ecosystem-wide adoption

- **Signals Documentation**: Comprehensive signals section in Foundry README
  - `docs/standards/library/foundry/README.md` - Full Signals section
  - Catalog overview, behaviors, platform support, helper library integration
  - Resolution algorithm, glob matching, Windows fallbacks
  - Testing requirements for signal fixtures

### Changed

- **Resolution Algorithm**: 7-step resolution order with numeric support
  - Step 4: Numeric lookup by `unix_number` (e.g., `"15"` → SIGTERM)
  - Negative numbers explicitly not supported (`"-15"` → null)
  - Whitespace trimming before numeric detection

## [0.4.3] - 2026-01-07

### Added

- **Ecosystem Brand Summary**: Added `config/branding/ecosystem.yaml` for consistent brand context
  - Accessible via helper libraries: `crucible.GetBrandSummary()`
  - Displayed by `<binary> version --extended`
  - Includes short, extended, and full summaries plus structured metadata

- **Fixture Catalog**: Registered `rampart` proving fixture for HTTP protocol testing
  - `fixture-server-proving-rampart-001`: Core HTTP/1.1 scenarios
  - `fixture-server-proving-rampart-002`: HTTP/2 extended (planned)
  - `fixture-server-proving-rampart-003`: Performance/throughput (planned)

### Changed

- **Fixture Naming Convention**: Variant codes are now explicitly required
  - No implicit `-001` default - all fixture names must include the 3-digit variant suffix
  - Prevents breaking changes when adding variants (no retroactive renames)
  - Catalog entry required before repository creation
  - Binary naming: Use `<name>` only (e.g., `rampart`), variant is metadata not identity

### Fixed

- **Python Foundry Module Export Mismatch**: Fixed `lang/python/src/crucible/foundry/__init__.py` to export correct API
  - `__init__.py` was exporting non-existent symbols (`EXIT_CODES`, `EXIT_CODES_BY_NAME`, `get_exit_code`, `get_exit_code_by_name`)
  - Caused `ImportError: cannot import name 'EXIT_CODES' from 'crucible.foundry.exit_codes'`
  - Now exports actual `exit_codes.py` API: `EXIT_CODE_METADATA`, `EXIT_CODES_VERSION`, `ExitCode`, `ExitCodeInfo`, `SimplifiedMode`, `get_detailed_codes`, `get_exit_code_info`, `get_exit_codes_version`, `map_to_simplified`
  - Affected versions: v0.4.1, v0.4.2
  - Reported by pyfulmen team

## [0.4.2] - 2026-01-07

### Added

- **Fixture Standard**: New repository category and standard for test infrastructure
  - `docs/architecture/fulmen-fixture-standard.md` - Full specification
  - `config/taxonomy/fixture-catalog.yaml` - Registry for fixture names and variants
  - `schemas/taxonomy/fixture/v1.0.0/fixture-catalog.schema.json` - Catalog validation
  - `docs/standards/repository-category/fixture/README.md` - Category requirements
  - Naming pattern: `fixture-<mode>-<category>-<name>-<variant>`
  - Modes: `server`, `client`, `datastore` (v0.4.2), `identity` (planned v0.4.3)
  - Categories: `proving`, `utility`, `chaos`
  - Required `INTEGRATION.md` template for external dependencies
  - i18n support for fixture metadata (`default_lang`, `*_i18n` fields)
- **Doc-Host Category**: New repository category for path-addressed documentation hosting
  - `docs/standards/repository-category/doc-host/README.md`
  - Complements spec-host (self-describing specs) with path-addressed assets

### Changed

- **Canonical URI Resolution Standard** (BREAKING): Schema `$id` values now include module prefix
  - Pattern: `https://schemas.fulmenhq.dev/crucible/<topic>/<version>/<filename>`
  - ~63 schemas updated to include `crucible/` module prefix
  - Enables multi-repo schema hosting without namespace collisions
  - See `docs/standards/publishing/canonical-uri-resolution.md`
- **Repository Categories Taxonomy**: Version bumped to `2026.01.1`
  - Added `fixture` category with modes, behavioral categories, naming constraints
  - Added `doc-host` category

### Removed

- **Enact Schemas**: Moved to enacthq organization (11 files)
- **Goneat Schemas**: Moved to goneat repository (6 files)

### Fixed

- **Python Exit Codes Path Alignment**: Fixed codegen output path for Python exit codes
  - Changed from `lang/python/src/pyfulmen/foundry/` to `lang/python/src/crucible/foundry/`
  - Aligns with pattern used by other Python modules (`fulencode`, `fulhash`, `fulpack`)
  - Updated `scripts/codegen/exit-codes/metadata.json` Python output path
  - Created `lang/python/src/crucible/foundry/` module with `__init__.py`
  - Removed legacy `lang/python/src/pyfulmen/` directory tree

## [0.4.1] - 2026-01-06

### Changed

- **Similarity Module Relocation**: Moved similarity files from `library/foundry/` to `library/similarity/`
  - `config/library/foundry/similarity-fixtures.yaml` → `config/library/similarity/fixtures.yaml`
  - `schemas/library/foundry/v{1,2}.0.0/similarity.schema.json` → `schemas/library/similarity/`
  - `docs/standards/library/foundry/similarity.md` → `docs/standards/library/similarity/`
  - Schema `$id` updated from `foundry` to `similarity` namespace
- **Go Config API**: Added `ConfigRegistry.Library().Similarity().Fixtures()`
  - `Foundry().SimilarityFixtures()` deprecated but still works (points to new location)
- **Module Registry**: Updated evidence paths in `platform-modules/v1.1.0/modules.yaml`

## [0.4.0] - 2026-01-05

### Added

- **Module Registry v1.1.0**: Weight classification and feature gate support for helper library modules
  - `weight` field (light/heavy) for dependency footprint classification
  - `default_inclusion` field for feature gate defaults
  - Per-language `notes` field for build-specific guidance
  - Optional Rust language support in module schema
  - New schemas at `schemas/taxonomy/library/modules/v1.1.0/module-entry.schema.json`
- **Foundry Catalog Registry v1.1.0**: Feature gate mapping for reference data catalogs
  - `weight`, `default_inclusion`, `feature_group` fields
  - New schema at `schemas/taxonomy/library/foundry-catalogs/v1.1.0/catalog-entry.schema.json`
- **Similarity Module**: Promoted from foundry-catalogs to standalone platform module
  - Now in `config/taxonomy/library/platform-modules/v1.1.0/modules.yaml`
  - Removed from foundry-catalogs (reduces catalog surface to 6 entries)
- **Module Registry Standard**: New documentation for weight classification semantics
  - `docs/standards/fulmen/module-registry.md`
  - Serde-class exemption lists per language
  - Heavy trigger dependency lists per language
  - Library feature gate mapping patterns (Cargo, extras, entry points)
- **Product Marketing Role**: New `prodmktg` agentic role for messaging, personas, and branding
  - `config/agentic/roles/prodmktg.yaml`
  - New `marketing` category in role-prompt schema

### Fixed

- **Schema $id Host**: Corrected `$id` from `fulmenhq.dev` to `schemas.fulmenhq.dev`
  - Aligns with rsfulmen's offline schema resolver expectations
  - Affects both v1.1.0 module and catalog schemas

## [0.3.2] - 2026-01-05

### Added

- **SIGKILL Signal Entry**: Added SIGKILL as first-class signal in `config/library/foundry/signals.yaml`
  - Full signal metadata: id `kill`, unix_number 9, default_behavior `immediate_exit`, exit_code 137
  - Platform support entry (native on Unix, mapped to TerminateProcess on Windows)
  - Exit code mapping in signals.yaml `exit_codes` section
  - Usage notes documenting last-resort semantics and Windows equivalents
- **Shell Exit Codes (124-127)**: New `shell` category in `config/library/foundry/exit-codes.yaml`
  - `EXIT_TIMEOUT` (124): Command timed out (GNU timeout)
  - `EXIT_TIMEOUT_INTERNAL` (125): Timeout utility itself failed
  - `EXIT_CANNOT_EXECUTE` (126): Command found but not executable
  - `EXIT_NOT_FOUND` (127): Command not found in PATH
  - Updated `simplified_modes` mappings to include new codes

### Fixed

- **Sync Keys Schema Drift**: Added optional `metadata` property to `schemas/config/sync-keys.schema.yaml`
  - Schema had `additionalProperties: false` but data contained `metadata` objects
  - Documented reserved keys: `sourceRepo`, `sourcePathBase`, `notes`
  - Preserves extensibility with `additionalProperties: true` on metadata object
  - Unblocks offline schema validation in rsfulmen and other consumers

## [0.3.1] - 2026-01-03

### Fixed

- **Patterns Catalog Examples**: Corrected invalid examples in `config/library/foundry/patterns.yaml`
  - `jwt`: Replaced placeholder ellipsis (`...`) with valid JWT compact serialization
  - `uuid-v4`: Fixed example from v1 format (`12d3`) to valid v4 format (`42d3` with version nibble = 4)
  - Issue discovered during rsfulmen patterns module audit

### Changed

- **ADR-0012 Status**: Updated schema reference resolution ADR status from "proposed" to "implemented"
- **CI Workflow YAML**: Removed duplicate document start markers from workflow files (yamllint compliance)

---

**Older Releases**: For versions prior to 0.3.1, see individual release notes in `release-notes/v*.md`.
