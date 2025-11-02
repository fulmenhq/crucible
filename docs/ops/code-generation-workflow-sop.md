---
title: "Code Generation Workflow SOP"
status: "approved"
author: "Pipeline Architect"
last_updated: "2025-11-02"
category: "ops/codegen"
---

# Code Generation Workflow SOP

**Purpose**: Standard operating procedure for creating new code generators that transform Crucible catalogs into language-specific bindings.

**Scope**: This SOP covers the end-to-end workflow for adding a new code generator to Crucible, from template creation through CI integration and verification.

**Audience**: Pipeline Architect, Schema Cartographer, and contributors adding new catalog-driven code generation.

---

## Overview

Code generators in Crucible transform canonical YAML/JSON catalogs into language-native constants, types, and helper code for downstream consumption. This ensures a single source of truth (SSOT) while providing idiomatic, type-safe access in each target language.

**Reference Implementation**: The `exit-codes` generator (implemented in v0.2.3) serves as the canonical pattern for all future generators.

---

## Prerequisites

Before creating a new generator:

- [ ] Canonical catalog exists in `config/library/` (YAML with accompanying JSON Schema)
- [ ] Catalog has been validated via `scripts/validate-schemas.ts`
- [ ] Snapshot generation script exists (e.g., `scripts/generate-<catalog>-snapshots.ts`)
- [ ] Output paths identified for each target language (Go, Python, TypeScript)
- [ ] Bun ≥1.2.0 installed and configured

---

## Phase 1: Create Generator Infrastructure

### 1.1 Create Directory Structure

```bash
mkdir -p scripts/codegen/<catalog-key>/{go,python,typescript}
```

**Requirements**:

- `<catalog-key>` must be lowercase, alphanumeric with optional hyphens (e.g., `exit-codes`, `http-statuses`)
- Each language gets its own subdirectory

### 1.2 Create metadata.json

Create `scripts/codegen/<catalog-key>/metadata.json`:

```json
{
  "catalog": "<catalog-key>",
  "catalog_path": "config/library/<domain>/<catalog>.yaml",
  "snapshot_path": "config/library/<domain>/<catalog>.snapshot.json",
  "owner": "@<github-handle>",
  "last_reviewed": "YYYY-MM-DD",
  "languages": {
    "go": {
      "template": "template.tmpl",
      "output_path": "lang/go/pkg/<domain>/<catalog>.go",
      "postprocess": "postprocess.sh"
    },
    "python": {
      "template": "template.jinja",
      "output_path": "lang/python/src/py<package>/<domain>/<catalog>.py",
      "postprocess": "postprocess.sh"
    },
    "typescript": {
      "template": "template.ejs",
      "output_path": "lang/typescript/src/<domain>/<catalog>.ts",
      "postprocess": "postprocess.sh"
    }
  }
}
```

**Key points**:

- `output_path` is relative to repository root
- `last_reviewed` tracks when templates were last audited
- `postprocess` scripts are optional but recommended for formatting

---

## Phase 2: Create Language Templates

### 2.1 Go Template (text/template)

Create `scripts/codegen/<catalog-key>/go/template.tmpl`:

```go
// Package <domain> provides standardized <catalog> for Fulmen ecosystem.
//
// This file is AUTO-GENERATED from the Foundry <catalog> catalog.
// DO NOT EDIT MANUALLY - changes will be overwritten.
//
// Catalog Version: {{.Version}}
// Last Reviewed: {{.LastReviewed}}
// Source: {{.CatalogPath}}
package <domain>

const (
{{- range .Categories}}
    // {{.Name}} ({{.Range.Min}}-{{.Range.Max}})
    // {{.Description}}
    {{- range .Codes}}
    {{.NamePascal}} = {{.Code}}  // {{.Description}}
    {{- end}}
{{- end}}
)
```

Create `scripts/codegen/<catalog-key>/go/postprocess.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-}"
if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 <output-file>" >&2
  exit 1
fi

echo "Formatting Go code: $OUTPUT_FILE"
if command -v gofmt &> /dev/null; then
  gofmt -w "$OUTPUT_FILE"
else
  echo "Warning: gofmt not found, skipping format" >&2
fi
echo "✓ Go formatting complete"
```

### 2.2 Python Template (Jinja2)

