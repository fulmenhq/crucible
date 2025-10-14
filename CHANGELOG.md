# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to CalVer (`YYYY.MM.REVISION`).

## [Unreleased]

### Changed

- Reorganized `docs/standards/library/` into module- and catalog-specific folders with synced language copies
- Promoted the Foundry catalog to a core module in the manifest and broadened schema validation coverage
- Added Biome formatting to the `make fmt` target to keep TypeScript schemas formatted after sync
- Introduced progressive logging profiles, policy enforcement, and updated schemas under `schemas/observability/logging/v1.0.0/`
- Enhanced coding standards (Go, Python, TypeScript) with schema-driven configuration hydration patterns and schema contract fixture requirements
- Updated observability logging standard with progressive logging playbook, schema field naming conventions, and shared fixture guidance

### Added

- Ecosystem-level documentation (`docs/architecture/fulmen-ecosystem-guide.md`, `docs/architecture/fulmen-technical-manifesto.md`) summarizing history, architecture, and standards alignment
- Repository lifecycle standard and schema (`docs/standards/repository-lifecycle.md`, `schemas/config/repository/v1.0.0/lifecycle-phase.json`) for consistent quality gating across Fulmen repos
- Schema-driven configuration hydration sections in all language coding standards (Go §3.4, Python §3.5, TypeScript §3.5)
- Schema contract fixtures and golden events testing sections in all language coding standards (Go §5.4, Python §5.4, TypeScript §5.5)
- Progressive logging playbook table in observability logging standard with profile-specific defaults and middleware requirements
- Schema field naming and policy integration guidance in observability logging standard

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
