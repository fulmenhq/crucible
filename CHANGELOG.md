# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to CalVer (`YYYY.MM.REVISION`).

## [Unreleased]

## [2025.10.5] - 2025-10-29

### Changed

- **BREAKING: Go Module Relocated to Repository Root**: Moved Go module from `lang/go/` to repository root enabling standard external installation (`go get github.com/fulmenhq/crucible` now works without replace directives), direct SSOT embedding via `//go:embed`, and eliminating Go-specific sync overhead. See [ADR-0009](docs/architecture/decisions/ADR-0009-go-module-root-relocation.md) for rationale and [lang/go/README.md](lang/go/README.md) for migration guide. **Action Required**: Update to v2025.10.5 and remove any `replace` directives from `go.mod`.
- **Sync Script Optimization**: `scripts/sync-to-lang.ts` no longer syncs to `lang/go/` as Go module embeds directly from root SSOT (schemas/, docs/, config/). Python and TypeScript sync unchanged.
- **Makefile Simplification**: Go targets (`test-go`, `build-go`, `lint`) now run from repository root without `cd lang/go`, aligning with standard Go module workflow.

## [2025.10.4] - 2025-10-28

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

## [2025.10.3] - 2025-10-28

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

## [2025.10.2] - 2025-10-22

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

## [2025.10.1] - 2025-10-01

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
