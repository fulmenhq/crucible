# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Versions 0.1.0 through 0.1.4 were originally released with CalVer tags (v2025.10.1 through v2025.10.5). Retroactive SemVer tags have been added for migration continuity. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for details.

## [Unreleased]

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

## [0.3.0] - 2026-01-01

### Added

- **Agentic Role Catalog**: Migrated agent role prompts to schema-validated YAML configuration files
  - 7 roles: `devlead`, `devrev`, `infoarch`, `entarch`, `cicd`, `secrev`, `dataeng`
  - Located in `config/agentic/roles/*.yaml` with README documentation
  - Schema validation via vendored `role-prompt.schema.json`
  - Enables programmatic consumption by agentic interfaces
- **Git Commit Attribution Baseline**: Canonical attribution format for AI-assisted commits
  - New `docs/catalog/agentic/attribution/git-commit.md` defining supervised and autonomous templates
  - Model name, interface, role, and committer-of-record requirements
  - Four-eyes review attribution with `Reviewed-By` trailer
  - Trailer ordering specification
- **Upstream Vendoring Pattern**: Schema sharing across repositories
  - New `schemas/upstream/` directory for vendored schemas
  - `PROVENANCE.md` for tracking source repositories and versions
  - `make sync-from-upstream` target for pulling latest schemas
  - Vendored `role-prompt.schema.json` from 3leaps/crucible
- **Upstream Sync Consumer Guide**: Documentation for consuming vendored schemas
  - `docs/ops/upstream-sync-consumer.md` with workflow and validation guidance
  - `docs/upstream/README.md` stub for upstream documentation links
- **Makefile Targets**: New targets for upstream schema management
  - `lint-config`: Validate YAML configurations against schemas
  - `upstream-validate`: Validate vendored schemas
- **Release Phase Schema**: Extended `release-phase.json` with new values
  - Added `release` as semantic equivalent to `ga` (tooling normalizes for comparison)
  - Added `hotfix` for urgent production fix state
  - Full enum: `dev`, `rc`, `ga`, `release`, `hotfix`
- **Agentic Interface Adoption Guide**: New guide for FulmenHQ ecosystem maintainers
  - `docs/guides/agentic-interface-adoption.md` with step-by-step migration instructions
  - Role selection guidance by repository type
  - Attribution format adoption checklist

### Changed

- **Phase Schema Consolidation**: Removed duplicate `lifecycle-phase.json` from goneat config
  - Goneat now references `schemas/config/repository/v1.0.0/lifecycle-phase.json`
  - Release phase remains goneat-specific at `schemas/config/goneat/v1.0.0/release-phase.json`
- **Repository Lifecycle Standard**: Clarified lifecycle vs release phase distinction
  - Added comparison table explaining different purposes
  - Updated migration guidance for `RELEASE_PHASE` files
- **AGENTS.md**: Updated to reference YAML role configurations
  - Role table now links to individual YAML files
  - Added attribution quick reference table
  - Clarified interface adapter configurations
- **Agentic Attribution Standard**: Major refactor of `docs/standards/agentic-attribution.md`
  - Streamlined specification focus
  - Moved detailed examples to catalog
  - Added cross-references to role catalog
- **AI Agents Standard**: Enhanced `docs/standards/ai-agents.md`
  - Expanded identity scheme documentation
  - Added operating mode definitions (supervised, autonomous, hybrid)
  - Role catalog integration
- **MAINTAINERS.md**: Simplified structure and governance documentation
- **README.md**: Updated version badge to 0.3.0

### Fixed

- **CI Workflow YAML**: Removed extraneous document start markers from workflow files
  - `.github/workflows/test-go.yml`
  - `.github/workflows/test-python.yml`
  - `.github/workflows/test-rust.yml`
  - `.github/workflows/test-typescript.yml`

## [0.2.27] - 2025-12-23

### Fixed

- **App Identity Vendor Pattern**: Updated vendor field pattern from `^[a-z][a-z0-9]{0,62}[a-z0-9]$` to `^[a-z0-9]{2,64}$` to allow leading digits
- **GitHub Workflow YAML Style**: Added missing `---` document start markers to all CI workflow files (test-go.yml, test-python.yml, test-rust.yml, test-typescript.yml) to satisfy yamllint document-start rule
  - **Problem**: Organizations with numeric prefixes (e.g., `3leaps`, `37signals`, `8x8`) could not use their names as vendor identifiers
  - **Impact**: Blocked `github.com/3leaps/gonimbus` and similar projects from passing app-identity validation
  - **Cross-Language Safety**: Change is safe because vendor is used for filesystem paths and config directories, not language-specific package identifiers
    - Go: Module paths accept leading digits (`github.com/3leaps/pkg` works)
    - Python: Vendor not used as import name (use `metadata.python.package_name` for that)
    - TypeScript: npm scopes accept leading digits (`@3leaps/pkg` valid)
    - Rust: Cargo accepts numeric prefixes in crate names
  - **Documentation**: Added "Vendor Pattern Cross-Language Safety" section to app-identity module standard

### Changed

- **App Identity Schema Description**: Enhanced vendor field description to document leading digit allowance with real-world examples (fulmenhq, 3leaps, 37signals)

## [0.2.26] - 2025-12-20

### Added

- **Repository Taxonomy Expansion**: Two new repository categories for Fulmen ecosystem
  - `spec-host`: Machine-first specification artifact hosting for automated consumption via HTTP/HTTPS
  - `missive`: Single-page promotional or call-to-action sites (landing pages, campaign microsites)
- **Spec Publishing Standard**: New publishing standards for spec-host repositories
  - `docs/standards/publishing/spec-publishing.md` defining requirements
  - `schemas/standards/publishing/v1.0.0/spec-catalog.schema.json` for optional index.json catalog
  - Category-specific requirements in `docs/standards/repository-category/spec-host/` and `missive/`
- **Signed release tagging workflow** for Crucible
  - New Make targets: `release-tag`, `release-verify-tag`, `release-guard-tag-version`
  - New scripts under `scripts/` to create/verify signed tags and (optionally) publish minisign tag attestations
  - Optional GitHub API verification helper for tag "Verified" status (`release-verify-remote-tag`)
- **LIFECYCLE_PHASE file**: Crucible now declares its lifecycle phase (`alpha`) per repository-lifecycle standard
- **README badges**: Added lifecycle, version, and license badges to README header

### Changed

- **Codex Standard Clarification**: Reframed "Codex Registry" to "Codex Spec Browser" terminology; clarified spec-host (machine-first) vs codex (human-first) distinction
- **Ecosystem Guide**: Updated to be version-scheme-agnostic (removed CalVer-specific language)
- **Release process docs** now require signed annotated tags (GPG) and document optional minisign sidecar attestations
- **Goneat hooks regenerated** with v0.3.22 improvements: `set -f` for glob expansion prevention, simplified manifest-driven assess command

## [0.2.25] - 2025-12-19

### Changed

- **README and CI badge corrections**
  - Updated GitHub Actions badges to point at the current workflow files
  - Refreshed examples/links for accuracy and usability

- **Goneat hook + bootstrap hardening**
  - Switched `.goneat/hooks.yaml` to `goneat assess` (avoids make-based hook loops)
  - Standardized `make bootstrap` to install global `goneat` via `sfetch --install`
  - Formatted codegen postprocess scripts (shfmt) and tightened Makefile hygiene

## [0.2.24] - 2025-12-18

### Changed

- **App Identity (Embedded Fallback Standard)** - Clarified template requirements for embedding `.fulmen/app.yaml` into distributed artifacts
  - Updated App Identity standard with embedded fallback, drift-prevention targets, and acceptance criteria
  - Updated CDRL and forge standards (workhorse/codex/microtool) to reference the new requirement

## [0.2.23] - 2025-12-18

### Added

- **Experimental: Enact Schema Support** - Introduced initial Enact schemas, docs, and example instances
  - Schemas: `schemas/enact/v1.0.0/`
  - Docs: `docs/architecture/enact/`
  - Examples: `examples/enact/v1.0.0/`

Further Enact schema and validation updates will follow in subsequent releases.

## [0.2.22] - 2025-12-04

### Added

- **Goneat Tools Schema Enhancement** - Extended installer kinds to support Node.js and Python package managers
  - Added `"node"` and `"python"` to the `kind` enum in `schemas/tooling/goneat-tools/v1.0.0/goneat-tools-config.schema.yaml`
  - Enables goneat to install tools via npm/pnpm/yarn (node) and pip/uv/poetry (python)
  - Synced to all language wrappers (`lang/python/`, `lang/typescript/`, `lang/rust/`)

## [0.2.21] - 2025-11-30

### Added

