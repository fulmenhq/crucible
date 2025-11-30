#!/usr/bin/env bun
/**
 * Exit Codes Generator
 *
 * Generates language-native bindings from exit codes catalog.
 * Uses templates from scripts/codegen/exit-codes/ to produce
 * Go, Python, and TypeScript code in lang/* directories.
 *
 * Usage:
 *   bun run scripts/codegen/generate-exit-codes.ts --lang typescript
 *   bun run scripts/codegen/generate-exit-codes.ts --all
 *   bun run scripts/codegen/generate-exit-codes.ts --all --format
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { load as loadYaml } from "js-yaml";
import { execSync } from "node:child_process";

// Type definitions
interface Metadata {
  catalog: string;
  catalog_path: string;
  snapshot_path: string;
  owner: string;
  last_reviewed: string;
  languages: {
    [key: string]: {
      template: string;
      output_path: string;
      postprocess?: string;
    };
  };
}

interface ExitCode {
  code: number;
  name: string;
  description: string;
  context: string;
  retry_hint?: string;
  bsd_equivalent?: string;
  python_note?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  range: {
    min: number;
    max: number;
  };
  codes: ExitCode[];
}

interface SimplifiedMapping {
  simplified_code: number;
  simplified_name: string;
  maps_from: number[];
}

interface SimplifiedMode {
  id: string;
  name: string;
  description: string;
  mappings: SimplifiedMapping[];
}

interface Catalog {
  version: string;
  description: string;
  categories: Category[];
  simplified_modes?: SimplifiedMode[];
}

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
  console.error("\nUsage:");
  console.error("  bun run scripts/codegen/generate-exit-codes.ts --lang typescript");
  console.error("  bun run scripts/codegen/generate-exit-codes.ts --all");
  console.error("  bun run scripts/codegen/generate-exit-codes.ts --all --format");
  process.exit(40); // EXIT_INVALID_ARGUMENT
}

// Load metadata and catalog
const metadataPath = resolve("scripts/codegen/exit-codes/metadata.json");
const metadata: Metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

const catalogPath = resolve(metadata.catalog_path);
const catalog = loadYaml(readFileSync(catalogPath, "utf8")) as Catalog;

console.log(`✓ Loaded catalog version ${catalog.version} from ${metadata.catalog_path}`);

// Helper: Convert EXIT_PORT_IN_USE to ExitPortInUse (PascalCase)
function toPascalCase(name: string): string {
  const trimmed = name.startsWith("EXIT_") ? name.slice(5) : name;
  return trimmed
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Helper: Prepare template data
function prepareTemplateData(lang: string) {
  // For all languages: replace newlines in category descriptions with spaces
  // to keep single-line comments (multi-line descriptions break comment syntax)
  const categoriesWithSingleLineDescriptions = catalog.categories.map((cat) => ({
    ...cat,
    description: cat.description.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
  }));

  const baseData = {
    version: catalog.version,
    lastReviewed: metadata.last_reviewed,
    last_reviewed: metadata.last_reviewed, // Python snake_case variant
    categories: categoriesWithSingleLineDescriptions,
    simplified_modes: catalog.simplified_modes || [],
  };

  if (lang === "go" || lang === "rust") {
    // Transform for Go/Rust: add PascalCase names and flatten category ID
    return {
      ...baseData,
      LastReviewed: metadata.last_reviewed,
      Version: catalog.version,
      SimplifiedModes: (catalog.simplified_modes || []).map((mode: SimplifiedMode) => ({
        ID: mode.id,
        Name: mode.name,
        Description: mode.description,
        Mappings: mode.mappings.map((mapping: SimplifiedMapping) => ({
          SimplifiedCode: mapping.simplified_code,
          SimplifiedName: mapping.simplified_name,
          MapsFrom: mapping.maps_from,
        })),
      })),
      Categories: categoriesWithSingleLineDescriptions.map((cat) => ({
        ...cat,
        Name: cat.name,
        Description: cat.description,
        Range: {
          Min: cat.range.min,
          Max: cat.range.max,
        },
        Codes: cat.codes.map((code) => ({
          Code: code.code,
          Name: code.name,
          NamePascal: toPascalCase(code.name),
          Description: code.description.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
          Context: code.context.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
          CategoryID: cat.id,
          RetryHint: code.retry_hint || "",
          BSDEquivalent: code.bsd_equivalent || "",
          PythonNote: code.python_note || "",
        })),
      })),
    };
  }

  return baseData;
}

// Render template for a specific language
async function renderTemplate(lang: string): Promise<string> {
  const langConfig = metadata.languages[lang];
  if (!langConfig) {
    throw new Error(`Language "${lang}" not found in metadata.json`);
  }

  const templatePath = resolve(`scripts/codegen/exit-codes/${lang}/${langConfig.template}`);
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = readFileSync(templatePath, "utf8");
  const data = prepareTemplateData(lang);

  if (lang === "typescript" || lang === "go" || lang === "rust") {
    // Use EJS for TypeScript, Go, and Rust
    const ejs = await import("ejs");
    return ejs.render(templateContent, { ...data, JSON });
  } else if (lang === "python") {
    // Use Nunjucks for Python (Jinja2-compatible)
    const nunjucks = await import("nunjucks");
    const env = new nunjucks.Environment(null, { autoescape: false });

    // Add custom filter for JSON serialization (properly escapes strings for Python)
    env.addFilter("pyjson", function (str: string) {
      return JSON.stringify(str);
    });

    return env.renderString(templateContent, data);
  }

  throw new Error(`Unsupported language: ${lang}`);
}

// Generate code for a specific language
async function generateLanguage(lang: string) {
  console.log(`\n→ Generating ${lang}...`);

  const langConfig = metadata.languages[lang];
  if (!langConfig) {
    throw new Error(`Language "${lang}" not found in metadata.json`);
  }

  const outputPath = flags.out || resolve(langConfig.output_path);

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Render template
  console.log(`  Rendering template: ${langConfig.template}`);
  const rendered = await renderTemplate(lang);

  // Write output
  console.log(`  Writing to: ${outputPath}`);
  writeFileSync(outputPath, rendered, "utf8");

  // Run postprocess script if --format flag present
  if (flags.format && langConfig.postprocess) {
    const postprocessPath = resolve(`scripts/codegen/exit-codes/${lang}/${langConfig.postprocess}`);
    if (existsSync(postprocessPath)) {
      console.log(`  Formatting with: ${langConfig.postprocess}`);
      try {
        execSync(`${postprocessPath} ${outputPath}`, { stdio: "inherit" });
      } catch (error) {
        console.warn(`  Warning: Postprocessing failed (continuing anyway)`);
      }
    }
  }

  // Verify compilation if --verify flag present
  if (flags.verify) {
    console.log(`  Verifying compilation...`);
    try {
      if (lang === "go") {
        execSync(`go build -o /dev/null ${outputPath}`, { stdio: "pipe" });
      } else if (lang === "rust") {
        // Run cargo check in the package root (assumed to be 2 dirs up from src/foundry/exit_codes.rs)
        // Adjust path logic if necessary.
        // lang/rust/src/foundry/exit_codes.rs -> lang/rust
        const rustPkgRoot = resolve(dirname(outputPath), "../../..");
        execSync(`cargo check`, { cwd: rustPkgRoot, stdio: "pipe" });
      } else if (lang === "python") {
        execSync(`python -m py_compile ${outputPath}`, { stdio: "pipe" });
      } else if (lang === "typescript") {
        const tsDir = dirname(outputPath);
        execSync(`cd ${tsDir} && bun run tsc --noEmit`, { stdio: "pipe" });
      }
      console.log(`  ✓ Compilation verified`);
    } catch (error) {
      throw new Error(`Compilation verification failed for ${lang}`);
    }
  }

  console.log(`✓ ${lang} generation complete`);
}

// Main execution
async function main() {
  try {
    if (flags.all) {
      const languages = Object.keys(metadata.languages);
      console.log(`Generating exit codes for all languages: ${languages.join(", ")}`);

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
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.error(`\nRemediation:`);
    console.error(`   - Verify catalog exists: ${metadata.catalog_path}`);
    console.error(
      `   - Verify templates exist: scripts/codegen/exit-codes/{go,python,typescript}/`,
    );
    console.error(`   - Check template syntax and data structure`);
    process.exit(1); // EXIT_FAILURE
  }
}

main();
