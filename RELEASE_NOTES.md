# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

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
  - HTTP server → http-server-patterns.md → http-rest-standards, coding/{lang}
  - HTTP client → http-client-patterns.md → http-rest-standards, coding/{lang}
  - CLI → language-testing-patterns.md → portable-testing-practices
  - Fixture → fixture-standard.md → http-server-patterns
  - Schema → schema-normalization.md → frontmatter-standard
  - Release → release-checklist.md → repository-versioning

- **Go HTTP Handler Anti-Patterns** (in http-server-patterns.md)
  - `json.Encoder.Encode()` error handling after `WriteHeader()`
  - Response body close with per-file test helpers (`closeBody`)
  - Context-aware delay handlers (no bare `time.Sleep()`)
  - Body limits with `io.LimitReader` for DoS prevention
  - Derived from 25+ lint fixes in rampart/gauntlet

- **Cross-Linking Updates**
  - `docs/standards/testing/README.md` → testing guides
  - `docs/standards/coding/go.md` §8 → http-server-patterns
  - `docs/architecture/fulmen-fixture-standard.md` → both testing guides
  - `docs/standards/protocol/http-rest-standards.md` → both testing guides
  - `docs/guides/README.md` → new Testing section

- **UX Developer Role** (`config/agentic/roles/uxdev.yaml`)
  - New agentic role for frontend development (TUI and web)
  - TUI frameworks: tview (Go), textual (Python), ink/opentui (Node), ratatui (Rust)
  - Web frameworks: React, Vue, Svelte, HTMX
  - Accessibility-first with WCAG 2.1 AA compliance focus
  - Checklists for components, TUI-specific, and web-specific concerns
  - Patterns: Model-View-Update, component composition, focus management

### Changed

- **Document Taxonomy Clarified**: Three document types formalized
  - Standards: Normative (MUST/SHOULD)
  - Guides: Compliance routing + practical examples
  - Architecture: System structure and rationale

### Impact

- **All developers (human + AI)**: Use work-type routing in AGENTS.md to find applicable standards
- **devrev role**: Use Pre-Review Checklists in guides for systematic compliance validation
- **Fixture authors**: Follow Fixture Author Conformance Checklist in http-server-patterns

See [release-notes/v0.4.5.md](release-notes/v0.4.5.md) for details (created at release time).

---

## v0.4.4 - Signal Resolution Standard

Standardizes ergonomic signal name resolution across all Fulmen helper libraries.

### Highlights

- **Signal Resolution API**: New `resolveSignal()`, `listSignalNames()`, `matchSignalNames()` interfaces
- **Cross-Language Fixtures**: 41 test vectors for consistent behavior across Go, Python, TypeScript, Rust
- **Numeric Support**: `kill -15` pattern supported (`"15"` → SIGTERM)
- **Signals Documentation**: Comprehensive section added to Foundry README

### Added

- **Signal Resolution Interfaces** (`docs/standards/library/foundry/interfaces.md`)
  - `resolveSignal(name)` - 7-step resolution: trim → empty check → exact → numeric → uppercase → ID fallback → null
  - `listSignalNames()` - CLI completion support
  - `matchSignalNames(pattern)` - glob matching with `*` and `?`
  - Language-idiomatic signatures for Go, Python, TypeScript, Rust

- **Test Fixtures** (`config/library/foundry/signal-resolution-fixtures.yaml`)
  - 41 test cases covering exact match, numeric, case variants, whitespace, ID fallback, negative numbers
  - Glob pattern test cases with expect_contains, expect_not_contains, expect_empty
  - Schema validation at `schemas/library/foundry/v1.0.0/signal-resolution-fixtures.schema.json`

- **Signals Section** (`docs/standards/library/foundry/README.md`)
  - Catalog overview with signal table
  - Behavior definitions (graceful_shutdown, reload_via_restart, etc.)
  - Platform support matrix
  - Helper library integration requirements
  - Resolution algorithm specification
  - Windows fallback documentation

### Changed

- **Resolution Algorithm**: Numeric lookup at step 4 (after trim, before case normalization)
  - Supports common `kill -15` CLI pattern
  - Negative numbers explicitly return null (`"-15"` → null)
  - `signalsByNumber` index recommended for efficient lookup

### Impact

- **All helper libraries**: Implement new resolution interfaces
- **rsfulmen**: Reference implementation, aligned with v0.1.2 feature brief
- **gofulmen**: Add `signalsByNumber` index to `foundry/signals/catalog.go`

See [release-notes/v0.4.4.md](release-notes/v0.4.4.md) for details.

---

## v0.4.3 - Fixture Standard Refinement + Python Fix

Minor release refining fixture naming conventions and fixing Python module exports.

### Highlights

- **Fixture Naming**: Explicit variant codes now required (no implicit `-001`)
- **New Fixture**: Registered `rampart` for HTTP protocol testing
- **Bug Fix**: Corrected `foundry/__init__.py` to export actual `exit_codes.py` API

### Added

- **Ecosystem Brand Summary**: `config/branding/ecosystem.yaml`
  - Accessible via `crucible.GetBrandSummary()` in helper libraries
  - Tools display via `version --extended` or `about` command/endpoint
  - Answers "what is this?" without cluttering repo/binary names

- **`rampart` fixture**: HTTP protocol testing server for client validation
  - `fixture-server-proving-rampart-001`: Core HTTP/1.1 scenarios
  - Future variants planned for HTTP/2 and performance testing

### Changed

- **Fixture naming convention**: Variant codes are explicitly required
  - `fixture-server-proving-rampart-001` (correct)
  - `fixture-server-proving-rampart` (no longer valid)
  - Prevents breaking changes when adding variants

### Fixed

- **Python Foundry Module**: `__init__.py` exported non-existent symbols
  - Now exports correct API: `EXIT_CODE_METADATA`, `ExitCodeInfo`, `SimplifiedMode`, etc.
  - Affected v0.4.1 and v0.4.2

### Impact

- **Fixture creators**: Use explicit variant codes from day one
- **pyfulmen**: Remove workarounds after syncing v0.4.3

See [release-notes/v0.4.3.md](release-notes/v0.4.3.md) for details.
