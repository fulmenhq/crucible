# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Versions 0.1.0 through 0.1.4 were originally released with CalVer tags (v2025.10.1 through v2025.10.5). Retroactive SemVer tags have been added for migration continuity. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for details.

## [Unreleased]

## [0.2.6] - 2025-11-05

### Added

- **Platform Introspection API**: Added `supports_signal()` API requirement to signal handling module standard
  - Enables runtime platform detection before signal registration
  - Allows conditional logic based on platform capabilities
  - Supports cross-platform testing with deterministic behavior
  - API contract documented for Go, Python, TypeScript
  - Usage examples with Unix vs Windows conditional logic

### Fixed

- **Missing Foundry Config Accessors**: Added missing `Signals()` and `ExitCodes()` methods to `FoundryConfig` in `config.go`
  - `Signals()` returns signals catalog from `config/library/foundry/signals.yaml`
  - `ExitCodes()` returns exit codes catalog from `config/library/foundry/exit-codes.yaml`
  - Enables helper libraries (gofulmen, pyfulmen, tsfulmen) to load catalogs via Crucible embed
  - Added comprehensive test coverage for new accessors

## [0.2.5] - 2025-11-05

### Added

- **Signal Handling Module**: Standardized cross-language signal handling for Fulmen ecosystem
  - Signal catalog: `config/library/foundry/signals.yaml` (8 standard signals: TERM, INT, HUP, QUIT, PIPE, ALRM, USR1, USR2)
  - Schema: `schemas/library/foundry/v1.0.0/signals.schema.json`
  - Module standard: `docs/standards/library/modules/signal-handling.md`
  - OS mappings: Unix signals → Windows console events with fallback strategy
  - Ctrl+C double-tap pattern (2s debounce window, graceful first / force second)
  - Restart-based config reload with mandatory schema validation
  - HTTP signal endpoint specification (`POST /admin/signal`)
  - Exit code integration (128+N POSIX pattern)
  - Platform support matrix (Linux, macOS, FreeBSD, Windows)
  - 6 behavior definitions: graceful_shutdown, graceful_shutdown_with_double_tap, reload_via_restart, immediate_exit, custom, observe_only
- **Signal Fixtures**: Test fixtures for validation and parity testing
  - Valid fixtures: minimal, complete, custom-behavior
  - Invalid fixtures: missing-required, invalid-behavior, invalid-exit-code, malformed
  - Parity snapshot: `config/library/foundry/fixtures/signals/parity-snapshot.json`
- **Windows Fallback Strategy**: Comprehensive Windows support documentation
  - Standardized logging contract (INFO level, structured template)
  - Standardized telemetry contract (`fulmen.signal.unsupported` with required tags)
  - Fallback behavior types: http_admin_endpoint, exception_handling, timer_api
  - Operation hints for Windows users (Unix vs Windows command examples)
  - HTTP `/admin/signal` minimum spec (auth, rate limiting, request/response contracts)
- **Windows Testing Strategy**: Testing requirements without mandatory CI runners
  - Required test coverage: unsupported signal registration, HTTP endpoint functional test, platform detection
  - Windows simulation tests sufficient for v0.2.5
  - Manual verification required per release
- **Signal Support Introspection**: API requirement for platform detection
  - Helper libraries must expose `supports_signal(signal_name) -> bool`
  - Enables apps to gate optional features, show platform-specific guidance
- **Required Hook Methods**: Table of helper library API requirements
  - Hook methods for each behavior identifier (on_shutdown, force_exit, etc.)
  - Language-specific naming conventions (Go, Python, TypeScript)
  - Testing utilities (inject_signal_for_test)
- **FulmenHQ Memo**: Windows limitations documentation
  - Memo: `.plans/memos/fulmenhq/20251104-signal-handling-introduction.md`
  - Requesting stakeholder feedback on Windows fallback approach
  - Open questions for enterprise Windows deployments

### Changed

- **Exit Codes Catalog**: Added signal-induced exit codes with cross-references
  - SIGUSR1: 138 (128 + 10, corrected from 148)
  - SIGUSR2: 140 (128 + 12, corrected from 144)
  - Cross-references to signals.yaml for behavioral context
  - Platform note: macOS/FreeBSD use signal numbers 30/31 for USR1/USR2
