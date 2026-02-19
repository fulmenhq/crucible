# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see individual files in `release-notes/`.

---

## v0.4.12 - Typed Role Catalog API

**Typed role catalog API across all four language implementations, three new roles, full schema field coverage, and slug regex alignment.**

### Why This Matters

**For library consumers**: Agentic role data is now available via a typed, validated API in every Crucible language implementation. Before this release, consumers (gofulmen, tsfulmen, rsfulmen, pyfulmen, and application code) had to load and parse role YAMLs manually with no type safety. `LoadRole("devlead")` now returns a fully-typed `RolePrompt` with all schema fields populated.

**For the role catalog**: Three new roles land — `cxotech`, `deliverylead`, and `infraeng` — completing the governance tier introduced in v0.4.11. All three are `status: draft`.

**For schema compliance**: Two cross-cutting bugs identified during library team review are fixed: slug validation now matches the canonical schema regex (`^[a-z][a-z0-9]*$`), and three schema-defined fields (`pre_push_checklist`, `required_reading`, `cross_role_note`) are now exposed by all typed implementations rather than silently discarded.

### Highlights

- **Typed API in four languages**: `LoadRole` / `loadRole` / `load_role` + catalog + slugs
- **Rust codegen**: `Role` enum + `RoleMetadata` struct generated at build time from YAML
- **14-role catalog**: 11 approved + 3 new draft roles (cxotech, deliverylead, infraeng)
- **Full field coverage**: `pre_push_checklist`, `required_reading` (typed struct), `cross_role_note`
- **Slug regex fix**: `^[a-z][a-z0-9]*$` across all impls — aligned to schema
- **Upstream v0.1.12**: Provenance bump, no schema content changes

### Changes

| Area       | Change                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| Go         | Add `LoadRole`, `LoadRoleCatalog`, `ListRoleSlugs`, `RolePrompt` + sub-types    |
| TypeScript | Add `loadRole`, `loadRoleCatalog`, `listRoleSlugs`, `RolePrompt` interface      |
| Python     | Add `load_role`, `load_role_catalog`, `list_role_slugs`, `RolePrompt` dataclass |
| Rust       | Add generated `Role` enum + `RoleMetadata` via `make codegen-roles`             |
| Roles      | Add cxotech, deliverylead, infraeng (draft)                                     |
| Bug fix    | Slug regex aligned to `^[a-z][a-z0-9]*$` in all impls                           |
| Bug fix    | Add missing fields: `pre_push_checklist`, `required_reading`, `cross_role_note` |
| Upstream   | Bump 3leaps/crucible from v0.1.10 to v0.1.12 (commit 96a17853ee48)              |

**Full release notes**: [release-notes/v0.4.12.md](release-notes/v0.4.12.md)

---

## v0.4.11 - Role Schema Compliance & Upstream v0.1.10

**Updated all 11 agentic roles with `domains` property, synced 3leaps/crucible v0.1.10.** **(Condensed — see [release-notes/v0.4.11.md](release-notes/v0.4.11.md) for full details)**

### Highlights

- All 11 agentic roles updated with required `domains` property (1-3 values per role)
- 15 process domains defined: development, delivery, governance, quality, security, etc.
- 3leaps/crucible v0.1.10 upstream sync: 28 files, formatted schemas, domains in role-prompt schema
- New governance roles tracked upstream: deliverylead (sprint-quarter), cxotech (strategic)
- Three-tier governance model: dispatch → deliverylead → cxotech
- Minimum goneat v0.5.3 required for JSON Schema 2019-09 support

---

## v0.4.10 - 3leaps/crucible Sync & Release Engineering Role

**Galaxy-level data classification frameworks, foundation schemas, and release engineering infrastructure.** **(Condensed — see [release-notes/v0.4.10.md](release-notes/v0.4.10.md) for full details)**

### Highlights

- 3leaps/crucible v0.1.6 upstream sync with data classification framework
- 7 classifier dimension definitions (sensitivity, volatility, access-tier, etc.)
- Foundation schemas: types, error-response, lifecycle-phases
- New `releng` agentic role for CI/CD-aware release coordination
- Automated upstream sync tooling (`make upstream-sync-3leaps`)

---

[View complete changelog →](CHANGELOG.md)