- **Rust Language Enablement** - Foundation for `rsfulmen` helper library
  - **Scaffolding**: Complete `lang/rust` crate structure with Cargo workspace and MSRV 1.70 configuration
  - **Code Generation**: Automated bindings for Exit Codes, Fulpack, Fulencode, and Fulhash modules
  - **Sync Pipeline**: `make sync` now hydrates `lang/rust/schemas`, `lang/rust/config`, and `lang/rust/docs`
  - **Quality Gates**: `make check-all` integrates `rustfmt`, `clippy` (pedantic), and `cargo test`
  - **Coding Standards**: New [Rust Coding Standards](docs/standards/coding/rust.md) and [Rust Testing Patterns](docs/standards/testing/language-testing-patterns.md#rust--claptokio-clis)
  - **Documentation**: `ADR-0013` (Rust Sync Pattern Validation) and updated `languages.yaml` status
  - **Tooling**: Added `rustup` to `.goneat/tools.yaml` for standardized environment bootstrapping

## [0.2.20] - 2025-11-21

### Added

- **FulHash CRC Extension & Codegen** - Expanded hashing capabilities and automated type safety
  - **Algorithm Expansion**: Added `crc32` (IEEE) and `crc32c` (Castagnoli) to supported algorithms taxonomy
    - `crc32`: Standard for legacy archive compatibility (ZIP, GZIP, PNG)
    - `crc32c`: Hardware-accelerated checksums for cloud storage (GCS, AWS) and network protocols (SCTP, iSCSI)
  - **Automated Code Generation**: Implemented "Taxonomy → Schema → Template → Code" pipeline for FulHash module
    - **SSOT**: `schemas/taxonomy/library/fulhash/algorithms/v1.0.0/algorithms.yaml` defines all supported algorithms
    - **Generator**: `scripts/codegen/generate-fulhash-types.ts` renders language-specific bindings
    - **Outputs**: Type-safe `Algorithm` enums and `Digest` structs for Go, Python, and TypeScript
    - **Parity**: Ensures identical constant values and type definitions across all helper libraries
  - **New Convenience Interfaces** (Spec only, implementation in helpers):
    - `MultiHash(reader, algorithms[])`: Calculate multiple digests (e.g., SHA256 + CRC32) in a single I/O pass
    - `Verify(reader, expected_digest)`: Boolean helper to validate data against a checksum string
  - **Documentation**: Comprehensive update to `docs/standards/library/modules/fulhash.md` with new signatures and usage guidance
  - **Python Specifics**: Documented recommendation for `google-crc32c` C-extension for performance
  - **Quality Gates**: `make codegen-fulhash` target integrated into `codegen-all` and `precommit` workflow

## [0.2.19] - 2025-11-19

### Changed

- **DevSecOps Secrets Schema Hardening - Size Limits & Enhanced Metadata**:
  - **Motivation**: Add DoS protection and compliance tracking to secrets schema v1.0.0 before fulmen-secrets release; limits generous but defensive; metadata fields support enterprise credential management
  - **Size Limits Added** (DoS protection + OS alignment):
    - Credential `value`: max 65,536 chars (64KB, UTF-8) - generous for keys/certs/tokens
    - Credential `ref`: max 2,048 chars (printable ASCII only) - covers vault URIs, ARNs
    - Descriptions (file/project/credential): max 4,096 chars each - audit-friendly
    - Credential key names (env vars): max 255 chars - POSIX standard limit
    - Projects per file: max 256 - monorepo support
    - Credentials per project: max 1,024 - enterprise scale
  - **Enhanced Metadata Fields** (all optional, backwards-compatible):
    - Rotation tracking: `last_rotated` (ISO 8601), `next_rotation` (ISO 8601), `rotation_count` (integer ≥0)
    - Service integration: `service_name` (string), `service_url` (URI), `required_scope` (OAuth/API scope)
    - Compliance & environment: `compliance_tags` (array, max 20), `environment` (enum: production/staging/development/test/qa/demo), `tier` (enum: critical/high/medium/low)
  - **Files Updated**:
    - Schema: `schemas/devsecops/secrets/v1.0.0/secrets.schema.json` - constraints + metadata fields
    - Defaults: `config/devsecops/secrets/v1.0.0/defaults.yaml` - showcases new fields with size limit comments
    - Documentation: `docs/standards/devsecops/project-secrets.md` - new "Size Limits & DoS Protection" section + expanded metadata tables
  - **Design Philosophy**:
    - Generous defaults (10-100x typical use cases) to avoid blocking legitimate workflows
    - DoS prevention caps (prevent accidental/malicious resource exhaustion)
    - OS alignment (env var limit matches POSIX/Linux/macOS standards)
    - Audit-friendly (large descriptions support compliance docs)
  - **Breaking Change**: None - limits are generous; existing valid secrets files remain compatible
  - **Override Strategy**: Split files, use external refs, or contact maintainers if limits blocking
  - **Pre-release Note**: Safe to revise v1.0.0 schema since fulmen-secrets unreleased
  - **Quality Gates**: All passed (schema validation, build, lint, test, typecheck)
  - **Downstream Impact**: fulmen-secrets, gofulmen, pyfulmen can consume enhanced schema on v0.2.19 sync

## [0.2.18] - 2025-11-17

### Added

- **HTTP Server Metrics - Canonical Taxonomy for Application Observability**:
  - **Motivation**: Standardize HTTP server instrumentation across gofulmen, tsfulmen, and pyfulmen; prevent cardinality explosions from unbounded route labels; align duration units (seconds) and bucket defaults ecosystem-wide
  - **Metrics Added** (5 canonical HTTP server metrics):
    - `http_requests_total` (Counter): Total HTTP requests with method, route (templated), status, service labels; optional outcome (2xx/4xx/5xx) grouping
    - `http_request_duration_seconds` (Histogram): Request latency in seconds; buckets [5ms...10s] covering in-memory to backend calls
    - `http_request_size_bytes` (Histogram): Request body size in bytes; buckets [1KB...100MB]
    - `http_response_size_bytes` (Histogram): Response body size in bytes; buckets [1KB...100MB]
    - `http_active_requests` (Gauge): Concurrent request count; minimal labels (service only) to avoid cardinality
  - **Histogram Bucket Defaults Added**:
    - `seconds_metrics`: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] - Duration metrics (5ms to 10s)
    - `bytes_metrics`: [1024, 10240, 102400, 1048576, 10485760, 104857600] - Size metrics (1KB to 100MB)
  - **Documentation Additions** (~450 lines in `telemetry-metrics.md`):
    - **Route Normalization (CRITICAL)**: Comprehensive guidance on using templated routes (`/users/:id`) instead of literal paths (`/users/123`) to prevent metric cardinality explosions
    - **Framework-Specific Route Extraction**:
      - TypeScript: Express (`req.route.path`), Fastify (`request.routeOptions.url`)
      - Go: chi (`RouteContext().RoutePattern()`), gin (`c.FullPath()`), httprouter (pattern from registration)
      - Python: FastAPI (`request.scope["route"]`)
    - **Canonical normalizeRoute() Helper**: Fallback normalization for frameworks without route introspection (UUID/ID/ObjectID replacement)
    - **Unit Conversion Requirements**: CRITICAL guidance on converting milliseconds → seconds for duration metrics; helpers MUST emit canonical units
      - TypeScript: `durationMs / 1000` conversion examples
      - Go: `time.Since(start).Seconds()` automatic conversion
      - Python: `time.time()` already returns seconds (no conversion)
    - **Label Cardinality Budget**: Analysis showing ~92K time series per service (50 routes × 5 methods × 20 status codes)
    - **prom-client Collision Warning**: CRITICAL warning about TypeScript prom-client auto-emitting `http_*` metrics that collide with taxonomy; registry clearing required
    - **Full Middleware Examples**: Production-ready Express, Go chi, and Python FastAPI middleware implementations
  - **Schema Updates**:
    - Added 5 metric names to `metricName` enum in metrics.yaml schema
    - Updated schema properties to document seconds and bytes bucket types
    - Comprehensive metric descriptions with required/optional labels, cardinality warnings, and use case guidance
  - **Files Updated**:
    - Root SSOT: `config/taxonomy/metrics.yaml`, `docs/standards/library/modules/telemetry-metrics.md`
    - TypeScript wrapper: Synced metrics.yaml + docs, package.json → 0.2.18
    - Python wrapper: Synced metrics.yaml + docs, pyproject.toml → 0.2.18
    - Go wrapper: schemas.go → 0.2.18
  - **Cardinality Mitigation Strategies**:
    - Use templated routes to bound route label values
    - Optional `outcome` label (2xx/4xx/5xx) for simplified high-level dashboards
    - `http_active_requests` uses service-only label to minimize series
  - **Quality Gates**: All passed (schema validation, build, lint, test, typecheck) across Go/TypeScript/Python
  - **Downstream Impact**: Unblocks HTTP server instrumentation in gofulmen, tsfulmen, and pyfulmen with consistent metric names, labels, buckets, and units