Create `scripts/codegen/<catalog-key>/python/template.jinja`:

```python
"""<Catalog Title> - Generated from Crucible catalog.

Catalog Version: {{ version }}
Last Reviewed: {{ last_reviewed }}
Source: {{ catalog_path }}
"""
from enum import IntEnum

class <CatalogClass>(IntEnum):
    """Standardized <catalog> constants."""
{% for category in categories %}
    # {{ category.name }} ({{ category.range.min }}-{{ category.range.max }})
    # {{ category.description }}
{%- for code in category.codes %}
    {{ code.name }} = {{ code.code }}  # {{ code.description }}
{%- endfor %}
{% endfor %}
```

Create `scripts/codegen/<catalog-key>/python/postprocess.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-}"
if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 <output-file>" >&2
  exit 1
fi

echo "Formatting Python code: $OUTPUT_FILE"
if command -v ruff &> /dev/null; then
  ruff format "$OUTPUT_FILE"
else
  echo "Warning: ruff not found, skipping format" >&2
fi
echo "✓ Python formatting complete"
```

### 2.3 TypeScript Template (EJS)

Create `scripts/codegen/<catalog-key>/typescript/template.ejs`:

```typescript
/**
 * <Catalog Title> - Generated from Crucible catalog
 *
 * Catalog Version: <%= version %>
 * Last Reviewed: <%= lastReviewed %>
 * Source: <%= catalogPath %>
 */

export const <catalog>Codes = {
<% categories.forEach(category => { %>
  // <%= category.name %> (<%= category.range.min %>-<%= category.range.max %>)
  // <%= category.description %>
<% category.codes.forEach(code => { %>
  <%= code.name %>: <%= code.code %>,  // <%= code.description %>
<% }); %>
<% }); %>
} as const;

export type <Catalog>Code = (typeof <catalog>Codes)[keyof typeof <catalog>Codes];
```

Create `scripts/codegen/<catalog-key>/typescript/postprocess.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-}"
if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 <output-file>" >&2
  exit 1
fi

echo "Formatting TypeScript code: $OUTPUT_FILE"
if command -v bunx &> /dev/null; then
  bunx biome format --write "$OUTPUT_FILE"
elif command -v biome &> /dev/null; then
  biome format --write "$OUTPUT_FILE"
else
  echo "Warning: biome/bunx not found, skipping format" >&2
fi
echo "✓ TypeScript formatting complete"
```

**Template Requirements**:

- Use `Last Reviewed` from metadata (not runtime timestamps) for determinism
- Escape special characters (quotes, newlines) appropriately
- Flatten multi-line descriptions to single-line for comment compatibility
- Use language-idiomatic naming (PascalCase for Go, UPPER_SNAKE for Python/TS)

---

## Phase 3: Create Generator Script

Create `scripts/codegen/generate-<catalog>.ts`:

