# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

---

## v0.4.8 - Process Fix

Fixes sync process gap from v0.4.7 release.

### Fixed

- **Biome Schema**: Updated to 2.3.10 (was 2.3.2)
- **Precommit Sync**: Added `sync-to-lang` as explicit dependency of `precommit` target
  - v0.4.7 tag was missing `qa.yaml` in `lang/*/config/` due to sync running after tagging
  - Now ensures lang directories are current before any commit

See [release-notes/v0.4.8.md](release-notes/v0.4.8.md) for details.

---

## v0.4.7 - Quality Assurance Role

Adds a new `qa` agentic role for testing, validation, and quality gate enforcement across the Fulmen layer cake.

### Highlights

- **Layer-Cake Validation**: Schema conformance, cross-language parity, CRDL workflow testing
- **Coverage Targets**: Go ≥95%, TypeScript ≥85%, Python ≥90%
- **Fixture-First Testing**: Real execution over mocks, container-based fixtures
- **Dogfooding Workflows**: Acceptance testing patterns with detailed findings templates

### Added

- **Quality Assurance Role** (`config/agentic/roles/qa.yaml`)
  - Scope: test design, edge cases, quality gates, regression testing
  - Layer cake validation: SSOT conformance, library parity, template CRDL
  - Enterprise validation: API contracts, AAA, observability
  - Operational QA: dogfooding, performance baselines, fixture management
  - Mindset: "What could go wrong?", "Would this test catch a regression?"
  - Quality bars with language-specific coverage targets
  - Example findings templates for dogfooding and parity testing

### Impact

- **Helper library teams**: QA role validates cross-language parity
- **Fixture maintainers**: QA validates scenario coverage
- **Release process**: QA escalates quality gate failures blocking release

See [release-notes/v0.4.7.md](release-notes/v0.4.7.md) for details.

---

## v0.4.6 - OpenAPI Spec Coverage Standard

Establishes ecosystem-wide standards for OpenAPI specification verification, preventing spec drift across fixtures and workhorses.

### Highlights

- **ADR-0014**: New decision record for OpenAPI spec coverage testing
- **Tiered Requirements**: Fixtures MUST, Workhorses SHOULD, DX tools MAY
- **Coverage Testing**: Automated verification that specs cover all registered routes
- **Cross-Standard Integration**: Updates to fixture, workhorse, codex, and HTTP standards

### Added

- **ADR-0014: OpenAPI Spec Coverage Tests** (`docs/architecture/decisions/ADR-0014-openapi-spec-coverage.md`)
  - Problem: Spec drift when endpoints added without OpenAPI annotations
  - Solution: Automated coverage test comparing router to spec
  - Tiered requirements by repository category
  - Intentional exclusions for experimental/internal endpoints
  - CI workflow: `make openapi` before `make test`
  - Swagger 2 and OpenAPI 3 compatibility
  - Release asset guidance for `dist/release/` inclusion
  - Provenance via `info.x-*` extensions (tooling-safe)

- **OpenAPI Publication Section** (`docs/architecture/fulmen-fixture-standard.md`)
  - MUST: generation, serving at `/openapi.yaml`, coverage test, CI workflow
  - Build patterns: `dist/openapi.yaml` (gauntlet) or embedded (rampart)
  - Both patterns acceptable with deterministic serving

- **OpenAPI Verification Section** (`docs/guides/testing/http-server-patterns.md`)
  - Spec drift problem explanation
  - Coverage test Go implementation pattern
  - CI integration example
  - Exclusion list guidance

### Changed

- **HTTP REST Standard**: Added OpenAPI Documentation section
- **Workhorse Standard**: Added `/openapi.yaml` endpoint reference
- **Codex Standard**: Cross-link for upstream spec quality (Pillar III)
- **Fixture Author Checklist**: Added OpenAPI coverage items

### Impact

- **Fixture maintainers**: Implement coverage tests per ADR-0014
- **Workhorse maintainers**: Consider OpenAPI publication for HTTP APIs
- **gauntlet/rampart**: Local ADR-0001 now superseded by Crucible ADR-0014

See [release-notes/v0.4.6.md](release-notes/v0.4.6.md) for details.