- **Schema Validation**: Added signal catalog validation to `scripts/validate-schemas.ts`
  - Validates signal catalog structure, OS mappings, behavior definitions
  - Cross-validates exit codes (128+N pattern consistency)
  - Validates platform-specific signal number overrides
- **.goneatignore**: Added `config/library/foundry/fixtures/signals/invalid/` to exclude intentionally malformed fixtures from formatting

### Fixed

- **Exit Code Corrections**: Fixed SIGUSR1/SIGUSR2 exit codes to match POSIX 128+N pattern with correct base signal numbers

## [0.2.4] - 2025-11-04

### Added

- **App Identity Module**: Schema-driven application identity metadata for Fulmen ecosystem
  - Schema: `schemas/config/repository/app-identity/v1.0.0/app-identity.schema.json`
  - Documentation: `docs/standards/library/modules/app-identity.md`
  - Example config: `config/repository/app-identity/app-identity.example.yaml`
  - Valid fixtures: minimal, complete, monorepo (api/worker)
  - Invalid fixtures: missing required, invalid patterns, malformed YAML
  - Canonical parity snapshot for cross-language test validation
  - Discovery precedence: explicit → env → ancestor → test injection
  - Dependency layering: Layer 0 (zero Fulmen dependencies)
  - Runtime caching guarantees (read-once per process)
  - Library implementation patterns for Go, Python, TypeScript
  - CDRL workflow integration
- **Schema Export Enhancement**: Specification for helper libraries to export Crucible assets
  - Three provenance modes: $comment, compatible (sibling), sidecar
  - Cross-language asset source abstraction (Go embed vs TS/Python sync)
  - CLI entry points documented for each language
  - App Identity auto-integration when `.fulmen/app.yaml` present
  - Safety guards against Crucible directory pollution
  - Feature brief: `.plans/active/v0.2.4/schema-export-enhancement-feature-brief.md`
- **Sync Configuration**: App Identity module sync keys for schema and fixture distribution across language wrappers

### Changed

- **Schema Upgrades**: Upgraded to JSON Schema 2020-12
  - App Identity schema (new v1.0.0)
  - Similarity schemas (v1.0.0, v2.0.0)
  - All schemas validated with goneat
- **Code Generation Standard**: Added SSOT sync configuration requirement for generated code distribution to helper libraries
- **Schema Validation**: Added `validateAppIdentityExample()` to `scripts/validate-schemas.ts` for CI pipeline validation

### Fixed

- **Exit Code Escaping (Python)**: Fixed double-escaping bug in Python codegen template where exit code 131 context displayed `Ctrl+\\` instead of `Ctrl+\`. Changed template to use `pyjson` filter for proper escaping.
- **Exit Code Escaping (TypeScript)**: Fixed same double-escaping bug in TypeScript codegen template. Replaced manual `.replace(/\\/g, '\\\\')` with `JSON.stringify()` for correct escaping. Discovered by tsfulmen snapshot validation.

## [0.2.3] - 2025-11-03

### Added

- **Web Styling Module**: Schema-driven branding and styling for web templates
  - Schemas: `schemas/web/branding/v1.0.0/`, `schemas/web/styling/v1.0.0/`
  - Configs: `config/web/branding/`, `config/web/styling/`
  - Architecture guide: `docs/architecture/fulmen-web-styling.md`
  - Support for themes (light/dark), typography systems, icon sets, and accessibility constraints
- **Server Management Module**: Server orchestration for local development, testing, and preview environments
  - Schema: `schemas/server/management/v1.0.0/server-management.schema.json`
  - Config: `config/server/management/server-management.yaml`
  - Architecture guide: `docs/architecture/fulmen-server-management.md`
  - Module spec: `docs/standards/library/modules/server-management.md`
  - Configuration classes: dev, test, a11y, preview, prod_like
  - Reference implementation pattern: Helper libraries ship orchestration harnesses, applications configure server commands
  - Makefile targets annex: `docs/standards/makefile-standard.md#annex-a-server-orchestration-targets`
