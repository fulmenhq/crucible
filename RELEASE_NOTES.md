# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

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

---

## v0.4.5 - TUI Design System + Standards Discoverability

Introduces a layered design system architecture for terminal UIs and establishes guides as compliance routing documents.

### Highlights

- **TUI Design System**: 9 schemas enabling terminal theming with capability-based fallbacks
- **Core/Implementation Split**: Shared semantic vocabulary (core) + terminal-specific patterns (tui)
- **Reference Themes**: Dark and high-contrast themes with WCAG compliance
- **Compliance Routing**: Guides now explicitly list "read these standards first" with checklists
- **Work-Type Routing**: AGENTS.md maps work types to required reading

### Added

- **TUI Design System Schemas** (`schemas/design/`)
  - Core vocabulary (`core/v1.0.0/`): semantic-colors, spacing-scale, typography-roles, component-states
  - TUI implementation (`tui/v1.0.0/`): theme (root), color-palette, typography, layout, component
  - Terminal color fallbacks: truecolor → 256-color → 16-color → basic
  - Character set degradation: unicode-full → unicode-basic → extended-ascii → ascii
  - WCAG contrast ratios on color definitions for accessibility validation
  - Nerd Font glyph support with unicode/ascii fallbacks
  - CJK width handling for internationalization
  - Responsive breakpoints adapted for terminal dimensions (columns/rows)

- **Reference Themes** (`examples/design/tui/v1.0.0/themes/`)
  - `dark.yaml` - Tokyo Night-inspired, 256-color minimum, WCAG AA compliant
  - `light.yaml` - Balanced light mode for daytime use, WCAG AA compliant
  - `high-contrast.yaml` - WCAG AAA compliant, 16-color minimum, ASCII-safe

- **Schema Fixtures** (`examples/design/tui/v1.0.0/{valid,invalid}/`)
  - Minimal valid examples for theme, color-palette, layout
  - Invalid examples for validation testing (missing fields, bad patterns)

- **Testing Guides Family** (`docs/guides/testing/`)
  - `README.md` - Testing guides index explaining standards vs guides distinction
  - `http-server-patterns.md` - Server/fixture patterns with compliance requirements
  - `http-client-patterns.md` - Client testing with rampart/gauntlet fixture usage

- **AGENTS.md Work-Type Routing** - New section mapping work types to required reading

- **Go HTTP Handler Anti-Patterns** (in http-server-patterns.md)
  - `json.Encoder.Encode()` error handling after `WriteHeader()`
  - Response body close with per-file test helpers (`closeBody`)
  - Context-aware delay handlers (no bare `time.Sleep()`)
  - Body limits with `io.LimitReader` for DoS prevention

- **UX Developer Role** (`config/agentic/roles/uxdev.yaml`)

### Changed

- **Document Taxonomy Clarified**: Three document types formalized

### Impact

- **All developers (human + AI)**: Use work-type routing in AGENTS.md to find applicable standards
- **devrev role**: Use Pre-Review Checklists in guides for systematic compliance validation
- **Fixture authors**: Follow Fixture Author Conformance Checklist in http-server-patterns

See [release-notes/v0.4.5.md](release-notes/v0.4.5.md) for details.
