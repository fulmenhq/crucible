# Release Notes

This file contains release notes for three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.11 - Role Schema Compliance & Upstream v0.1.9

**Updated all 11 agentic roles with `domains` property for business-process organization, synced latest 3leaps/crucible v0.1.9 with formatted schemas and governance role enhancements.**

### Why This Matters

**For role catalog consistency**: Every agentic role now complies with the enhanced role-prompt schema, enabling business-process organization across the FulmenHQ ecosystem. The `domains` property (1-3 values per role) allows selection by timeline and process phase rather than just technical function.

**For upstream alignment**: Synced v0.1.9 from 3leaps/crucible brings formatted schemas (resolving downstream formatting drift), new governance role definitions (deliverylead for project coordination, cxotech for strategic decisions), and the three-tier governance model. Minimum goneat v0.5.3 now required for JSON Schema 2019-09 support.

### Highlights

- **Schema Compliance**: All 11 roles updated with `domains` property
  - cicd: automation, delivery
  - dataeng: development, analytics
  - devlead: development, implementation
  - devrev: development, quality
  - entarch: governance, architecture, strategy
  - infoarch: development, documentation
  - prodmktg: delivery, marketing
  - qa: development, quality
  - releng: delivery, development
  - secrev: development, security
  - uxdev: development, implementation

- **Upstream v0.1.9 Sync**: 28 files from 3leaps/crucible
  - Formatted JSON schemas (enum arrays expanded)
  - Updated role-prompt schema with required `domains` property
  - New governance roles tracked: deliverylead (sprint-quarter), cxotech (strategic)
  - Three-tier governance: dispatch → deliverylead → cxotech
  - Minimum goneat v0.5.3 for JSON Schema 2019-09 support

### Changes

| Area     | Change                                                       |
| -------- | ------------------------------------------------------------ |
| Roles    | Add `domains` property to all 11 agentic roles               |
| Schema   | Sync role-prompt.schema.json v0.1.9 with domains requirement |
| Upstream | Bump provenance from v0.1.6 to v0.1.9 (commit 67b166daf817)  |

**Full release notes**: [release-notes/v0.4.11.md](release-notes/v0.4.11.md)

---

## v0.4.10 - 3leaps/crucible Sync & Release Engineering Role

Brings galaxy-level data classification frameworks and release engineering infrastructure to the Fulmen ecosystem. **(Condensed - see [release-notes/v0.4.10.md](release-notes/v0.4.10.md) for full details)**

### Highlights

- Documentation improvements for upstream sync clarity
- 3leaps/crucible v0.1.6 upstream sync with data classification framework
- 7 classifier dimension definitions (sensitivity, volatility, access-tier, etc.)
- Foundation schemas (types, error-response, lifecycle-phases)
- New `releng` agentic role for CI/CD-aware release coordination
- Automated upstream sync tooling (`make upstream-sync-3leaps`)

---

## v0.4.9 - Schema Validation & Cross-Platform Toolchain

**Foundation release establishing enterprise-grade validation and multi-language toolchain support.**

### Highlights

- Multi-platform toolchain support (Go, TypeScript, Python, Rust)
- Schema validation infrastructure with goneat integration
- Cross-platform build system with language-specific packaging
- Taxonomy and metrics framework for ecosystem observability
- Registry and foundry patterns for module management

**Full release notes**: [release-notes/v0.4.9.md](release-notes/v0.4.9.md)

---

[View complete changelog →](CHANGELOG.md)
