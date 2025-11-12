# Fulpack Types Code Generation

Automated generation of language-native type bindings for the fulpack module from JSON schemas and YAML taxonomies.

## Overview

This generator produces dataclasses, enums, and TypedDicts for all fulpack data structures across multiple languages. It ensures cross-language consistency by generating from a single source of truth (Crucible schemas).

**Generated Types**:

- **Enums**: Archive formats, entry types, operations (from YAML taxonomies)
- **Data Structures**: ArchiveInfo, ArchiveEntry, ArchiveManifest, ValidationResult, ExtractResult (from JSON schemas)
- **Options**: CreateOptions, ExtractOptions, ScanOptions (TypedDicts for kwargs)

## Quick Start

```bash
# Generate Python types only
make codegen-fulpack-python

# Generate for all languages (Python, Go, TypeScript)
make codegen-fulpack

# Regenerate all generated code (exit codes + fulpack)
make codegen-all

# Verify generated code is up-to-date
make verify-codegen
```

## Directory Structure

```
scripts/codegen/fulpack-types/
├── README.md                    # This file
├── metadata.json                # Configuration for all languages
├── python/
│   ├── enums.template.jinja    # Enum generation (ArchiveFormat, etc.)
│   ├── types.template.jinja    # Dataclass generation (ArchiveInfo, etc.)
│   ├── options.template.jinja  # TypedDict generation (CreateOptions, etc.)
│   ├── init.template.jinja     # Package __init__.py exports
│   └── postprocess.sh          # ruff format + ruff check
├── typescript/
│   ├── types.template.ejs      # TypeScript interfaces + enums
│   └── postprocess.sh          # biome format
└── go/
    ├── types.template.ejs      # Go structs + constants
    └── postprocess.sh          # gofmt
```

## Source Schemas

**Data Structures** (JSON Schema in `schemas/library/fulpack/v1.0.0/`):

- `archive-info.schema.json` → ArchiveInfo
- `archive-entry.schema.json` → ArchiveEntry
- `archive-manifest.schema.json` → ArchiveManifest
- `validation-result.schema.json` → ValidationResult
- `extract-result.schema.json` → ExtractResult
- `create-options.schema.json` → CreateOptions (TypedDict)
- `extract-options.schema.json` → ExtractOptions (TypedDict)
- `scan-options.schema.json` → ScanOptions (TypedDict)

**Taxonomies** (YAML in `schemas/taxonomy/library/fulpack/`):

- `archive-formats/v1.0.0/formats.yaml` → ArchiveFormat enum
- `entry-types/v1.0.0/types.yaml` → EntryType enum
- `operations/v1.0.0/operations.yaml` → Operation enum

## Generated Outputs

### Python

**Location**: `lang/python/src/crucible/fulpack/`

**Files**:

- `__init__.py` - Package exports (11 classes, `__all__`, `__version__`)
- `enums.py` - 3 enums (ArchiveFormat, EntryType, Operation)
- `types.py` - 5 dataclasses (ArchiveInfo, ArchiveEntry, ArchiveManifest, ValidationResult, ExtractResult)
- `options.py` - 3 TypedDicts (CreateOptions, ExtractOptions, ScanOptions)

**Features**:

- Modern Python 3.12+ syntax (`T | None`, lowercase `list[]`, `dict[]`)
- Proper use of `@dataclass` for data structures
- `TypedDict` with `total=False` for options
- `str, Enum` inheritance for JSON serialization
- Comprehensive docstrings with source attribution
- Auto-formatted with ruff

**Example Usage**:

```python
from crucible.fulpack import (
    ArchiveFormat,
    ArchiveInfo,
    CreateOptions,
)

# Enum usage
format = ArchiveFormat.TAR_GZ

# Dataclass usage
info = ArchiveInfo(
    format=ArchiveFormat.TAR_GZ,
    entry_count=42,
    total_size=1024,
    compressed_size=512,
)

# TypedDict usage (kwargs)
options: CreateOptions = {
    "compression_level": 9,
    "checksum_algorithm": "sha256",
}
```

### Go

**Location**: `fulpack/` (root level)

**Status**: Templates ready, will generate when gofulmen implements fulpack

### TypeScript

**Location**: `lang/typescript/src/fulpack/`

**Status**: Templates ready, will generate when tsfulmen implements fulpack

## Configuration

**File**: `metadata.json`

```json
{
  "module": "fulpack",
  "schema_base_path": "schemas/library/fulpack/v1.0.0",
  "taxonomy_base_path": "schemas/taxonomy/library/fulpack",
  "version": "v1.0.0",
  "languages": {
    "python": {
      "output_dir": "lang/python/src/crucible/fulpack",
      "templates": {
        "types": "types.template.jinja",
        "enums": "enums.template.jinja",
        "options": "options.template.jinja",
        "init": "init.template.jinja"
      },
      "postprocess": "postprocess.sh"
    }
  },
  "schemas": {
    "data_structures": [...],  // Dataclass sources
    "options": [...]            // TypedDict sources
  },
  "taxonomies": {
    "archive-formats": "...",
    "entry-types": "...",
    "operations": "..."
  }
}
```

