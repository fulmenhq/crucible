# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note**: Versions 0.1.0 through 0.1.4 were originally released with CalVer tags (v2025.10.1 through v2025.10.5). Retroactive SemVer tags have been added for migration continuity. See [ADR-0010](docs/architecture/decisions/ADR-0010-semantic-versioning-adoption.md) for details.

## [Unreleased]

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