- **Protocol Namespace**: Established protocol-centric schema taxonomy
  - Moved `schemas/api/http/` → `schemas/protocol/http/` for clarity
  - Protocol schemas define message contracts used by both clients and servers
  - Documentation: `docs/standards/protocol/` (http-rest-standards.md, grpc-standards.md)
  - Change memo: `docs/ops/repository/memos/2025-11-03-api-to-protocol-schema-refactor.md`
- **Codex Configuration**: Standardized configuration for codex templates
  - Schema: `schemas/config/repository-category/codex/v1.0.0/codex-config.schema.json`
  - Example: `examples/config/repository-category/codex/v1.0.0/codex-config.example.json`
  - Documentation: `docs/standards/repository-category/codex/config-standard.md`
  - Extension system with controlled enum and governance process
  - Parallel structure for repository-category standards (schemas + docs)

### Changed

- **Schema Taxonomy**: Refactored HTTP schemas to protocol-centric namespace
  - Updated all schema $id URLs from `api/http` to `protocol/http`
  - Examples moved: `examples/api/http/` → `examples/protocol/http/`
  - No schema version bump (pre-launch timing, zero external consumers)
- **Makefile Standard**: Added Annex A for server orchestration targets
  - Required targets for repositories implementing server functionality
  - Implementation requirements (port management, health checks, PID files, exit codes)
  - Example implementations for TypeScript/Python/Go

## [0.2.2] - 2025-10-29

### Changed

- **Documentation**: Updated all CalVer references to SemVer throughout documentation following v0.2.0 transition per ADR-0010. Updated README, CONTRIBUTING, repository versioning standard, and version adoption SOP to reflect current SemVer usage.

## [0.2.1] - 2025-10-29

### Added

- **Config Embedding**: Added `//go:embed config` to complete Go module embedding. Crucible now embeds `config/` directory alongside `schemas/` and `docs/`, enabling downstream libraries (like gofulmen) to access configuration files directly from the Crucible module without requiring sync operations.
- **Config Registry API**: New `config.go` with type-safe accessors for embedded configuration files:
  - `ConfigRegistry.Library().Foundry()` - Foundry catalog configs (patterns, country codes, HTTP statuses, MIME types, similarity fixtures)
  - `ConfigRegistry.Library().FulHash()` - FulHash module fixtures
  - `ConfigRegistry.Library().Manifest()` - Library module manifest
  - `ConfigRegistry.Taxonomy()` - Taxonomy configs (metrics, languages, repository categories)
  - `ConfigRegistry.Terminal()` - Terminal configuration defaults
  - `ConfigRegistry.Sync()` - SSOT sync keys
  - `GetConfig(path)` - Generic config file accessor
  - `ListConfigs(basePath)` - List config files in directory
- **Comprehensive Tests**: Added `config_test.go` with full test coverage for all config accessors and embedding verification

### Fixed

- **Missing Config Embedding**: Completed ADR-0009 implementation by adding the missing `//go:embed config` directive. Previously only `schemas/` and `docs/` were embedded when Go module moved to repository root (v0.2.0).
- **SSOT Compliance**: Downstream consumers can now access config as single source of truth from Crucible module instead of duplicating via sync scripts

## [0.2.0] - 2025-10-29

### Changed

- **Versioning Scheme**: Adopted Semantic Versioning (SemVer) for Go module compatibility and ecosystem alignment, replacing CalVer. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for decision rationale and alternatives considered.
- **Retroactive Tagging**: Added SemVer tags (v0.1.0 through v0.1.4) to existing CalVer releases (v2025.10.1 through v2025.10.5) for migration continuity. CalVer tags preserved for historical record.
- **Documentation**: Updated CHANGELOG.md to use SemVer version headers and adherence statement.

### Added

- **ADR-0010**: Documented Semantic Versioning adoption decision, Go module versioning requirements, alternatives considered (v0 CalVer, annual module paths, +incompatible), and version mapping strategy.

## [0.1.4] - 2025-10-29

### Changed