## Type Mapping

### JSON Schema → Python

```typescript
{
  "string": "str",
  "integer": "int",
  "number": "float",
  "boolean": "bool",
  "array": "list[T]",                // Modern Python 3.12+ (PEP 585)
  "object": "dict[str, Any]",         // Modern Python 3.12+ (PEP 585)
  "enum": "Literal[...]",             // Inline enums
  "nullable": "T | None",             // Modern Python 3.12+ (PEP 604)
  ["integer", "null"]: "int | None"  // Union type handling
}
```

### Design Decisions

**Dataclass vs TypedDict**:

- Use `@dataclass` for data structures (return types)
- Use `TypedDict` for options (configuration passed as \*\*kwargs)

**Enum Design**:

- Use `str, Enum` for JSON serialization
- Singular names (ArchiveFormat not ArchiveFormats) per PEP 8
- Constant names in UPPER_CASE with underscores

**Optional Handling**:

- Modern `T | None` syntax (not `Optional[T]`)
- `TypedDict` with `total=False` (not `total=True` + `NotRequired`)

## Development Workflow

### Adding New Schemas

1. Add schema to `schemas/library/fulpack/v1.0.0/`
2. Update `metadata.json` → `schemas.data_structures` or `schemas.options`
3. Regenerate: `make codegen-fulpack`
4. Verify: `make verify-codegen`
5. Commit changes

### Adding New Languages

1. Create template directory: `scripts/codegen/fulpack-types/<language>/`
2. Add templates (see Python examples)
3. Add postprocess script
4. Update `metadata.json` → `languages.<language>`
5. Test generation: `bun run scripts/codegen/generate-fulpack-types.ts --lang <language>`

### Modifying Templates

1. Edit template in `scripts/codegen/fulpack-types/<language>/`
2. Regenerate: `make codegen-fulpack`
3. Verify: `make verify-codegen`
4. Review changes: `git diff lang/`
5. Commit changes

## Verification

The verification script (`verify-fulpack-types.ts`) ensures generated code is up-to-date:

**Checks**:

1. **Drift Detection**: Compares checked-in files with freshly generated code
2. **Compilation**: Verifies Python syntax and imports
3. **Formatting**: Ensures postprocessing (ruff) passed

**Run**:

```bash
# Verify fulpack types only
bun run scripts/codegen/verify-fulpack-types.ts

# Verify all codegen (exit codes + fulpack)
make verify-codegen
```

**CI Integration**: `make verify-codegen` runs in GitHub Actions to prevent stale types

## Postprocessing

Each language has a postprocess script that runs after generation:

**Python** (`python/postprocess.sh`):

```bash
# Format code
uvx ruff format "$OUTPUT_FILE"

# Fix linting issues (import sorting, etc.)
uvx ruff check --fix "$OUTPUT_FILE"

# Log ruff version for tracking
uvx ruff --version
```

**Benefits**:

- Consistent formatting
- Import organization
- No manual formatting needed
- Version tracking for reproducibility

## Troubleshooting

### "Drift detected" error

**Cause**: Checked-in types don't match freshly generated code

**Fix**:

```bash
make codegen-fulpack
git add lang/python/src/crucible/fulpack/
git commit -m "chore(codegen): regenerate fulpack types"
```

### "Python syntax check failed"

**Cause**: Template generated invalid Python syntax

**Fix**:

1. Check template: `scripts/codegen/fulpack-types/python/*.jinja`
2. Verify schema is valid: `make validate-schemas`
3. Check generator logic: `scripts/codegen/generate-fulpack-types.ts`

### "Missing metadata.json"

**Cause**: Running generator from wrong directory

**Fix**: Always run from repository root:

```bash
cd /path/to/crucible
make codegen-fulpack
```

## Related Documentation

- [Fulpack Module Specification](../../../docs/standards/library/modules/fulpack.md)
- [Generator Script](../../generate-fulpack-types.ts)
- [Exit Codes Generator](../exit-codes/) (similar pattern)
- [Feature Brief](../../../.plans/active/v0.2.11/fulpack-type-generation-feature-brief.md)

## Version History

- **v1.0.0** (2025-11-12): Initial Python type generation
  - Enums, dataclasses, TypedDicts
  - Modern Python 3.12+ syntax
  - Union type handling for nullable fields
  - Enum singularization for PEP 8 compliance

---

**Maintainer**: Schema Cartographer (@schema-cartographer)
**Contact**: noreply@3leaps.net
**Last Updated**: 2025-11-12