```typescript
#!/usr/bin/env bun
/**
 * <Catalog Title> Generator
 *
 * Generates language-native bindings from <catalog> catalog.
 * Uses templates from scripts/codegen/<catalog-key>/ to produce
 * Go, Python, and TypeScript code in lang/* directories.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { load as loadYaml } from "js-yaml";
import { execSync } from "node:child_process";

// CLI argument parsing
const args = process.argv.slice(2);
const flags = {
  lang: args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null,
  all: args.includes("--all"),
  format: args.includes("--format"),
  verify: args.includes("--verify"),
  out: args.includes("--out") ? args[args.indexOf("--out") + 1] : null,
};

if (!flags.all && !flags.lang) {
  console.error("Error: Must specify --lang <language> or --all");
  process.exit(40); // EXIT_INVALID_ARGUMENT
}

// Load metadata and catalog
const metadataPath = resolve("scripts/codegen/<catalog-key>/metadata.json");
const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

const catalogPath = resolve(metadata.catalog_path);
const catalog = loadYaml(readFileSync(catalogPath, "utf8"));

console.log(
  `✓ Loaded catalog version ${catalog.version} from ${metadata.catalog_path}`,
);

// Helper: Prepare template data (language-specific transformations)
function prepareTemplateData(lang: string) {
  // Flatten multi-line descriptions for comments
  const categoriesWithSingleLineDescriptions = catalog.categories.map(
    (cat) => ({
      ...cat,
      description: cat.description
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    }),
  );

  const baseData = {
    version: catalog.version,
    lastReviewed: metadata.last_reviewed,
    catalogPath: metadata.catalog_path,
    categories: categoriesWithSingleLineDescriptions,
  };

  if (lang === "go") {
    // Add PascalCase naming for Go
    return {
      ...baseData,
      Categories: categoriesWithSingleLineDescriptions.map((cat) => ({
        ...cat,
        Codes: cat.codes.map((code) => ({
          ...code,
          NamePascal: toPascalCase(code.name),
        })),
      })),
    };
  }

  return baseData;
}

// Helper: Convert to PascalCase
function toPascalCase(name: string): string {
  const trimmed = name.startsWith("EXIT_") ? name.slice(5) : name;
  return trimmed
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Render template for a specific language
async function renderTemplate(lang: string): Promise<string> {
  const langConfig = metadata.languages[lang];
  if (!langConfig) {
    throw new Error(`Language "${lang}" not found in metadata.json`);
  }

  const templatePath = resolve(
    `scripts/codegen/<catalog-key>/${lang}/${langConfig.template}`,
  );
  const templateContent = readFileSync(templatePath, "utf8");
  const data = prepareTemplateData(lang);

  if (lang === "typescript") {
    const ejs = await import("ejs");
    return ejs.render(templateContent, data);
  } else if (lang === "python") {
    const nunjucks = await import("nunjucks");
    const env = new nunjucks.Environment(null, { autoescape: false });
    return env.renderString(templateContent, data);
  } else if (lang === "go") {
    // Shell out to Go for text/template rendering
    const tempDataPath = "/tmp/<catalog>-data.json";
    writeFileSync(tempDataPath, JSON.stringify(data, null, 2));

    const goRenderScript = `
package main
import (
  "encoding/json"
  "os"
  "text/template"
)
func main() {
  tmplData, _ := os.ReadFile(os.Args[1])
  var data interface{}
  json.Unmarshal(tmplData, &data)
  tmplContent, _ := os.ReadFile(os.Args[2])
  tmpl := template.Must(template.New("<catalog>").Parse(string(tmplContent)))
  tmpl.Execute(os.Stdout, data)
}`;
    const tempGoPath = "/tmp/render-template.go";
    writeFileSync(tempGoPath, goRenderScript);

    const output = execSync(
      `go run ${tempGoPath} ${tempDataPath} ${templatePath}`,
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return output;
  }

  throw new Error(`Unsupported language: ${lang}`);
}

// Generate code for a specific language
async function generateLanguage(lang: string) {
  console.log(`\n→ Generating ${lang}...`);

  const langConfig = metadata.languages[lang];
  const outputPath = flags.out || resolve(langConfig.output_path);

  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`  Rendering template: ${langConfig.template}`);
  const rendered = await renderTemplate(lang);

  console.log(`  Writing to: ${outputPath}`);
  writeFileSync(outputPath, rendered, "utf8");

  if (flags.format && langConfig.postprocess) {
    const postprocessPath = resolve(
      `scripts/codegen/<catalog-key>/${lang}/${langConfig.postprocess}`,
    );
    if (existsSync(postprocessPath)) {
      console.log(`  Formatting with: ${langConfig.postprocess}`);
      execSync(`${postprocessPath} ${outputPath}`, { stdio: "inherit" });
    }
  }

  console.log(`✓ ${lang} generation complete`);
}

// Main execution
async function main() {
  try {
    if (flags.all) {
      const languages = Object.keys(metadata.languages);
      console.log(
        `Generating <catalog> for all languages: ${languages.join(", ")}`,
      );
      for (const lang of languages) {
        await generateLanguage(lang);
      }
      console.log(`\n✓ All languages generated successfully`);
    } else if (flags.lang) {
      await generateLanguage(flags.lang);
    }
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Code generation failed:`);
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

main();
```

**Make executable**:

```bash
chmod +x scripts/codegen/generate-<catalog>.ts
```

---

## Phase 4: Create Verification Script

Create `scripts/codegen/verify-<catalog>.ts`:

```typescript
#!/usr/bin/env bun
/**
 * <Catalog Title> Verification Script
 *
 * Verifies generated bindings match the catalog and are up-to-date.
 * Re-generates code to temporary location, compares with checked-in files,
 * and validates compilation.
 */