## [0.2.17] - 2025-11-17

### Changed

- **DevSecOps Secrets Schema Update** - Rich Credential Objects with Lifecycle Management:
  - **Motivation**: Align Crucible schema with fulmen-secrets v0.1.1 pre-release features; add credential structure (type, metadata, rotation) for enterprise credential management
  - **Top-Level Changes**:
    - Added `env_prefix` (optional): Global environment variable prefix for all projects (e.g., `MYAPP_`)
    - Added `description` (optional): Multi-line description of the secrets file
  - **Project-Level Changes**:
    - Updated `project_slug` pattern: Now allows underscores in addition to hyphens (`^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$`)
    - Valid examples: `backend-api`, `api_staging`, `worker-dev`, `my_service-v2`
    - Added `description` (optional): Multi-line description of the project
    - **Breaking**: Renamed `secrets` → `credentials` (field name change)
  - **Credential Object Structure** (New):
    - Changed from flat string map to structured credential objects
    - **Required fields**:
      - `type` (enum): `api_key`, `password`, or `token` - determines smart masking behavior
      - Exactly one of: `value` (inline plaintext) OR `ref` (external secret manager reference)
    - **Optional fields**:
      - `description`: Human-readable purpose description
      - `metadata`: Lifecycle tracking (created, expires, purpose, tags, owner)
      - `rotation`: Rotation policy (interval: `30d`/`90d`/`180d`, method: `auto`/`manual`)
    - **Masking Behavior**:
      - `api_key`: Show prefix (`sk_live_...xyz`) for debugging without exposing full key
      - `token`: Show suffix (`...1234`) for token identification
      - `password`: Full redaction (`***REDACTED***`) for maximum security
  - **External References**: `ref` field supports secret manager URIs (`vault://`, `aws-secrets://`)
  - **Metadata Tracking**:
    - `created`/`expires`: ISO 8601 timestamps for rotation tracking
    - `purpose`: Categorization slug (e.g., `payment-processing`)
    - `tags`: Array of tags for monitoring/alerting (e.g., `["critical", "pci-scope"]`)
    - `owner`: Team/owner identifier for credential ownership
  - **Rotation Policy**:
    - `interval`: Human-readable rotation interval (`30d`, `90d`, `6m`, `1y`)
    - `method`: `auto` (automated rotation) or `manual` (manual process required)
  - **Files Updated**:
    - Schema: `schemas/devsecops/secrets/v1.0.0/secrets.schema.json` (credential object definitions)
    - Defaults: `config/devsecops/secrets/v1.0.0/defaults.yaml` (6 updated examples with metadata/rotation)
    - Docs: `docs/standards/devsecops/project-secrets.md` (comprehensive update with credential structure, masking, lifecycle)
    - Synced to Python/TypeScript language wrappers
  - **Breaking Change Impact**:
    - Tool not yet released (fulmen-secrets v0.1.0 unreleased) → safe pre-release update
    - No external consumers affected
    - fulmen-secrets will drop local schema copies after gofulmen embed refresh
  - **Downstream**: Unblocks fulmen-secrets v0.1.1+ with rich credential management, smart masking, rotation tracking
  - **Use Cases**: API key lifecycle tracking, password rotation policies, credential expiry monitoring, compliance auditing

## [0.2.16] - 2025-11-16

### Fixed

- **Schema Reference Resolution** - Cross-File $ref Using Absolute $id URLs:
  - **Problem**: Logging schema used relative cross-file `$ref` (e.g., `"$ref": "middleware-config.schema.json"`)
    - Relative references fail in memory-based validators without filesystem context
    - gofulmen v0.1.15 encountered schema compilation failures when loading logger-config.schema.json
    - JSON Schema best practice recommends absolute `$id` URLs for cross-schema references
  - **Fix Applied**:
    - Updated `logger-config.schema.json` line 51: `middleware` array items now reference absolute URL
    - Changed from: `"$ref": "middleware-config.schema.json"` (relative path)
    - Changed to: `"$ref": "https://schemas.fulmenhq.dev/crucible/observability/logging/middleware-config-v1.0.0.json"` (absolute $id)
    - References target schema's `$id` field for consistent resolution
  - **Impact**: Validators can now resolve cross-schema references without filesystem context
  - **Downstream**: Unblocks gofulmen v0.1.15 logging module implementation
  - **Architecture Decision**: See [ADR-0012](docs/architecture/decisions/ADR-0012-schema-ref-ids.md) for full rationale
  - **Files**:
    - Schema: `schemas/observability/logging/v1.0.0/logger-config.schema.json` (line 51)
    - ADR: `docs/architecture/decisions/ADR-0012-schema-ref-ids.md` (new)
    - Synced to Python/TypeScript language wrappers
  - **Future Work**: Apply absolute $id references to other cross-file $refs when touched
  - **Reported by**: EA Steward during gofulmen v0.1.15 development

## [0.2.15] - 2025-11-16

### Fixed

- **TypeScript Code Generation Bugfix** - Array-of-Union Type Wrapping:
  - **Problem**: TypeScript code generator produced malformed type definitions for array-of-enum fields
    - Array bracket `[]` incorrectly applied only to last union member instead of entire union
    - Example (wrong): `"a" | "b" | "c"[]` (only "c" is array type)
    - Example (correct): `("a" | "b" | "c")[]` (entire union is array type)
  - **Affected Field**: `ValidationResult.checks_performed` in fulpack types
  - **Impact**: Type checking errors when assigning correctly-typed arrays, forced `as any` workarounds in TSFulmen
  - **Fix Applied**:
    - Updated `inferTypeScriptType()` in `scripts/codegen/generate-fulpack-types.ts`
    - Added parentheses wrapping for union types before array bracket: `needsParens ? (${itemType})[] : ${itemType}[]`
    - Regenerated TypeScript types for fulpack and fulencode modules
  - **Verification**: `bunx tsc --noEmit` passes without errors
  - **Downstream**: Unblocks TSFulmen v0.1.10+ to remove `as any` workaround
  - **Prevention Measures**:
    - Added 20 comprehensive type instantiation tests (`lang/typescript/test/types/fulpack-types.test.ts`)
    - Tests verify generated types accept correctly-typed data (catches semantic bugs `tsc` misses)
    - Regression tests for array-of-union patterns across all fulpack interfaces
    - Tests integrated into CI/CD pipeline via `make test`
  - **Files**:
    - Generator: `scripts/codegen/generate-fulpack-types.ts` (+7 lines)
    - Types: `lang/typescript/src/fulpack/types.ts`, `lang/typescript/src/fulencode/types.ts` (regenerated)
    - Tests: `lang/typescript/test/types/fulpack-types.test.ts` (+340 lines, 20 tests)
  - **Triggered by**: TSFulmen v0.1.9 type checking errors during enum migration

- **Logging Schema Bugfix** - Middleware Configuration Schema Mismatch:
  - **Problem**: `logger-config.schema.json` had two conflicting definitions for middleware configuration
    - Standalone schema (`middleware-config.schema.json`): Updated with new `type`, `priority`, `redaction` fields ✅
    - Embedded definition in `logger-config.schema.json`: Still used old `name`, `order`, `config` fields ❌
  - **Fix Applied**:
    - Updated `middleware` array items `$ref` from `#/$defs/middlewareConfig` to `middleware-config.schema.json`
    - Removed 30-line embedded `middlewareConfig` definition (conflicted with documented format)
    - Standalone schema now single source of truth for middleware configuration
  - **Impact**: Enables new-style middleware configs with `type`/`priority`/`redaction` fields per documentation
  - **Downstream**: Unblocks gofulmen v0.1.15 redaction middleware implementation
  - **Files**: `schemas/observability/logging/v1.0.0/logger-config.schema.json` (+1, -30 lines)
  - **Reported by**: Foundation Forge (gofulmen agent) during v0.1.15 development

### Added

- **Pathfinder Repository Root Discovery Specification** (`docs/standards/library/extensions/pathfinder.md`):
  - **Purpose**: Safe upward filesystem traversal to locate repository markers (`.git`, `go.mod`, `package.json`, etc.)
  - **API Specification**:
    - `FindRepositoryRoot(startPath, markers, ...opts)` function signature for Go/Python/TypeScript
    - Predefined marker sets: `GitMarkers`, `GoModMarkers`, `NodeMarkers`, `PythonMarkers`, `MonorepoMarkers`
    - Options: `StopAtFirst`, `MaxDepth`, `Boundary`, `RespectConstraints`, `FollowSymlinks`
  - **Safety Model**:
    - Default home directory ceiling (never traverse above `$HOME`/`%USERPROFILE%`)
    - Max depth guard (default: 10 directories upward)
    - PathConstraint integration (respects existing boundaries)
    - Platform-specific boundaries (Windows UNC paths, drive roots, filesystem boundaries)
  - **Error Handling**: Schema-compliant errors (`REPOSITORY_NOT_FOUND`, `INVALID_START_PATH`, `TRAVERSAL_LOOP`)
  - **Use Cases**: Finding repository root from nested source directories, locating project configuration files, establishing path context
  - **Eliminates Duplication**: Replaces hand-rolled upward traversal in groningen, schema catalog, identity discovery
  - **Performance**: Expected <5ms typical (3-5 dirs up), <20ms worst case (max depth)
  - **Cross-Language**: Specification ready for implementation in gofulmen, pyfulmen, tsfulmen
  - **Triggered by**: Groningen `findProjectRoot()` implementation revealing pattern duplication across repos
  - **Lines**: 328 lines of API specification, safety model, usage examples, integration patterns

