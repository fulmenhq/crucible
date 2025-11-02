---
title: "Code Generation Template Standard"
description: "Common structure and workflow for publishing language bindings derived from Crucible catalogs"
author: "Fulmen Enterprise Architect (@fulmen-ea-steward)"
date: "2025-10-31"
last_updated: "2025-10-31"
status: "draft"
tags: ["standards", "codegen", "templates", "2025.10.3"]
---

# Code Generation Template Standard

This standard defines how Crucible publishes language-specific code generation templates for assets such as exit codes, HTTP status catalogs, or other SSOT datasets. The goal is to keep helper libraries in sync with a single source of truth, avoid hand-crafted drift, and provide a repeatable workflow that future catalog additions can reuse.

## Scope

- Applies to templates that generate language bindings or helper constants from Crucible data (YAML/JSON catalogs, schemas, configuration).
- Templates live in the `scripts/codegen/` directory of Crucible and are consumed by downstream repositories (helper libraries, codex forges, etc.).
- Covers Go, Python, TypeScript initially; other languages may be added following the same pattern.

## Tooling

- Code generation scripts MUST execute with **Bun ≥ 1.2**. Node.js 20+ may serve as a compatibility fallback but Bun is the supported runtime for new templates.
- Recommended template engines:
  - Go: built-in `text/template`
  - Python: Jinja2 rendered via Bun (e.g., Nunjucks) or delegated to Python if necessary
  - TypeScript/JavaScript: EJS/Handlebars (or similar) executed from Bun

## Directory Structure

```
scripts/
  codegen/
    README.md                          # Overview and usage instructions
    <catalog-key>/                     # slug identifying the catalog (e.g., exit-codes)
      metadata.json                    # Required metadata (see below)
      go/
        template.tmpl                  # Go template
        postprocess.sh                 # Optional formatter (gofmt, goimports)
      python/
        template.jinja                 # Python template
        postprocess.sh                 # Optional formatter (ruff, mypy)
      typescript/
        template.ejs                   # TypeScript template
        postprocess.sh                 # Optional formatter (biome, prettier)
```

- `<catalog-key>` MUST be lowercase alphanumeric with optional hyphen.
- Each language directory contains the template plus optional helper scripts for formatting or additional processing.

### metadata.json

Every catalog directory MUST include `metadata.json` with at least:

```json
{
  "catalog": "exit-codes",
  "catalog_path": "config/library/foundry/exit-codes.yaml",
  "snapshot_path": "config/library/foundry/exit-codes.snapshot.json",
  "owner": "@fulmen-ea-steward",
  "last_reviewed": "2025-10-31",
  "languages": {
    "go": {
      "template": "template.tmpl",
      "output_path": "../gofulmen/pkg/foundry/exit_codes.go",
      "postprocess": "postprocess.sh"
    },
    "python": {
      "template": "template.jinja",
      "output_path": "../pyfulmen/src/pyfulmen/foundry/exit_codes.py",
      "postprocess": "postprocess.sh"
    },
    "typescript": {
      "template": "template.ejs",
      "output_path": "../tsfulmen/src/foundry/exitCodes.ts",
      "postprocess": "postprocess.sh"
    }
  }
}
```

Automation reads ownership/version data from this file—do not rename or omit it.

## Template Expectations

1. **Source of Truth**: Templates must render code directly from the canonical catalog (YAML/JSON) stored in `config/` or `schemas/`. Avoid duplicating business logic inside templates.
2. **Formatting**: Generated code must pass language-formatting tools. Provide a post-processing script (`gofmt`, `ruff format`, `biome format`, etc.) when necessary.
3. **Idempotency**: Re-running the generator with unchanged input must produce identical output (after formatting) to ensure clean diffs.
4. **Determinism**: Do not inject timestamps or environment-dependent values into generated code unless explicitly required.
5. **Language Conventions**: Document required idioms. For example, TypeScript templates MUST emit `export const exitCodes = {...} as const;` and `export type ExitCode = typeof exitCodes[keyof typeof exitCodes];` to preserve literal types and tree-shaking.

## Generation Workflow

1. **Entry Point**: Provide a generator script (e.g., `scripts/codegen/generate-exit-codes.ts`) that reads the catalog, applies the template, writes the output file, and runs optional post-processing.
2. **CLI Shape**: Generators SHOULD expose a consistent interface:
   ```bash
   bun run scripts/codegen/generate-exit-codes \
     --lang <language> \
     --out <output-path> \
     [--format]      # run post-processing
     [--verify]      # optional parity/compile check
   ```
   Additional filters (e.g., `--include-categories`) are allowed as long as defaults reproduce the full catalog.
3. **CI Integration**: Integrate generation into `make sync` or equivalent so helper repos refresh bindings automatically.
4. **Error Handling**: Fail fast if the catalog schema changes, templates are missing, or post-processing fails.

## Ownership & Review

- `metadata.json` is the authoritative record of catalog ownership, review cadence, and output targets. Update it whenever templates or maintainers change.
- Helper library maintainers (e.g., gofulmen, pyfulmen, tsfulmen) must review template updates affecting their language to ensure compatibility with local coding guidelines.
- Coordinate template changes with corresponding updates to consuming repositories (preferably in the same release cycle).

## Consumption Guidelines

Downstream repositories must:

1. **Pin Version**: Document which Crucible release (or commit) generated the current binding. Ideally, embed the catalog version in the generated artifact.
2. **Format/Lint**: Run language-specific formatters after generation to catch errors early.
3. **CI Enforcement**: Add parity tests or snapshot comparisons to detect drift between locally generated bindings and the canonical catalog.
4. **Documentation**: Update README/changelog when regenerating bindings so consumers know when new codes or fields are available.

## Verification & CI Integration

Crucible itself enforces code generation parity through:

1. **Verification Script**: `scripts/codegen/verify-exit-codes.ts` (or similar per catalog) regenerates all language bindings to a temporary location, compares with checked-in files, validates compilation, and checks parity with canonical snapshots.
2. **Make Target**: `make verify-codegen` runs all verification scripts and fails if drift is detected.
3. **CI Integration**: `make verify-codegen` is part of `make check-all` (run by `make precommit` and `make prepush`), ensuring generated code stays synchronized with catalogs before every commit.

Downstream repositories should expose similar verification targets (e.g., `make verify-codegen`) that regenerate bindings and run parity checks to prevent drift.

## Future Enhancements

- Extend templates for additional languages (Rust, C#, etc.) as helper libraries adopt them.
- Explore provenance/signing (checksums, SLSA attestations) for generated bindings in future iterations to satisfy locked-environment requirements.
- Create a unified orchestration script (`scripts/codegen/generate-all.ts`) that discovers and runs all catalog generators in one invocation.

## References

- [Fulmen Forge Codex Standard](../architecture/fulmen-forge-codex-standard.md)
- [Makefile Standard](./makefile-standard.md)
- [Fulmen Ecosystem Guide](../architecture/fulmen-ecosystem-guide.md)
