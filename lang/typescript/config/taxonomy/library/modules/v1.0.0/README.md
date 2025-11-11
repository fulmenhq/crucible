# Fulmen Helper Library Module Registry

**Version**: 1.0.0
**Status**: Active (THE canonical SSOT)
**Owner**: Schema Cartographer

## Purpose

**THE definitive module registry** for all Fulmen helper library modules (gofulmen, pyfulmen, tsfulmen, and future languages).

This registry is:

- ✅ **Manually maintained** - Human judgment required for tier assignments and rationale
- ✅ **Automatically validated** - `scripts/validate-module-registry.ts` ensures accuracy
- ✅ **THE canonical SSOT** - Helper libraries MUST use this registry to determine which modules to implement

## Contents

**`modules.yaml`**: Complete registry of all helper library modules with:

- Module name and description
- Tier assignment (core/common/specialized)
- Rationale for tier
- Evidence pointers (schemas, configs)
- Cross-language implementation status
- Dependencies (module and external)
- Graduation metrics (specialized only)
- Lifecycle status

## Current Module Count

- **Core**: 7 modules (config, logging, schema, crucible-shim, errors, appidentity, platform)
- **Common**: 9 modules (pathfinder, ascii, foundry, fulhash, signals, telemetry, docscribe, ssot-sync, metrics)
- **Specialized**: 0 modules (fulencoding, fulpack planned for v0.2.11)

## Usage

### For Helper Library Maintainers

Read this registry to know:

1. Which modules to implement
2. What tier each module belongs to
3. Whether your language has tier overrides
4. What dependencies are required
5. What version the module was added

See [Helper Library Standard](../../../../docs/architecture/fulmen-helper-library-standard.md) for compliance requirements.

### For Validation Tools

This registry is validated against Crucible reality by:

- `scripts/validate-module-registry.ts` - 7-check validation
- `make validate-schemas` - CI enforcement

### For Documentation Generators

Use this registry to:

- Generate module listings for helper library READMEs
- Create parity matrices showing cross-language status
- Track graduation metrics for specialized modules

## Validation

The registry is automatically validated to ensure:

1. **Schema compliance**: All entries validate against `schemas/taxonomy/library/modules/v1.0.0/module-entry.schema.json`
2. **No orphans**: Schemas/configs without registry entries are flagged
3. **No dead entries**: Registry entries without evidence are flagged
4. **Evidence accuracy**: Claimed schema/config paths exist
5. **Cross-language consistency**: Package paths match actual go.mod, package.json, pyproject.toml
6. **Core universality**: Core modules have no NA status or tier overrides
7. **Cross-references**: Required modules exist in registry

## Modification Process

1. **Add/update module** in `modules.yaml`
2. **Run validation**: `make validate-schemas`
3. **Fix any errors** flagged by validation
4. **Commit with rationale** for tier assignment
5. **Update helper libraries** to implement new/changed modules

## Related

- **Schema**: `schemas/taxonomy/library/modules/v1.0.0/module-entry.schema.json`
- **Validation**: `scripts/validate-module-registry.ts`
- **Standard**: `docs/standards/library/modules/extension-tiering.md` (v0.2.11+)
- **Helper Library Standard**: `docs/architecture/fulmen-helper-library-standard.md`

---

_Registry created v0.2.10 by Schema Cartographer under supervision of @3leapsdave_
