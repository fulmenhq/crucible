# Release Notes

This file contains release notes for the three most recent Crucible releases.
For complete release history, see the individual files in `release-notes/`.

---

## v0.4.2 - Canonical URI Resolution & Fixture Standard

Establishes canonical URI resolution for schema identifiers and introduces the fixture standard for test infrastructure repositories.

### Highlights

- **Canonical URI Resolution** (BREAKING): All schema `$id` values now include `crucible/` module prefix
- **Fixture Standard**: New repository category for test infrastructure (servers, clients, datastores)
- **Doc-Host Category**: New category for path-addressed documentation hosting
- **Python Path Fix**: Exit codes codegen aligned with other Python modules

### Breaking Changes

Schema `$id` values changed from:
```
https://schemas.fulmenhq.dev/<topic>/<version>/<file>
```
To:
```
https://schemas.fulmenhq.dev/crucible/<topic>/<version>/<file>
```

Helper libraries with offline `$ref` resolution must strip `crucible/` from URL path when mapping to embedded schemas.

### Added

- `docs/architecture/fulmen-fixture-standard.md` - Fixture specification
- `config/taxonomy/fixture-catalog.yaml` - Fixture name registry
- `schemas/taxonomy/fixture/v1.0.0/fixture-catalog.schema.json` - Catalog validation
- `docs/standards/publishing/canonical-uri-resolution.md` - URI resolution standard
- `docs/standards/repository-category/doc-host/README.md` - Doc-host category

### Changed

- ~63 schemas updated with `crucible/` module prefix in `$id`
- Repository categories taxonomy version `2026.01.1`

### Removed

- Enact schemas (moved to enacthq)
- Goneat schemas (moved to goneat repository)

### Impact

- **All helper libraries**: Must sync v0.4.2 to get updated `$id` values
- **Libraries with schema validators**: Update resolver to handle `crucible/` prefix
- **pyfulmen**: Update imports from `pyfulmen.foundry` to `crucible.foundry`

See [release-notes/v0.4.2.md](release-notes/v0.4.2.md) for details.

---

## v0.4.1 - Similarity Module File Relocation

Completes the v0.4.0 similarity promotion by relocating files from `library/foundry/` to `library/similarity/`.

### Highlights

- **File Relocation**: Similarity fixtures, schemas, and docs moved to standalone paths
- **Go API Update**: New `ConfigRegistry.Library().Similarity().Fixtures()` accessor
- **Backward Compatibility**: `Foundry().SimilarityFixtures()` still works (deprecated)

### Changed

- `config/library/foundry/similarity-fixtures.yaml` → `config/library/similarity/fixtures.yaml`
- `schemas/library/foundry/v{1,2}.0.0/similarity.schema.json` → `schemas/library/similarity/`
- `docs/standards/library/foundry/similarity.md` → `docs/standards/library/similarity/`
- Schema `$id` namespace updated from `foundry` to `similarity`
- Module registry evidence paths updated

### Impact

- gofulmen embed paths now point to `config/library/similarity/`
- Helper libraries should update imports before v0.5.0 (deprecation removal)

See [release-notes/v0.4.1.md](release-notes/v0.4.1.md) for details.

---

## v0.4.0 - Module Registry Weight Classification

Introduces weight classification and feature gate support for helper library modules, enabling consistent feature gating across all language implementations.

### Highlights

- **Weight Classification**: Binary `light`/`heavy` classification for dependency footprint
- **Feature Gate Defaults**: `default_inclusion` field for opt-in vs opt-out modules
- **Similarity Promotion**: Moved from foundry-catalogs to standalone platform module
- **Product Marketing Role**: New `prodmktg` agentic role for messaging and branding

### Added

- Module registry v1.1.0 schemas with `weight`, `default_inclusion`, `notes` fields
- Foundry catalog registry v1.1.0 with `feature_group` for library feature mapping
- `docs/standards/fulmen/module-registry.md` documenting weight classification semantics
- `prodmktg` role with new `marketing` category in role-prompt schema

### Fixed

- Schema `$id` host corrected from `fulmenhq.dev` to `schemas.fulmenhq.dev`

### Impact

- Helper libraries (rsfulmen, gofulmen, pyfulmen, tsfulmen) can implement feature gates using registry metadata
- Foundry catalogs reduced from 7 to 6 entries (similarity promoted)
- Platform modules increased from 18 to 19 entries (similarity added)

See [release-notes/v0.4.0.md](release-notes/v0.4.0.md) for details.