- **BREAKING: Go Module Relocated to Repository Root**: Moved Go module from `lang/go/` to repository root enabling standard external installation (`go get github.com/fulmenhq/crucible` now works without replace directives), direct SSOT embedding via `//go:embed`, and eliminating Go-specific sync overhead. See [ADR-0009](docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for rationale and [lang/go/README.md](lang/go/README.md) for migration guide. **Action Required**: Update to v2025.10.5 and remove any `replace` directives from `go.mod`.
- **Sync Script Optimization**: `scripts/sync-to-lang.ts` no longer syncs to `lang/go/` as Go module embeds directly from root SSOT (schemas/, docs/, config/). Python and TypeScript sync unchanged.
- **Makefile Simplification**: Go targets (`test-go`, `build-go`, `lint`) now run from repository root without `cd lang/go`, aligning with standard Go module workflow.

## [0.1.3] - 2025-10-28

### Changed

- **Bootstrap Guide Rewrite**: Complete rewrite of `docs/guides/fulmen-library-bootstrap-guide.md` migrating from deprecated fuldx to goneat, with language-specific sections for Python, Go, and TypeScript, provenance tracking documentation, and Makefile Standard compliance
- **Sync Model Documentation**: Updated `docs/architecture/sync-model.md` to reflect actual implementation using crucible-pull.ts scripts instead of deprecated FulDX, added Python language wrapper support, and modernized to TypeScript-based tooling
- **Documentation Perspective Alignment**: Fixed `docs/README.md` from consumer perspective to SSOT source perspective, removing "DO NOT EDIT" warnings and correcting internal path references
- **README Enhancements**: Added Python test badge for complete CI coverage visibility, updated Layer 2 forge references to horse breed naming (groningen/percheron), and added LICENSE cross-reference in Trademarks section
- **Architecture Documentation**: Fixed Mermaid diagram syntax in `docs/architecture/fulmen-ecosystem-guide.md`, corrected broken Markdown tables, and updated all forge references to current naming conventions

### Removed

- **Deprecated FulDX Documentation**: Removed obsolete bootstrap-fuldx.md, sync-consumers-guide.md, sync-producers-guide.md, and fuldx-bootstrap.md module standard, cleaning up 16 files (4 root + 12 synced wrappers) from deprecated tooling

### Fixed

- **Table Formatting**: Fixed Architecture Tenets table in `docs/architecture/fulmen-technical-manifesto.md` by removing blank lines between rows
- **Ecosystem Guide Tables**: Fixed multiple table formatting issues and removed blank lines that broke Markdown rendering

## [0.1.2] - 2025-10-28

### Added

- **SSOT Sync Provenance Schema v1.0.0**: Canonical schema for tracking SSOT sync operations with audit trail metadata (`schemas/content/ssot-provenance/v1.0.0/`), enabling reproducibility, dependency tracking, and dirty state detection across all SSOT consumers
- **Binary Naming Convention**: Comprehensive standard for workhorse forge binary naming (breed-name-only pattern, e.g., `groningen` not `workhorse-groningen`) ensuring clean CDRL refit workflows
- **Foundry Similarity v2.0.0**: Major expansion with Damerau-Levenshtein (OSA and unrestricted variants), Jaro-Winkler similarity, substring scoring, normalization presets, and 43 validated test fixtures
- **FulHash Module Standard**: Core module for consistent cross-language hashing with xxh3-128 and sha256 support, including block/streaming APIs and Pathfinder checksum integration
- **Module Telemetry Coordination SOP**: Formal process for coordinating metrics taxonomy updates across helper libraries before module implementation
- **ADR-0008**: Helper library instrumentation patterns documenting telemetry taxonomy coordination requirements
- **Metrics Taxonomy Additions**: config_load_errors, pathfinder_find_ms, pathfinder_validation_errors, pathfinder_security_warnings for Phase 3 gofulmen integration
- **Git Hook Bin Directory Check**: Pre-commit/pre-push hooks now check `$REPO_ROOT/bin/goneat` first for tools.yaml compatibility

### Changed

- **Goneat Upgrade**: tools.yaml updated from v0.2.11 to v0.3.2 with GitHub release checksums, enabling standard `make bootstrap` workflow
- **Makefile Clean Target**: Now removes `bin/` directory ensuring fresh bootstrap downloads
- **Foundry Similarity Schema**: Split into v1.0.0 (historical) and v2.0.0 (active) directories establishing versioned schema pattern for ecosystem
- **Git Hooks**: Enhanced goneat discovery to check repo-local bin/ before system paths for more stable developer experience
- **Gitignore**: Added `**/.claude/settings.local.json` to prevent AI assistant settings from being committed

### Fixed

- **FulHash Fixtures YAML**: Corrected block scalar syntax and added build validation for foundry/fulhash modules
- **Similarity Schema URL**: Consolidated duplicate similarity-fixtures.schema.json to canonical similarity.schema.json preserving stable URL

## [0.1.1] - 2025-10-22

### Added

- Commit message style guidelines in repository-operations-sop.md with concise vs verbose formatting guidance
- Crucible-specific operational checklists for commit workflow and release workflow in docs/ops/repository/
- AGENTS.md section referencing operational checklists with quick command reference for SSOT sync requirements
- Assessment severity schema and security policy configuration schemas for goneat integration
- Ecosystem-level documentation (fulmen-ecosystem-guide.md, fulmen-technical-manifesto.md) summarizing history, architecture, and standards alignment
- Repository lifecycle standard and schema (repository-lifecycle.md, lifecycle-phase.json) for consistent quality gating across Fulmen repos
- Schema-driven configuration hydration sections in all language coding standards (Go §3.4, Python §3.5, TypeScript §3.5)
- Schema contract fixtures and golden events testing sections in all language coding standards (Go §5.4, Python §5.4, TypeScript §5.5)
- Progressive logging playbook table in observability logging standard with profile-specific defaults and middleware requirements
- Schema field naming and policy integration guidance in observability logging standard
- Foundry text similarity and normalization standard (docs/standards/library/catalogs/foundry/text-similarity-normalization.md) with case-insensitive lookups, alpha-2/alpha-3/numeric country code normalization, and precomputed secondary indexes
- Docscribe module standard (docs/standards/library/modules/docscribe.md) for accessing and processing Crucible documentation assets with frontmatter extraction
- Crucible Overview requirement in helper library standard requiring all libraries to explain Crucible's role, shim/docscribe value, and learning resources
- Helper library README requirement for Crucible version section documenting metadata access via CrucibleVersion() API

### Changed

- Reorganized docs/standards/library/ into module- and catalog-specific folders with synced language copies
- Promoted the Foundry catalog to a core module in the manifest and broadened schema validation coverage
- Added Biome formatting to make fmt target to keep TypeScript schemas formatted after sync
- Introduced progressive logging profiles, policy enforcement, and updated schemas under schemas/observability/logging/v1.0.0/
- Enhanced coding standards (Go, Python, TypeScript) with schema-driven configuration hydration patterns and schema contract fixture requirements
- Updated observability logging standard with progressive logging playbook, schema field naming conventions, and shared fixture guidance
- Reorganized docs/ops/repository/ structure with memos/ subfolder for historical documentation
- Updated AGENTS.md with clarified quality gate workflow (precommit and prepush)
- Updated RELEASE_CHECKLIST.md to reference operational release-checklist.md
- Stabilized crucible-shim standard with enhanced API specifications for CrucibleVersion() metadata access
- Refined ecosystem guide and technical manifesto with broader architectural vision and helper library integration patterns
- Updated crucible-shim to defer metadata schema ownership to goneat while specifying consumption API contract

### Fixed

- Bootstrap symlink creation for type:link tools (was copying instead of symlinking)
- Format-before-sync order in scripts/sync-to-lang.ts to eliminate double-formatting and reduce sync noise

## [0.1.0] - 2025-10-01

### Added

- Initial repository setup
- Directory structure for schemas, docs, templates, and language wrappers
- CI/CD workflows for validation, testing, and publishing
- MIT License
- Basic README and contributing guidelines
- Terminal configuration schemas and catalog
- Policy schemas for fulward
- Go and TypeScript language wrappers
- Project templates for Go CLI tools, libraries, and TypeScript libraries
- Comprehensive documentation and standards
- Schema validation and testing infrastructure
