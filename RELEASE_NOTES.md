# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

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