import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import { execSync } from "node:child_process";

const TEMP_DIR = "/tmp/crucible-codegen-verify";
const ROOT = resolve(import.meta.dir, "../..");

console.log("🔍 Verifying <catalog> code generation...\n");

// Clean temp directory
if (existsSync(TEMP_DIR)) {
  rmSync(TEMP_DIR, { recursive: true, force: true });
}
mkdirSync(TEMP_DIR, { recursive: true });

let exitCode = 0;

// Load metadata
const metadataPath = resolve(
  ROOT,
  "scripts/codegen/<catalog-key>/metadata.json",
);
const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

// Step 1: Regenerate to temp
console.log("→ Step 1: Regenerating <catalog> to temp directory...");
const languageEntries = Object.entries(metadata.languages);

try {
  for (const [langKey, config] of languageEntries) {
    console.log(`  • ${langKey}: generating temp binding...`);
    const ext =
      extname(config.output_path) ||
      (langKey === "go" ? ".go" : langKey === "python" ? ".py" : ".ts");
    const tempOutPath = join(TEMP_DIR, `${langKey}${ext}`);

    const tempDir = dirname(tempOutPath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    execSync(
      `bun run ${ROOT}/scripts/codegen/generate-<catalog>.ts --lang ${langKey} --out ${tempOutPath} --format`,
      { cwd: ROOT, stdio: "pipe" },
    );
  }
  console.log("  ✓ Code generation complete\n");
} catch (error) {
  console.error("  ❌ Code generation failed");
  process.exit(1);
}

// Step 2: Compare with checked-in files
console.log("→ Step 2: Comparing generated files with checked-in versions...");
const filesToCompare = languageEntries.map(([key, config]) => {
  const ext =
    extname(config.output_path) ||
    (key === "go" ? ".go" : key === "python" ? ".py" : ".ts");
  const display =
    key === "go"
      ? "Go"
      : key === "python"
        ? "Python"
        : key === "typescript"
          ? "TypeScript"
          : key;
  return {
    key,
    display,
    checkedInPath: resolve(ROOT, config.output_path),
    tempPath: join(TEMP_DIR, `${key}${ext}`),
  };
});

let driftDetected = false;
for (const file of filesToCompare) {
  if (!existsSync(file.checkedInPath)) {
    console.error(`  ❌ ${file.display}: Checked-in file not found`);
    driftDetected = true;
    continue;
  }

  const checkedInContent = readFileSync(file.checkedInPath, "utf8");
  const regeneratedContent = readFileSync(file.tempPath, "utf8");

  if (checkedInContent === regeneratedContent) {
    console.log(`  ✓ ${file.display}: Up-to-date`);
  } else {
    console.error(`  ❌ ${file.display}: Drift detected`);
    console.error(
      `     Run: bun run scripts/codegen/generate-<catalog>.ts --all --format`,
    );
    driftDetected = true;
  }
}

if (driftDetected) {
  exitCode = 1;
}
console.log("");

// Step 3: Verify compilation
console.log("→ Step 3: Verifying compilation...");

// Go
try {
  execSync(`go build -o /dev/null ${ROOT}/<go-output-path>`, { stdio: "pipe" });
  console.log("  ✓ Go compilation valid");
} catch {
  console.error("  ❌ Go compilation failed");
  exitCode = 1;
}

// Python
try {
  execSync(`python3 -m py_compile ${ROOT}/<python-output-path>`, {
    stdio: "pipe",
  });
  console.log("  ✓ Python syntax valid");
} catch {
  console.error("  ❌ Python syntax check failed");
  exitCode = 1;
}

// TypeScript
try {
  execSync(
    `cd ${ROOT}/lang/typescript && bunx tsc --noEmit <relative-ts-path>`,
    { stdio: "pipe" },
  );
  console.log("  ✓ TypeScript types valid");
} catch {
  console.error("  ❌ TypeScript type check failed");
  exitCode = 1;
}
console.log("");

// Clean up
rmSync(TEMP_DIR, { recursive: true, force: true });

// Exit
if (exitCode === 0) {
  console.log("✅ All verification checks passed\n");
  process.exit(0);
} else {
  console.error("❌ Verification failed\n");
  process.exit(exitCode);
}
```

**Make executable**:

```bash
chmod +x scripts/codegen/verify-<catalog>.ts
```

---

## Phase 5: Integrate with Makefile

Add verification target to `Makefile`:

```makefile
verify-codegen: ## Verify generated code is up-to-date with catalog
	@bun run scripts/codegen/verify-exit-codes.ts
	@bun run scripts/codegen/verify-<catalog>.ts
```

Update `check-all` target:

```makefile
check-all: validate-schemas verify-codegen build lint test typecheck
	@echo "✅ All checks passed"
```

---

## Phase 6: Update sync-to-lang.ts

Add generator invocation to `scripts/sync-to-lang.ts`:

```typescript
async function generateCodeBindings(options: SyncOptions) {
  console.log("🔧 Generating code bindings for all languages...");

  // Exit codes
  const exitCodesGen = spawnSync(
    "bun",
    ["run", "scripts/codegen/generate-exit-codes.ts", "--all", "--format"],
    {
      cwd: ROOT,
      stdio: options.verbose ? "inherit" : "pipe",
    },
  );
  if (exitCodesGen.status !== 0) {
    throw new Error("Exit codes generation failed");
  }

  // <New catalog>
  const newGen = spawnSync(
    "bun",
    ["run", "scripts/codegen/generate-<catalog>.ts", "--all", "--format"],
    {
      cwd: ROOT,
      stdio: options.verbose ? "inherit" : "pipe",
    },
  );
  if (newGen.status !== 0) {
    throw new Error("<Catalog> generation failed");
  }

  console.log("   ✓ Code bindings generated");
}
```

---

## Phase 7: Run Quality Gates

```bash
# Regenerate all bindings
bun run scripts/codegen/generate-<catalog>.ts --all --format

# Stage generated files
git add lang/

# Run full quality checks
make precommit
```

**Verify**:

- [ ] All languages generate without errors
- [ ] Generated code compiles
- [ ] `make verify-codegen` passes
- [ ] All quality gates pass

---

## Phase 8: Update Documentation

1. Update feature brief (`.plans/active/<version>/<catalog>-feature-brief.md`)
2. Update CHANGELOG.md
3. Update language wrapper READMEs if needed
4. Consider adding usage examples to `docs/guides/`

---

## Common Gotchas

### Multi-line Descriptions Break Comments

**Symptom**: Generated code has syntax errors in comments

**Fix**: Flatten multi-line descriptions in `prepareTemplateData()`:

```typescript
description: cat.description.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
```

### Biome Version Mismatches

**Symptom**: Postprocess scripts fail with schema errors

**Fix**: Ensure all `package.json` files use same biome version:

- Root: `^2.3.2`
- lang/typescript: `^2.3.2`

### String Escaping Issues

**Symptom**: Generated strings have unescaped quotes/newlines

**Fix**:

- Go: Use `{{printf "%q" .Field}}`
- Python/TypeScript: Use `.replace(/"/g, '\\"').replace(/\n/g, '\\n')`

### Formatting Inconsistencies

**Symptom**: `verify-codegen` detects drift after regeneration

**Fix**: Ensure postprocess scripts always run with `--format` flag in verification

---

## Checklist for New Generator

- [ ] Directory structure created (`scripts/codegen/<catalog-key>/{go,python,typescript}/`)
- [ ] `metadata.json` with all required fields
- [ ] Templates for all three languages (Go `.tmpl`, Python `.jinja`, TypeScript `.ejs`)
- [ ] Postprocess scripts for all three languages
- [ ] Generator script (`generate-<catalog>.ts`) with `--all`, `--lang`, `--format` flags
- [ ] Verification script (`verify-<catalog>.ts`) with 3-step validation
- [ ] Makefile integration (`verify-codegen` target updated)
- [ ] sync-to-lang.ts integration
- [ ] Quality gates passing
- [ ] Documentation updated

---

## Related Documentation

- [Code Generation Template Standard](../../standards/code-generation-template-standard.md)
- [Release Checklist](./release-checklist.md)
- [Makefile Standard](../../standards/makefile-standard.md)
- [Exit Codes Feature Brief](.plans/active/v0.2.3/exit-codes-feature-brief.md) (reference implementation)

---

**Status**: Approved
**Last Updated**: 2025-11-02
**Author**: Pipeline Architect
**Effective Date**: 2025-11-02