- **Logging Redaction Middleware Documentation** (`docs/standards/observability/logging.md`):
  - **Purpose**: Comprehensive specification for redaction middleware in logging pipeline
  - **Middleware Configuration**:
    - New-style format: `type` (required), `enabled`, `priority`, type-specific config objects
    - Replaces old format: `name`, `order`, generic `config` object
    - Supports multiple middleware types: redaction, filter, augmentation, sampling, custom
  - **Redaction Specification**:
    - Pattern-based redaction with regex support (`SECRET_*`, `TOKEN_*`, etc.)
    - Field-based redaction (sensitive field names: password, token, apiKey)
    - Case-insensitive matching option (`case_insensitive: true`)
    - Configurable replacement text (default: `[REDACTED]`)
    - Priority recommendations (redaction: 10, filter: 20, augmentation: 30, sampling: 40)
  - **Schema References**: Links to `middleware-config.schema.json` and redaction config schema
  - **Usage Examples**: YAML/JSON config examples with real-world patterns
  - **Integration**: Works with SIMPLE, STANDARD, ENTERPRISE logging profiles
  - **Lines**: 177 lines of middleware specification, redaction patterns, configuration examples
  - **Triggered by**: EA Steward memo for gofulmen v0.1.15 enterprise logging features

### Technical Details

- **Schema Synchronization**: All schema changes synced to Python/TypeScript language wrappers via `make sync`
- **Documentation Alignment**: Logging schema now matches documentation (`docs/standards/observability/logging.md` lines 204-405)
- **Backward Compatibility**: Language implementations MAY support old middleware format during transition period via shims
- **Validation**: Schema enforces new middleware format; old `name`/`order`/`config` fields no longer valid

