#!/usr/bin/env bun
/**
 * Fulencode Types Generator
 *
 * Generates language-native type bindings from fulencode taxonomy schemas.
 * Uses templates from scripts/codegen/fulencode-types/ to produce Go, Python, and TypeScript code.
 *
 * Usage:
 *   bun run scripts/codegen/generate-fulencode-types.ts --lang python
 *   bun run scripts/codegen/generate-fulencode-types.ts --all
 *   bun run scripts/codegen/generate-fulencode-types.ts --all --format
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { load as loadYaml } from "js-yaml";
import { execSync } from "node:child_process";
import { Environment } from "nunjucks";
import * as ejs from "ejs";

// Type definitions
interface Metadata {
  module: string;
  schema_base_path: string;
  taxonomy_base_path: string;
  owner: string;
  last_reviewed: string;
  version: string;
  languages: {
    [key: string]: {
      output_dir: string;
      templates: {
        [key: string]: string;
      };
      postprocess?: string;
    };
  };
  schemas: {
    data_structures: string[];
    options: string[];
  };
  taxonomies: {
    [key: string]: string;
  };
}

interface TaxonomyItem {
  id: string;
  constant_name: string;
  constant_name_go: string;
  display_name?: string;
  description?: string;
}

interface Taxonomy {
  className: string;
  key: string;
  path: string;
  description: string;
  items: TaxonomyItem[];
}

// CLI argument parsing
const args = process.argv.slice(2);
const flags = {
  lang: args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null,
  all: args.includes("--all"),
  format: args.includes("--format"),
  verify: args.includes("--verify"),
};

if (!flags.all && !flags.lang) {
  console.error("Error: Must specify --lang <language> or --all");
  console.error("\nUsage:");
  console.error("  bun run scripts/codegen/generate-fulencode-types.ts --lang python");
  console.error("  bun run scripts/codegen/generate-fulencode-types.ts --all");
  console.error("  bun run scripts/codegen/generate-fulencode-types.ts --all --format");
  process.exit(40);
}

// Load metadata
const metadataPath = resolve("scripts/codegen/fulencode-types/metadata.json");
const metadata: Metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

console.log(`✓ Loaded metadata for ${metadata.module} module (version ${metadata.version})`);

// Helper: Convert snake_case to PascalCase
function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Helper: Convert snake_case to CONSTANT_CASE
function toConstantCase(name: string): string {
  return name.toUpperCase().replace(/[.\-]/g, "_");
}

// Helper: Singularize enum class names (for PEP 8 convention)
function singularizeEnumName(name: string): string {
  // Handle common plural patterns
  if (name.endsWith("ies")) {
    return name.slice(0, -3) + "y"; // "Entries" -> "Entry"
  }
  if (name.endsWith("ses")) {
    return name.slice(0, -2); // "Addresses" -> "Address"
  }
  if (name.endsWith("s") && !name.endsWith("ss")) {
    return name.slice(0, -1); // "Formats" -> "Format", "Levels" -> "Level"
  }
  return name;
}

// Helper: Convert kebab-case or snake_case to Go constant format
function toGoConstantCase(name: string): string {
  // Handle cases like "tar.gz" -> "TarGz", "utf-8" -> "Utf8"
  return name
    .replace(/[.\-]/g, "_")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Helper: Load and parse YAML taxonomy
function loadTaxonomy(taxonomyPath: string): any {
  const fullPath = resolve(taxonomyPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Taxonomy not found: ${fullPath}`);
  }
  return loadYaml(readFileSync(fullPath, "utf8"));
}

// Helper: Process fulencode taxonomy into enum data
// Fulencode taxonomies have nested structures unlike fulpack's flat arrays
function processTaxonomy(taxonomyKey: string, taxonomyFullPath: string, taxonomyRelPath: string): Taxonomy {
  const taxonomy = loadTaxonomy(taxonomyFullPath);
  const items: TaxonomyItem[] = [];

  // Handle different taxonomy structures
  if (taxonomyKey === "encoding-formats") {
    // Extract from binary_to_text and character_encodings sections
    const sections = ["binary_to_text", "character_encodings"];
    for (const section of sections) {
      if (taxonomy[section]) {
        const sectionData = taxonomy[section];
        for (const key of Object.keys(sectionData)) {
          items.push({
            id: key,
            constant_name: toConstantCase(key),
            constant_name_go: toGoConstantCase(key),
            display_name: key,
            description: sectionData[key].use_case || "",
          });
        }
      }
    }
  } else if (taxonomyKey === "normalization-profiles") {
    // Extract from canonical_forms and custom_profiles sections
    const sections = ["canonical_forms", "custom_profiles"];
    for (const section of sections) {
      if (taxonomy[section]) {
        const sectionData = taxonomy[section];
        for (const key of Object.keys(sectionData)) {
          items.push({
            id: key,
            constant_name: toConstantCase(key),
            constant_name_go: toGoConstantCase(key),
            display_name: sectionData[key].full_name || key,
            description: sectionData[key].description || sectionData[key].use_case || "",
          });
        }
      }
    }
  } else if (taxonomyKey === "confidence-levels") {
    // Extract from confidence_levels section
    if (taxonomy.confidence_levels) {
      const levelsData = taxonomy.confidence_levels;
      for (const key of Object.keys(levelsData)) {
        items.push({
          id: key,
          constant_name: toConstantCase(key),
          constant_name_go: toGoConstantCase(key),
          display_name: key,
          description: levelsData[key].description || "",
        });
      }
    }
  }

  const className = singularizeEnumName(toPascalCase(taxonomyKey));

  return {
    className,
    key: taxonomyKey,
    path: taxonomyRelPath,
    description: `${className} enum`,
    items,
  };
}

// Helper: Prepare template data for a language
function prepareTemplateData(lang: string) {
  const taxonomyBasePath = metadata.taxonomy_base_path;

  // Process taxonomies
  const taxonomies = Object.entries(metadata.taxonomies).map(([key, path]) =>
    processTaxonomy(key, `${taxonomyBasePath}/${path}`, path)
  );

  return {
    version: metadata.version,
    lastReviewed: metadata.last_reviewed,
    last_reviewed: metadata.last_reviewed,
    taxonomies,
    module: metadata.module,
  };
}

// Render template for a specific language and template type
async function renderTemplate(
  lang: string,
  templateType: string,
  data: any
): Promise<string> {
  const langConfig = metadata.languages[lang];
  if (!langConfig) {
    throw new Error(`Language "${lang}" not found in metadata.json`);
  }

  const templateFilename = langConfig.templates[templateType];
  if (!templateFilename) {
    throw new Error(`Template "${templateType}" not found for language "${lang}"`);
  }

  const templatePath = resolve(`scripts/codegen/fulencode-types/${lang}/${templateFilename}`);
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = readFileSync(templatePath, "utf8");

  if (lang === "python") {
    // Use Nunjucks for Python (Jinja2-compatible)
    const nunjucks = await import("nunjucks");
    const env = new nunjucks.Environment(null, { autoescape: false });

    // Add custom filter for JSON serialization
    env.addFilter("pyjson", function (str: string) {
      return JSON.stringify(str);
    });

    return env.renderString(templateContent, data);
  } else if (lang === "typescript" || lang === "go") {
    // Use EJS for TypeScript and Go
    const ejs = await import("ejs");
    return ejs.render(templateContent, { ...data, JSON });
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

  const outputDir = resolve(langConfig.output_dir);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`  Created directory: ${outputDir}`);
  }

  // Prepare template data
  console.log(`  Preparing template data...`);
  const data = prepareTemplateData(lang);

  // Generate each template type
  for (const [templateType, templateFilename] of Object.entries(langConfig.templates)) {
    console.log(`  Rendering ${templateType} template: ${templateFilename}`);
    const rendered = await renderTemplate(lang, templateType, data);

    // Determine output filename based on language and template type
    let outputFilename: string;
    if (lang === "python") {
      if (templateType === "init") {
        outputFilename = "__init__.py";
      } else {
        outputFilename = `${templateType}.py`;
      }
    } else if (lang === "typescript") {
      outputFilename = `${templateType}.ts`;
    } else if (lang === "go") {
      outputFilename = `${templateType}.go`;
    } else {
      outputFilename = `${templateType}.txt`;
    }

    const outputPath = `${outputDir}/${outputFilename}`;
    console.log(`  Writing to: ${outputPath}`);
    writeFileSync(outputPath, rendered, "utf8");

    // Run postprocess script if --format flag present
    if (flags.format && langConfig.postprocess) {
      const postprocessPath = resolve(
        `scripts/codegen/fulencode-types/${lang}/${langConfig.postprocess}`
      );
      if (existsSync(postprocessPath)) {
        console.log(`  Formatting with: ${langConfig.postprocess}`);
        try {
          execSync(`${postprocessPath} ${outputPath}`, { stdio: "inherit" });
        } catch (error) {
          console.warn(`  Warning: Postprocessing failed (continuing anyway)`);
        }
      }
    }
  }

  console.log(`✓ ${lang} generation complete`);
}

// Main execution
async function main() {
  try {
    if (flags.all) {
      const languages = Object.keys(metadata.languages);
      console.log(`Generating fulencode types for all languages: ${languages.join(", ")}`);

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
    console.error(`   - Verify metadata: ${metadataPath}`);
    console.error(`   - Verify taxonomies exist: ${metadata.taxonomy_base_path}`);
    console.error(`   - Check template syntax and data structure`);
    process.exit(1);
  }
}

main();