- **DevSecOps Modules Taxonomy** (`config/taxonomy/devsecops/modules/v1.0.0/modules.yaml`):
  - Created dedicated DevSecOps modules registry separate from platform modules
  - **Architecture Decision**: DevSecOps modules don't belong in platform-modules registry
    - Platform modules (config, logging, pathfinder) → gofulmen/pyfulmen/tsfulmen
    - DevSecOps modules (lorage-central, secrets) → goloragecentral/pyloragecentral (future L'Orage-branded libraries)
  - **Registry Structure**: Tracks schemas, configs, potential implementations, consumer apps
  - **No Tier System**: DevSecOps modules don't use Core/Common/Specialized tiers (infrastructure, not general-purpose)
  - **No Graduation/Sunset**: DevSecOps modules don't need to prove universality
  - **Validation Updated**: Module registry validation checks both platform and DevSecOps registries (no orphaned artifact warnings)
  - **Modules Tracked**:
    - `lorage-central`: L'Orage Central DevSecOps infrastructure (6 schemas: activity, credentials, policy, recipe, runbooks, tenant)
    - `secrets`: Project secrets management for fulmen-secrets CLI and L'Orage Central
  - **Files**:
    - Schema: `schemas/taxonomy/devsecops/modules/v1.0.0/devsecops-module-entry.schema.json`
    - Registry: `config/taxonomy/devsecops/modules/v1.0.0/modules.yaml`
    - Validation: `scripts/validate-module-registry.ts` (updated to check both registries)

## [0.2.14] - 2025-11-15

### Changed

- **TypeScript Enum Generation**: Updated code generation to produce TypeScript enums instead of string literal unions for cross-language parity
  - **Fulpack TypeScript Types** (`lang/typescript/src/fulpack/types.ts`):
    - `ArchiveFormat` enum (TAR, TAR_GZ, ZIP, GZIP) - was `type ArchiveFormat = "tar" | "tar.gz" | ...`
    - `EntryType` enum (FILE, DIRECTORY, SYMLINK) - was `type EntryType = "file" | "directory" | ...`
    - `Operation` enum (CREATE, EXTRACT, SCAN, VERIFY, INFO) - was `type Operation = "create" | "extract" | ...`
    - Enum constant names follow SCREAMING_SNAKE_CASE (e.g., TAR_GZ, UTF_8, ISO_8859_1)
  - **Fulencode TypeScript Types** (`lang/typescript/src/fulencode/types.ts`):
    - `EncodingFormat` enum (BASE64, BASE32, HEX, UTF_8, UTF_16LE, UTF_16BE, ISO_8859_1, CP1252, ASCII, BASE64URL, BASE64_RAW, BASE32HEX)
    - `NormalizationProfile` enum (NFC, NFD, NFKC, NFKD, SAFE_IDENTIFIERS, SEARCH_OPTIMIZED, FILENAME_SAFE, LEGACY_COMPATIBLE)
    - `ConfidenceLevel` enum (HIGH, MEDIUM, LOW)
  - **Cross-Language Alignment**: TypeScript now matches Go (typed string constants) and Python (Enum classes) patterns
  - **Developer Experience**: Enums provide autocomplete, refactoring safety, exhaustiveness checking, and prevent typos
  - **Template Updates**: Updated EJS templates for both fulpack and fulencode TypeScript generation

### Added

- **Fulpack Structured Error Interface** (`lang/typescript/src/fulpack/types.ts`):
  - `FulpackError` interface with structured error context for better observability and programmatic error handling
  - Fields: `code` (string), `message` (string), `operation` (Operation enum), `path` (optional), `archive` (optional), `source` (optional), `details` (optional object with compression_ratio, sizes, etc.)
  - `ValidationResult.errors` changed from `string[]` to `FulpackError[]`
  - `ExtractResult.errors` changed from `string[]` to `FulpackError[]`
  - Enables telemetry categorization, programmatic error handling, and better debugging context
  - Aligns with gofulmen and pyfulmen structured error patterns

- **DevSecOps Project Secrets Schema** (`schemas/devsecops/secrets/v1.0.0/`):
  - Canonical schema for project-scoped secrets files with encryption support
  - **Dual-mode support**: Plaintext (development) OR encrypted (production) - mutually exclusive
  - **Project scoping**: `projects[]` array with `project_slug` for multi-project secrets in single file
  - **Encryption metadata**: Tracks method (gpg/age/passphrase), key_id, encrypted_at timestamp, cipher
  - **Secret entries**: Simple key-value map (string → string, no nested objects in v1.0.0)
  - **Policy enforcement**: `allow_plain_secrets: false` for compliance/"FIPS mode" (rejects plaintext files)
  - **Use case**: Environment variable management for fulmen-secrets (fulsecrets) CLI tool, L'Orage Central, Etknow
  - **Files**:
    - `schemas/devsecops/secrets/v1.0.0/secrets.schema.json` - JSON Schema with dual-mode validation
    - `config/devsecops/secrets/v1.0.0/defaults.yaml` - Sample configs (plaintext, GPG, age, passphrase examples)
    - `docs/standards/devsecops/project-secrets.md` - Comprehensive documentation with security recommendations
  - **Security features**: Schema-level validation prevents plaintext in prod, supports roundtrip encryption, subprocess wrapping pattern
  - **Deferred to v1.1.0**: Reference-based secrets, expiry/rotation metadata, audit tags

### Breaking Changes

- **TypeScript Type Changes** (Non-breaking in practice):
  - Fulpack types: String literal unions replaced with enums
  - Fulencode types: String literal unions replaced with enums
  - Structured errors: `ValidationResult.errors` and `ExtractResult.errors` use `FulpackError[]` instead of `string[]`
  - **Impact**: Zero breaking changes - no implementations exist yet (fulpack v0.2.11, fulencode v0.2.12 only provided type definitions)
  - **Migration**: TSFulmen, PyFulmen, GoFulmen implementations will use new enum types from start

### Technical Details

- **Code Generation**: `toConstantCase()` helper transforms taxonomy values to enum constant names
- **Template Logic**: Added conditional override for `errors` fields in ValidationResult and ExtractResult
- **Verification**: All generated types compile with `tsc --noEmit`, pass drift detection, maintain parity across languages

## [0.2.13] - 2025-11-14

### Added

- **Fulpack Test Fixtures**: Reproducible script-generated fixtures for comprehensive fulpack testing
  - **Fixture Generator** (`scripts/generate-fulpack-fixtures.ts`):
    - TypeScript-based generator creating all 4 standard fixtures from code
    - Size validation enforced programmatically (10KB compressed, 25KB tar, 50KB pathological)
    - Fresh content for each fixture (no reuse to prevent coupling)
    - Auto-generates `.txt` documentation for each fixture
  - **Fixtures** (`config/library/fulpack/fixtures/`):
    - `basic.tar` (21.5KB): Uncompressed tar with binary+text content
      - Binary file: `data/tiny.png` (~100 bytes PNG-like blob)
      - Text files: README.md, config.json, metadata.txt, data/sample.txt
      - Tests: tar format operations, compression_ratio=1.0, binary data integrity
    - `basic.tar.gz` (847 bytes): Compressed tar archive
      - Same 5-file structure as basic.tar
      - Tests: standard tar.gz operations, compression ratio (~3:1), directory nesting
    - `nested.zip` (3.4KB): 3-level directory nesting
      - Structure: root.txt → level1/ → level2/ → level3/ (5 files total)
      - Tests: deep directory nesting, path handling, zip format operations
    - `pathological.tar.gz` (1.3KB): Security test cases
      - Malicious entries: path traversal (../../../etc/passwd), absolute paths (/etc/passwd, /root/.ssh/id_rsa)
      - Symlink escapes targeting outside archive bounds
      - Tests: security protections (PATH_TRAVERSAL, ABSOLUTE_PATH, SYMLINK_ESCAPE errors)
  - **Documentation**:
    - `README.md` in fixtures directory explaining purpose, inventory table, generation instructions, size governance
    - Each fixture includes `.txt` file documenting purpose, structure, expected behavior, test coverage
  - **Cross-Language Parity**: Fixtures synced to Python/TypeScript wrappers via `sync-to-lang`
  - **Rationale**: Enables testing all 4 archive formats (tar, tar.gz, zip, gzip) with consistent behavior across gofulmen, pyfulmen, tsfulmen
  - **Status**: ✅ All fixtures generated, validated, documented, and synced to language wrappers

## [0.2.12] - 2025-11-14

### Added

- **Language-Specific Testing Patterns Standard**: CLI testing isolation guidance for all supported languages
  - **New Standard Document** (`docs/standards/testing/language-testing-patterns.md`):
    - **Go - Cobra Command Isolation**: Factory functions, flag reset helpers, test isolation pattern for spf13/cobra CLIs
    - **Python - Typer/Click CLI Isolation**: Application factory pattern, contextvars reset, runner helpers
    - **TypeScript - Commander/oclif Isolation**: Factory pattern, process state mocking, output capture
    - **Rust - Clap/Tokio CLIs**: Builder functions, async isolation, tokio test configuration
    - **C# - System.CommandLine**: CommandFactory pattern, dependency injection, output capture
  - **Testing Standards Index** (`docs/standards/testing/README.md`):
    - Navigation index for all testing guidance documents
    - Quick-reference table linking portable-testing-practices and language-testing-patterns
  - **Cross-References Added**: All coding standards (Go, Python, TypeScript) now link to language-specific CLI testing patterns
    - Go coding standard: References Cobra command isolation pattern
    - Python coding standard: References Typer/Click application factory pattern
    - TypeScript coding standard: References Commander/oclif factory pattern
- **Fulencode Module Complete**: Common-tier encoding/decoding operations with security and normalization
  - **Module Specification** (`docs/standards/library/modules/fulencode.md`):
    - Complete API specification (4,124 lines, 97 sections) with 8 integration examples
    - 5 core operations: `encode()`, `decode()`, `detect()`, `normalize()`, `bom()`
    - Canonical façade for Base64, Base32, Hex, UTF detection, Unicode normalization
    - Security model: Buffer limits, encoding bomb detection, normalization attack prevention
    - Custom normalization profiles with step-by-step transformation algorithms
    - Minimum detection algorithm for Common tier (BOM + UTF-8 validation only)
    - Telemetry specification with 14 metrics and implementation checklist
    - Integration patterns for Fulpack, Nimbus, Pathfinder
  - **Taxonomy Schemas** (6 files):
    - `schemas/taxonomy/library/fulencode/encoding-families/v1.0.0/`: Binary-to-text and character encodings
      - `families.schema.json`: JSON Schema for encoding families taxonomy
      - `families.yaml`: 12 Common-tier formats (base64, base32, hex, utf-8, utf-16, iso-8859-1, cp1252, ascii)
    - `schemas/taxonomy/library/fulencode/normalization-profiles/v1.0.0/`: Unicode normalization profiles
      - `profiles.schema.json`: JSON Schema for normalization profiles taxonomy
      - `profiles.yaml`: 8 profiles (NFC, NFD, NFKC, NFKD + 4 custom: safe_identifiers, search_optimized, filename_safe, legacy_compatible)
    - `schemas/taxonomy/library/fulencode/detection-confidence/v1.0.0/`: Detection confidence levels
      - `levels.schema.json`: JSON Schema for confidence levels taxonomy
      - `levels.yaml`: 3 confidence levels (HIGH ≥90%, MEDIUM 50-89%, LOW <50%)
  - **Data Structure Schema** (1 file):
    - `schemas/library/fulencode/v1.0.0/fulencode-config.schema.json`: Configuration schema
  - **Code Generation Infrastructure**:
    - Generator: `scripts/codegen/generate-fulencode-types.ts` (follows fulpack pattern)
    - Verifier: `scripts/codegen/verify-fulencode-types.ts` with drift detection and compilation checks
    - Metadata: `scripts/codegen/fulencode-types/metadata.json` (multi-language configuration)
    - Templates: Python (Jinja2), Go (EJS), TypeScript (EJS) with postprocess scripts (6 files)
    - Makefile integration: `make codegen-fulencode`, `make verify-codegen` includes fulencode
  - **Generated Types** (3 languages):
    - Go: `fulencode/types.go` - EncodingFormat, NormalizationProfile, ConfidenceLevel enums with validators
    - Python: `lang/python/src/crucible/fulencode/enums.py` - str-based Enum classes
    - TypeScript: `lang/typescript/src/fulencode/types.ts` - String literal union types
    - All types compile cleanly with zero errors, pass drift detection
  - **Telemetry Specification**: 14 metrics across 6 categories
    - Core operations (2): `operation.duration_seconds`, `operation.total`
    - Data volume (2): `bytes.processed`, `expansion.ratio`
    - Detection (2): `detect.result_total`, `detect.duration_seconds`
    - Normalization (2): `normalize.total`, `normalize.semantic_changes_total`
    - Security (2): `security.violations_total`, `corrections.total`
    - BOM handling (2): `bom.operations_total`, `bom.mismatches_total`
    - Implementation checklist with operation → metric mapping table
  - **Dependency Guidance**:
    - Python: Pure stdlib (zero PyPI packages) - `base64`, `binascii`, `unicodedata`, `codecs`
    - TypeScript: Pure stdlib (zero npm packages) - `Buffer`, `String.prototype.normalize()`
    - Go: Stdlib + `golang.org/x/text/unicode/norm` (extended stdlib for Unicode normalization, already vendored)
    - Specialized add-ons (Phase 3): `fulencode-detect-pro`, `fulencode-base58`, `fulencode-legacy-{cjk,mainframe,european}`
  - **Custom Normalization Profiles**: Explicit transformation algorithms
    - `safe_identifiers`: Reject zero-width chars, validate Unicode categories, limit combining marks
    - `search_optimized`: Strip accents, case folding, remove punctuation, compress whitespace
    - `filename_safe`: Reject control chars and path separators, normalize spaces, Windows reserved names
    - `legacy_compatible`: Optional transliteration (lossy), strip non-ASCII
  - **Detection Algorithm**: 4-step minimum for Common tier
    - Step 1: BOM detection (UTF-8/16/32 signatures) - HIGH confidence
    - Step 2: UTF-8 validation (legal bytes, no overlong encodings) - HIGH confidence
    - Step 3: NULL pattern detection (UTF-16LE/BE indicators) - HIGH confidence if consistent
    - Step 4: ASCII fallback (all bytes < 0x80) - LOW confidence (ambiguous)
    - No statistical detection in Common tier (deferred to `fulencode-detect-pro` Specialized tier)
  - **Helper Library Feedback**: All 3 teams reviewed and approved
    - tsfulmen (EA Steward): 6 items addressed - detection scope, dependency guidance, types integration, telemetry checklist, packaging
    - pyfulmen: 5 items addressed - minimum detection algorithm, transformation rules, extras naming (`fulencode-{capability}`)
    - gofulmen: Dependency clarification - `x/text` documented as extended stdlib (acceptable exception)
  - **Validation**: All 74 repository schemas meta-validate (includes fulencode)
  - **Status**: ✅ Crucible artifacts complete, ready for helper library implementation

## [0.2.11] - 2025-11-12

### Added

- **Fulpack Type Generation Complete**: Cross-language type bindings for fulpack archive module
  - **TypeScript Types** (`lang/typescript/src/fulpack/`):
    - `types.ts` (172 lines): Enums, interfaces, constants with proper readonly modifiers
    - `index.ts`: Clean module exports for `import { ArchiveFormat } from '@fulmenhq/crucible/fulpack'`
    - Type inference: Automatic TypeScript type mapping from JSON schemas
  - **Go Types** (`fulpack/types.go`):
    - Typed enums with validators (204 lines): `ArchiveFormat`, `EntryType`, `Operation`
    - Validator functions: `ValidateArchiveFormat()`, `ValidateEntryType()`, `ValidateOperation()`
    - Structs: `ArchiveInfo`, `ArchiveEntry`, `ArchiveManifest`, `ValidationResult`, `ExtractResult`
    - Options structs: `CreateOptions`, `ExtractOptions`, `ScanOptions`
  - **Python Types** (completed in v0.2.10, now matched with TypeScript/Go):
    - Enums: `ArchiveFormat`, `EntryType`, `Operation`
    - TypedDicts: Data structures and options
    - Full cross-language parity
  - **Code Generation Infrastructure**:
    - Templates: EJS templates for each language with language-specific postprocessing
    - Generator script: `scripts/codegen/generate-fulpack-types.ts` with type inference functions
    - Verification script: `scripts/codegen/verify-fulpack-types.ts` updated for all 3 languages
    - Compilation checks: `tsc --noEmit`, `go build`, `python -m py_compile`
  - **Metadata Configuration**: `scripts/codegen/fulpack-types/metadata.json` with language configs
  - **Template Fixes**:
    - EJS escaping: Changed `<%=` to `<%-` for raw output (prevents HTML entity encoding)
    - Go switch logic: Moved `return nil` outside switch for correct validator functions
  - **Verification**: All generated types compile cleanly with zero errors across all languages
- **Portable Testing Practices Standard**: Ecosystem-wide testing guidance for deterministic execution
  - **New Standard Document** (`docs/standards/testing/portable-testing-practices.md`):
    - **Core Principles**: Deterministic execution, capability detection, in-memory-first, context propagation, isolated cleanup
    - **Test Modes**: Support for `-short`, `FOO_TEST_FAST=1` flags to disable heavy integrations
    - **Shared Skip Helpers**: Language-specific capability detection (`RequireNetwork(t)` in Go, `require_network()` in Python)
    - **Resource Guards**: Wrap expensive operations with capability checks
  - **Language-Specific Guidance**:
    - **Go**: Bind listeners via `net.Listen("127.0.0.1:0")`, use gofulmen in-memory emitter, context propagation
    - **Python**: pytest fixtures (`tmp_path`, `monkeypatch`), explicit skip messages
    - **TypeScript**: Avoid privileged ports, `get-port` utility, clean up mocked timers/servers in `afterEach`
  - **Integration Points**: Cross-linked from all coding standards and forge standards
  - **Synced to Language Wrappers**: Available in `lang/python/docs/standards/testing/` and `lang/typescript/docs/standards/testing/`

### Changed

- **Coding Standards Updated**: Go, Python, and TypeScript coding standards now reference portable testing practices
- **Forge Standards Updated**: Workhorse, codex, and microtool standards now include testing section references to portable testing guide
- **README Version**: Updated to 0.2.11 with release summary

## [0.2.10] - 2025-11-15

### Added

- **Extension Framework Foundation**: Infrastructure for helper library module extensibility
  - **Registry Split**: Separated module registry into platform-modules (code modules) and foundry-catalogs (reference data)
    - Platform modules: `config/taxonomy/library/platform-modules/v1.0.0/modules.yaml` (17 modules: 7 Core, 10 Common)
    - Foundry catalogs: `config/taxonomy/library/foundry-catalogs/v1.0.0/catalogs.yaml` (7 reference data catalogs)
  - **Module Entry Schema**: Taxonomy-based schema for module registration (`schemas/taxonomy/library/modules/v1.0.0/module-entry.schema.json`)
    - Three tiers: Core (always present), Common (default install), Specialized (opt-in)
    - Implementation transparency field (stdlib vs third-party packages)
    - Evidence pointers (schemas, config, fixtures) for validation
    - Cross-language status tracking (planned, available, deprecated)
  - **Validation Script**: Comprehensive module registry validator (`scripts/validate-module-registry.ts`)
    - 7 automated checks: orphan detection, dead entries, evidence validation, cross-language status, schema compliance, tier rules, cross-references
    - Artifact discovery from schemas/config/fixtures
    - Zero errors, zero warnings validation target
  - **Canonical Façade Principle**: Documented in Helper Library Standard
    - Helper libraries provide canonical façades for ALL functionality (even stdlib wrappers)
    - Ensures cross-language consistency, unified error envelopes, taxonomy-driven design
    - Implementation strategy flexibility (stdlib, third-party, custom) per language
    - Single API surface principle: applications import from helper library, never directly from stdlib/third-party
  - **Sync Integration**: Module registry synced to language wrappers alongside schemas/docs
- **Fulpack Archive Module Specification**: Common-tier archive operations with Pathfinder integration
  - **Taxonomy Schemas** (3 files):
    - `schemas/taxonomy/library/fulpack/archive-formats/v1.0.0/formats.yaml`: Defines tar.gz, zip, gzip with feature matrices
    - `schemas/taxonomy/library/fulpack/operations/v1.0.0/operations.yaml`: 5 canonical operations (create, extract, scan, verify, info)
    - `schemas/taxonomy/library/fulpack/entry-types/v1.0.0/types.yaml`: Entry types (file, directory, symlink)
  - **Data Structure Schemas** (8 files in `schemas/library/fulpack/v1.0.0/`):
    - `archive-info.schema.json`: Archive metadata (format, sizes, compression ratio)
    - `archive-entry.schema.json`: Entry metadata (path, type, size, checksum, mode)
    - `archive-manifest.schema.json`: Complete TOC with optional indexes
    - `validation-result.schema.json`: Integrity verification results
    - `create-options.schema.json`: Archive creation parameters
    - `extract-options.schema.json`: Extraction parameters with security limits
    - `scan-options.schema.json`: Scanning parameters (Pathfinder integration)
    - `extract-result.schema.json`: Extraction operation results
  - **Canonical API**: 5 verb-based operations working across all formats
    - `create(source, output, format, options?)` - Create archives from files/directories
    - `extract(archive, destination, options?)` - Extract with explicit destination (no CWD)
    - `scan(archive, options?)` - List entries without extraction (Pathfinder integration)
    - `verify(archive, options?)` - Validate integrity, checksums, detect threats
    - `info(archive)` - Get metadata without extraction (format detection, size estimation)
  - **Security Model**: Mandatory protections for all implementations
    - Path traversal protection (reject `../`, absolute paths)
    - Decompression bomb protection (size/entry limits, compression ratio monitoring)
    - Checksum verification (SHA-256 default, fail on mismatch)
    - Safe defaults (explicit destination, error on overwrite, no symlink following)
  - **Pathfinder Integration**: Unified glob searches across filesystems and archives
    - `scan()` operation returns `ArchiveEntry[]` for Pathfinder pattern matching
    - No extraction required (fast TOC read, <1s target)
    - Edge case handling documented: symlinks, invalid UTF-8, absolute paths, traversal attempts
    - Deterministic cross-language behavior requirements
  - **Error Envelope**: Canonical error codes across 3 categories
    - Validation errors (3 codes): INVALID_ARCHIVE_FORMAT, INVALID_PATH, INVALID_OPTIONS
    - Security errors (5 codes): PATH_TRAVERSAL, ABSOLUTE_PATH, SYMLINK_ESCAPE, DECOMPRESSION_BOMB, CHECKSUM_MISMATCH
    - Runtime errors (5 codes): ARCHIVE_NOT_FOUND, ARCHIVE_CORRUPT, EXTRACTION_FAILED, PERMISSION_DENIED, DISK_FULL
    - FulpackError structure with code, message, path, archive, operation, details fields
  - **Test Fixtures** (3 archives in `config/library/fulpack/fixtures/`):
    - `basic.tar.gz` (740B): Normal structure for basic operations
    - `nested.zip` (3.2KB): 3-level directory nesting
    - `pathological.tar.gz` (816B): Security test cases (path traversal, absolute paths, symlinks)
  - **Fixture Governance**: Naming conventions, approval process, documentation requirements
  - **Module Documentation**: Complete specification at `docs/standards/library/modules/fulpack.md` (800+ lines)
  - **Streaming API**: Planned for v0.2.11, current schemas forward-compatible (no breaking changes needed)
  - **Registry Entry**: Added to platform-modules.yaml (Common tier, depends on pathfinder)

### Changed

- **Helper Library Standard**: Enhanced with Canonical Façade Principle and Module Registry Compliance requirement
  - Requirement #10: All helper libraries MUST comply with module registry (platform-modules + foundry-catalogs)
  - Canonical Façade Principle section: Detailed explanation of façade pattern, when to wrap stdlib, implementation flexibility
  - Updated module tier descriptions with extension framework context
- **AGENTS.md**: Clarified that `.plans/` files are NEVER committed (gitignored, attempts to add will fail)

## [0.2.9] - 2025-11-10

### Added

- **L'Orage Central DevSecOps Schemas (Wave 4 Complete)**: Final wave of experimental SemVer schemas for DevSecOps platform
  - **Recipe Schema** (`schemas/devsecops/lorage-central/recipe/v1.0.0/recipe.schema.json`): Pipeline recipe definitions with strategy patterns
    - Comprehensive strategy metadata (template patterns, security frameworks, delivery models)
    - Trigger configuration (manual, scheduled, event-driven, approval-based)
    - Parameter templating with type system (string, number, boolean, choice, secret)
    - Reference architecture with canonical examples
    - Default configuration (`config/devsecops/lorage-central/recipe/v1.0.0/defaults.yaml`)
  - **Runbooks Schema** (`schemas/devsecops/lorage-central/runbooks/v1.0.0/runbooks.schema.json`): Operational procedure automation
    - Multi-step procedure definitions with sequencing and conditional logic
    - Rich step metadata (type, executor, timeout, retry, success criteria)
    - Emergency runbook support with elevated privilege handling
    - Rollback and validation capabilities per step
    - Default configuration (`config/devsecops/lorage-central/runbooks/v1.0.0/defaults.yaml`)
  - **Taxonomy Extensions**: Updated `config/taxonomy/devsecops/` with recipe strategies and runbook types
  - **ADR-0011**: Architectural decision record for experimental L'Orage Central schemas with SemVer adoption
    - Rationale for experimental SemVer pattern (v1.0.0 with semver-experimental tag)
    - Multi-wave delivery plan (Activity, Credentials, Policy, Tenant, Recipe, Runbooks)
    - Integration model with Crucible via helper library shims
    - Graduation criteria for moving from experimental to stable
- **Microtool Repository Category**: New taxonomy category for ultra-narrow, single-purpose CLI deployment/automation tools
  - **Category Definition** (`config/taxonomy/repository-categories.yaml`): Strict architectural constraints for microtools
    - MUST have single primary purpose (e.g., fixture deployment, config synchronization)
    - MUST be written in Go, TypeScript/Bun, or Rust only
    - SHOULD import helper library (gofulmen, tsfulmen, or rsfulmen)
    - MUST NOT export packages or be imported by other repositories (one-way dependency flow)
    - MUST obey exit codes, signals, logger, config standards
  - **Microtool Standard** (`docs/architecture/fulmen-forge-microtool-standard.md`): Comprehensive standard covering language constraints, helper library requirements, directory structure, required modules, and security considerations
  - **Language-Matching Naming Pattern**: Template naming follows `forge-microtool-{instrument}` where instrument first letter matches language (G-instruments for Go: grinder/gauge/gouge, T-instruments for TypeScript: tongs/tap/trammel, R-instruments for Rust: rasp/reamer/router)
  - **Schema Updates**: Added `microtool` to category key enum (`schemas/taxonomy/repository-category/v1.0.0/category-key.schema.json`)
  - **Validation Support**: Updated `scripts/validate-schemas.ts` to recognize microtool category
- **Repository Naming Standard**: Comprehensive naming conventions for FulmenHQ repositories and binaries (`docs/standards/repository-naming-standard.md`)
  - Fulmen-specific vs generic naming patterns (when to use `fulmen-` prefix)
  - Conflict avoidance rules with prohibited well-known binaries list
  - Required research checklist (GitHub, npm, PyPI, Homebrew, Docker Hub)
  - Maintainer approval process for all new repository names
  - Emergency exception clause for critical production issues
  - Naming decision matrix and examples for all repository categories
- **Crucible Documentation Access Patterns**: Comprehensive cross-language guidance for accessing Crucible documentation programmatically
  - **Crucible Shim Enhancement** (`docs/standards/library/modules/crucible-shim.md`): New "Accessing General Documentation" section
    - Common documentation paths reference table (standards/, architecture/, guides/, sop/)
    - Four real-world use cases with complete code examples (commit hooks, doc generators, CI validators, template refit tools)
    - Cross-language API consistency table (Go, Python, TypeScript)
    - Complete working examples: Go and Python commit hook validators accessing agentic-attribution standard
    - Sustainability guidance and anti-patterns to avoid (no local filesystem reads, no HTTP requests, no git cloning)
  - **Forge Standards Integration**: All forge standards updated with documentation access examples
    - Microtool use cases: commit validation, doc generation, CI compliance, template automation
    - Workhorse use cases: runtime compliance validation, API documentation generation, operational playbooks
    - Codex use cases: searchable content ingestion, API reference generation, schema registry displays
- **Module Compliance Matrix**: New comprehensive tracking matrix for helper library module adoption (`docs/architecture/module-compliance-matrix.md`)
  - Compliance status across gofulmen, pyfulmen, tsfulmen for all modules
  - Implementation phase tracking (Not Started, In Development, Testing, Stable, Deprecated)
  - Module-by-module requirements and standards references
  - Helper library maintainer coordination guide

### Changed

- **Forge Standards Enhancement Based on Real Implementation Feedback** (forge-microtool-gimlet validation)
  - **Microtool Standard** (`docs/architecture/fulmen-forge-microtool-standard.md`):
    - **API Corrections**: All examples verified against gofulmen v0.1.10
      - Fixed App Identity: `appidentity.Get(ctx)` with fields (not methods): `identity.BinaryName`
      - Fixed Logging: `logging.NewCLI(serviceName)` with `zap.Field` helpers
      - Fixed Signals: `signals.OnShutdown()`, `signals.EnableDoubleTap()`, `signals.Listen()`
      - Fixed Exit Codes: `foundry.ExitSuccess`, `foundry.ExitFailure`
    - **Configuration Pattern Overhaul**: Microtools NEVER use Enterprise Three-Layer Config
      - Removed: Three-Layer Config (RECOMMENDED)
      - Added: Simple Config Pattern (REQUIRED) - two-layer: defaults → user overrides
      - Explicit graduation criteria: needing enterprise config → promote to CLI category
    - **Crucible Shim Refinement**: Changed from RECOMMENDED to CONDITIONAL
      - REQUIRED for: schema validators, taxonomy tools, commit hooks, doc generators, CI validators
      - Skip for: tools without Crucible asset dependencies (most microtools like gimlet)
    - **Reference Implementation**: Added section pointing to forge-microtool-gimlet with key file references
  - **CDRL Template Standard** (`docs/architecture/fulmen-template-cdrl-standard.md`):
    - **Working Implementation Pattern**: New comprehensive section
      - Build requirements: templates MUST compile/build/test/run as-is
      - IDE experience: syntax highlighting, type checking, auto-complete MUST work
      - CI/CD requirements: templates run linting, testing, building in CI
      - Comparison table: Fulmen Forge vs Literal Templates (Cookiecutter/Yeoman)
    - **Anti-Pattern Documentation**: NO `.template` file suffixes
      - Templates ship working files (`go.mod`, `app.yaml`), NOT `.template` variants
      - Users edit in place during CDRL refit
      - Validation catches hardcoded references, no manual find-replace
  - **Workhorse Standard** (`docs/architecture/fulmen-forge-workhorse-standard.md`):
    - Updated Crucible Shim with documentation access APIs and use case examples
  - **Codex Standard** (`docs/architecture/fulmen-forge-codex-standard.md`):
    - Updated Crucible Shim with documentation ingestion use case examples
- **Enterprise Three-Layer Config Module Renaming**: Renamed for clarity and explicit positioning
  - **File renamed**: `three-layer-config.md` → `enterprise-three-layer-config.md`
  - **Module Spec Updates** (`docs/standards/library/modules/enterprise-three-layer-config.md`):
    - Added "when to use" guidance: workhorse services, complex CLI tools, apps requiring SSOT compliance
    - Added "when NOT to use" guidance: microtools (use Simple Config Pattern), simple apps, prototypes
    - Clarified "three layers" = SSOT Defaults → User Config → Runtime Overrides
    - Added precedence explanation: Layer 3 (runtime) > Layer 2 (user) > Layer 1 (SSOT)
  - **Cross-References Updated**: 13 files updated across all forge standards, helper library docs, and module manifests
- **Ecosystem Guide Enhancement** (`docs/architecture/fulmen-ecosystem-guide.md`): Expanded coverage of helper libraries, forge templates, and module integration patterns
  - Added module compliance matrix cross-reference
  - Enhanced helper library coordination guidance

### Documentation

- **ADR-0011**: Comprehensive decision record for experimental L'Orage Central DevSecOps schemas
  - Documents rationale for SemVer adoption in experimental schemas
  - Outlines multi-wave delivery plan and integration model
  - Establishes graduation criteria for stable schema promotion

## [0.2.8] - 2025-11-07

### Added

- **CDRL Template Standard System**: Comprehensive documentation and validation framework for template customization workflows
  - **Architectural Standard** (`docs/architecture/fulmen-template-cdrl-standard.md`): Complete CDRL (Clone → Degit → Refit → Launch) compliance requirements for all forge templates
  - **Workflow Guide** (`docs/standards/cdrl/workflow-guide.md`): Step-by-step user instructions for customizing templates (4,800+ words)
  - **Reference Bootstrap Pattern** (`docs/standards/cdrl/reference-bootstrap.md`): Manifest-driven tool installation pattern for reproducible development environments (18,000+ words)
    - Complete `.goneat/tools.yaml` manifest schema specification
    - Canonical implementations by language (Python: percheron, TypeScript: aurora TBD, Go: native)
    - Template maintainer adaptation guidance with step-by-step instructions
    - Security requirements (checksum verification, HTTPS downloads)
    - CI/CD integration examples and testing checklists
  - **Required Documentation Outline**: Canonical structure for `fulmen_cdrl_guide.md` with 10 mandatory sections
  - **Template Documentation Structure**: Optional supplementary guides (`tooling-guide.md`, `customization-advanced.md`, `distribution-options.md`)
  - **Validation Targets**: Required Makefile targets (`validate-app-identity`, `doctor`) with implementation specifications
  - **Parameterization Reference Tables**: Complete documentation of all customization points per template type
  - **CDRL Compliance Sections**: Added to both Workhorse and Codex forge standards with validation requirements and bootstrap script recommendations
- **Forge Template Categories**: Three new repository categories in taxonomy
  - `forge-workhorse`: Production-ready backend service templates (groningen, percheron)
  - `forge-codex`: Documentation site templates (aurora, future implementations)
  - `forge-gymnasium`: Experimental templates (optional CDRL compliance until graduation)
- **Makefile Standard Annex B**: Template repository CDRL validation targets specification with exit codes, implementation examples, and CI integration guidance

### Changed

- **Sync Pipeline Enhancement**: Two-stage snapshot generation process prevents YAML/JSON drift
  - Stage 1: Regenerate JSON snapshots from YAML catalogs (`scripts/generate-exit-code-snapshots.ts`)
  - Stage 2: Generate language bindings from fresh snapshots and sync assets
  - `make sync` now includes automatic snapshot generation before codegen
  - Added standalone `make generate-snapshots` target for manual invocation
- **Validation Script**: Updated `scripts/validate-schemas.ts` to recognize new forge template categories
- **Directory Structure Standard**: Templates now specify `docs/development/` structure with REQUIRED `fulmen_cdrl_guide.md` and OPTIONAL supplementary guides

### Fixed

- **Exit Codes Snapshot Staleness**: Resolved YAML enhancements not propagating to JSON snapshots
  - Issue: Signal handling semantics added to YAML (v0.2.5) but snapshots not regenerated
  - Impact: Helper library tests failing with description mismatches (e.g., "Hangup signal (SIGHUP)" vs expected "Hangup signal (SIGHUP) - config reload via restart")
  - Solution: Automated snapshot generation in sync pipeline ensures consistency
  - Prevents future YAML/snapshot drift through two-stage build process

### Documentation

- **Sync Model Documentation**: Updated `docs/architecture/sync-model.md` with two-stage pipeline explanation (snapshot generation → codegen → sync)
- **Cross-Linking Network**: All CDRL documents properly reference each other (architectural standard ↔ workflow guide ↔ Makefile standard ↔ forge standards ↔ taxonomy)
- **Repository Taxonomy**: Added CDRL references to workhorse, codex, and new forge-\* categories with comprehensive standards links

## [0.2.7] - 2025-11-06

### Added

- **Prometheus Exporter Metrics Taxonomy**: Added 7 canonical metrics for Prometheus exporter observability
  - `prometheus_exporter_refresh_duration_seconds` - Histogram tracking refresh cycle latency with ADR-0007 buckets (converted to seconds)
  - `prometheus_exporter_refresh_total` - Counter for total refresh cycles with result labels (success|error)
  - `prometheus_exporter_refresh_errors_total` - Counter for detailed error classification by error_type
  - `prometheus_exporter_refresh_inflight` - Gauge tracking concurrent refresh operations
  - `prometheus_exporter_http_requests_total` - Counter for HTTP scrape/exposition requests
  - `prometheus_exporter_http_errors_total` - Counter for HTTP exposition failures
  - `prometheus_exporter_restarts_total` - Counter for exporter restart events
  - Standardized label value enumerations (phase, result, error_type, status, path, reason)
  - Dual counter emission rules with mathematical invariants
  - Prometheus client defaults guidance with code examples (TypeScript, Python, Go)
- **Module Telemetry Metrics**: Added 19 metrics for Foundry, Error Handling, and FulHash modules
  - **Foundry Module** (12 metrics): MIME type detection counters and histograms per content type (JSON, XML, YAML, CSV, plain text, unknown)
  - **Error Handling Module** (2 metrics): Error wrap operation counters and latency histograms
  - **FulHash Module** (5 metrics): Hash algorithm distribution (XXH3-128, SHA256), byte throughput, operation latency
  - Per-type metrics design avoids high cardinality labels while enabling algorithm-specific performance analysis
- **Metric Namespace Governance Framework**: Comprehensive rules for module vs application metrics
  - Reserved prefixes for Fulmen modules (`foundry_*`, `error_handling_*`, `fulhash_*`, `prometheus_exporter_*`, etc.)
  - Required vs optional module metrics distinction
  - Application metric naming conventions (binary-prefixed: `percheron_*`, `groningen_*`)
  - Three-tier architecture documentation (module internals, infrastructure, application)
  - Collision prevention guidelines and petition process
- **Taxonomy Version Sync Automation**: Repository VERSION now propagates to taxonomy automatically
  - `scripts/update-version.ts` updates `config/taxonomy/metrics.yaml` version field
  - `scripts/validate-taxonomy-version.ts` validates taxonomy version matches repository VERSION
  - Integrated into `make validate-schemas` (fails CI on mismatch)
  - Defense-in-depth: version sync at `make version-set`, `make version-propagate`, and `make sync`
- **Metrics Test Fixtures**: Comprehensive test fixtures for validation and parity testing
  - `tests/fixtures/metrics/prometheus/` - 7 valid Prometheus metric fixtures + 1 invalid
  - `tests/fixtures/metrics/general/` - 2 general metric fixtures (counter, histogram)
  - `tests/README.md` - Complete fixture documentation with parity testing examples
  - All fixtures conform to `schemas/observability/metrics/v1.0.0/metrics-event.schema.json`
- **Seconds Unit Support**: Added `s` (seconds) to `metricUnit` enum for Prometheus-native histogram conventions
  - Reuses ADR-0007 millisecond buckets divided by 1000: `[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]` seconds
  - Explicit conversion guidance to prevent double-conversion errors
- **Telemetry Metrics Documentation Enhancement**: Comprehensive SSOT for telemetry implementation
  - New "Prometheus Exporter Metrics" section with complete specification tables
  - Label value standards with allowed enumerations and cardinality warnings
  - Histogram bucket conversion guidance (ADR-0007 ms → seconds)
  - Dual counter emission rules with PromQL examples and mathematical invariants
  - Prometheus client defaults guidance (register.clear(), REGISTRY.unregister(), custom registries)
  - Metric namespace governance with module/application separation
  - Three-tier metric architecture explanation
  - Compatibility matrix for helper library adoption
  - Cross-language consistency requirements

### Changed

- **Taxonomy Versioning Scheme**: Switched from CalVer (`2025.10.3`) to SemVer (`0.2.7`) aligned with repository VERSION per ADR-0010
  - Schema pattern updated: `"^\\d{4}\\.\\d{2}\\.\\d+$"` → `"^\\d+\\.\\d+\\.\\d+$"`
  - Version description updated: "Taxonomy version (SemVer, aligned with Crucible releases)"
  - Synchronization safeguards ensure taxonomy version never drifts from repository VERSION
- **Makefile Version Targets**: Enhanced to update taxonomy automatically
  - `make version-set`, `make version-propagate`, `make version-bump-*` now update taxonomy
  - Version consistency validated in CI pipeline via `make validate-schemas`

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
