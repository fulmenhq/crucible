#!/usr/bin/env bun
/**
 * Fulpack Types Generator
 *
 * Generates language-native type bindings from fulpack JSON schemas and YAML taxonomies.
 * Uses templates from scripts/codegen/fulpack-types/ to produce Go, Python, and TypeScript code.
 *
 * Usage:
 *   bun run scripts/codegen/generate-fulpack-types.ts --lang python
 *   bun run scripts/codegen/generate-fulpack-types.ts --all
 *   bun run scripts/codegen/generate-fulpack-types.ts --all --format
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
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

interface JSONSchemaProperty {
  type?: string | string[];
  enum?: any[];
  items?: JSONSchemaProperty;
  format?: string;
  description?: string;
  default?: any;
  $ref?: string;
}

interface JSONSchema {
  title?: string;
  description?: string;
  type: string;
  properties?: {
    [key: string]: JSONSchemaProperty;
  };
  required?: string[];
  additionalProperties?: boolean;
}

interface TaxonomyItem {
  id: string;
  key?: string;
  name: string;
  description?: string;
}

interface Taxonomy {
  version: string;
  last_updated?: string;
  description?: string;
  formats?: TaxonomyItem[];
  types?: TaxonomyItem[];
  operations?: TaxonomyItem[];
  [key: string]: any;
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
  console.error("  bun run scripts/codegen/generate-fulpack-types.ts --lang python");
  console.error("  bun run scripts/codegen/generate-fulpack-types.ts --all");
  console.error("  bun run scripts/codegen/generate-fulpack-types.ts --all --format");
  process.exit(40);
}

// Load metadata
const metadataPath = resolve("scripts/codegen/fulpack-types/metadata.json");
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
    return name.slice(0, -1); // "Formats" -> "Format", "Operations" -> "Operation"
  }
  return name;
}

// Helper: Infer Python type from JSON Schema property
function inferPythonType(property: JSONSchemaProperty, isOptional: boolean = false): string {
  const { type, enum: enumValues, items, format } = property;

  // Handle enums
  if (enumValues && enumValues.length > 0) {
    const literalTypes = enumValues.map((v) => JSON.stringify(v)).join(", ");
    return `Literal[${literalTypes}]`;
  }

  // Handle arrays (Python 3.12+ lowercase)
  if (type === "array" && items) {
    const itemType = inferPythonType(items, false);
    return `list[${itemType}]`;
  }

  // Handle format-specific types
  if (format === "date-time") {
    return "str"; // ISO 8601 datetime string
  }

  // Handle basic types
  const typeMap: { [key: string]: string } = {
    string: "str",
    integer: "int",
    number: "float",
    boolean: "bool",
    object: "dict[str, Any]",
  };

  // Handle union types (e.g., ["integer", "null"])
  if (Array.isArray(type)) {
    const hasNull = type.includes("null");
    const nonNullTypes = type.filter((t) => t !== "null");

    if (nonNullTypes.length === 0) {
      return "None";
    }

    const baseType = nonNullTypes[0]!; // Safe: we checked length > 0
    const pythonType = typeMap[baseType] || "Any";

    // Return nullable type if null was in the union
    return hasNull ? `${pythonType} | None` : pythonType;
  }

  const pythonType = type ? typeMap[type] || "Any" : "Any";

  return pythonType;
}

// Helper: Infer TypeScript type from JSON Schema property
function inferTypeScriptType(property: JSONSchemaProperty): string {
  const { type, enum: enumValues, items, format } = property;

  // Handle enums
  if (enumValues && enumValues.length > 0) {
    const literalTypes = enumValues.map((v) => JSON.stringify(v)).join(" | ");
    return literalTypes;
  }

  // Handle arrays
  if (type === "array" && items) {
    const itemType = inferTypeScriptType(items);

    // Wrap union types in parentheses before applying array bracket
    // This ensures array bracket applies to entire union, not last member
    // Example: ("a" | "b" | "c")[] instead of "a" | "b" | "c"[]
    const needsParens = itemType.includes(" | ");
    return needsParens ? `(${itemType})[]` : `${itemType}[]`;
  }

  // Handle format-specific types
  if (format === "date-time") {
    return "string"; // ISO 8601 datetime string
  }

  // Handle basic types
  const typeMap: { [key: string]: string } = {
    string: "string",
    integer: "number",
    number: "number",
    boolean: "boolean",
    object: "Record<string, unknown>",
  };

  // Handle union types (e.g., ["integer", "null"])
  if (Array.isArray(type)) {
    const hasNull = type.includes("null");
    const nonNullTypes = type.filter((t) => t !== "null");

    if (nonNullTypes.length === 0) {
      return "null";
    }

    const baseType = nonNullTypes[0]!;
    const tsType = typeMap[baseType] || "unknown";

    return hasNull ? `${tsType} | null` : tsType;
  }

  return type ? typeMap[type] || "unknown" : "unknown";
}

// Helper: Infer Go type from JSON Schema property
function inferGoType(property: JSONSchemaProperty, isOptional: boolean = false): string {
  const { type, enum: enumValues, items, format } = property;

  // Handle enums - use string type, will be defined as type alias
  if (enumValues && enumValues.length > 0) {
    return "string";
  }

  // Handle arrays
  if (type === "array" && items) {
    const itemType = inferGoType(items, false);
    return `[]${itemType}`;
  }

  // Handle format-specific types
  if (format === "date-time") {
    return "string"; // ISO 8601 datetime string
  }

  // Handle basic types
  const typeMap: { [key: string]: string } = {
    string: "string",
    integer: "int64",
    number: "float64",
    boolean: "bool",
    object: "map[string]interface{}",
  };

  // Handle union types (e.g., ["integer", "null"])
  if (Array.isArray(type)) {
    const hasNull = type.includes("null");
    const nonNullTypes = type.filter((t) => t !== "null");

    if (nonNullTypes.length === 0) {
      return "*interface{}";
    }

    const baseType = nonNullTypes[0]!;
    const goType = typeMap[baseType] || "interface{}";

    // Use pointer type for nullable
    return hasNull || isOptional ? `*${goType}` : goType;
  }

  const goType = type ? typeMap[type] || "interface{}" : "interface{}";
  return isOptional ? `*${goType}` : goType;
}

// Helper: Convert snake_case to PascalCase for Go
function toGoPascalCase(snakeCase: string): string {
  return snakeCase
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Helper: Convert kebab-case or snake_case to Go constant format
function toGoConstantCase(name: string): string {
  // Handle cases like "tar.gz" -> "TarGz"
  return name
    .replace(/[.\-]/g, "_")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Helper: Load and parse JSON schema
function loadSchema(schemaPath: string): JSONSchema {
  const fullPath = resolve(schemaPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Schema not found: ${fullPath}`);
  }
  return JSON.parse(readFileSync(fullPath, "utf8")) as JSONSchema;
}

// Helper: Load and parse YAML taxonomy
function loadTaxonomy(taxonomyPath: string): Taxonomy {
  const fullPath = resolve(taxonomyPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Taxonomy not found: ${fullPath}`);
  }
  return loadYaml(readFileSync(fullPath, "utf8")) as Taxonomy;
}

// Helper: Process schema into template data
function processSchema(
  schemaFilename: string,
  schemaBasePath: string,
  isOptions: boolean = false
): any {
  const schemaPath = `${schemaBasePath}/${schemaFilename}`;
  const schema = loadSchema(schemaPath);

  const className = toPascalCase(schemaFilename.replace(".schema.json", ""));
  const properties = schema.properties || {};
  const required = schema.required || [];

  const processedProps = Object.entries(properties).map(([propName, propDef]) => {
    const isRequired = required.includes(propName);
    const pythonType = inferPythonType(propDef);
    const isAlreadyNullable = pythonType.endsWith(" | None");
    const typescriptType = inferTypeScriptType(propDef);
    const goType = inferGoType(propDef, !isRequired);
    const nameGo = toGoPascalCase(propName);

    return {
      name: propName,
      name_go: nameGo,
      python_type: pythonType,
      typescript_type: typescriptType,
      go_type: goType,
      description: propDef.description || "",
      is_required: isRequired,
      is_already_nullable: isAlreadyNullable,
      default: propDef.default,
    };
  });

  const requiredProps = processedProps.filter((p) => p.is_required);
  const optionalProps = processedProps.filter((p) => !p.is_required);

  return {
    className,
    filename: schemaFilename,
    description: schema.description || `${className} type`,
    properties: processedProps,
    required_properties: requiredProps,
    optional_properties: optionalProps,
    is_options: isOptions,
  };
}

// Helper: Process taxonomy into enum data
function processTaxonomy(taxonomyKey: string, taxonomyFullPath: string, taxonomyRelPath: string): any {
  const taxonomy = loadTaxonomy(taxonomyFullPath);

  // Determine the array key (formats, types, operations, etc.)
  let items: TaxonomyItem[] = [];
  if (taxonomy.formats) items = taxonomy.formats;
  else if (taxonomy.types) items = taxonomy.types;
  else if (taxonomy.operations) items = taxonomy.operations;
  else {
    // Fallback: look for first array in taxonomy
    for (const [key, value] of Object.entries(taxonomy)) {
      if (Array.isArray(value)) {
        items = value;
        break;
      }
    }
  }

  const className = singularizeEnumName(toPascalCase(taxonomyKey));

  const enumItems = items.map((item) => ({
    id: item.id || item.key,
    constant_name: toConstantCase(item.id || item.key || ""),
    constant_name_go: toGoConstantCase(item.id || item.key || ""),
    display_name: item.name,
    description: item.description || "",
  }));

  return {
    className,
    key: taxonomyKey,
    path: taxonomyRelPath,
    description: taxonomy.description || `${className} enum`,
    items: enumItems,
  };
}

// Helper: Prepare template data for a language
function prepareTemplateData(lang: string) {
  const schemaBasePath = metadata.schema_base_path;
  const taxonomyBasePath = metadata.taxonomy_base_path;

  // Process data structure schemas
  const dataStructures = metadata.schemas.data_structures.map((filename) =>
    processSchema(filename, schemaBasePath, false)
  );

  // Process options schemas
  const optionsSchemas = metadata.schemas.options.map((filename) =>
    processSchema(filename, schemaBasePath, true)
  );

  // Process taxonomies
  const taxonomies = Object.entries(metadata.taxonomies).map(([key, path]) =>
    processTaxonomy(key, `${taxonomyBasePath}/${path}`, path)
  );

  return {
    version: metadata.version,
    lastReviewed: metadata.last_reviewed,
    last_reviewed: metadata.last_reviewed,
    data_structures: dataStructures,
    options: optionsSchemas,
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

  const templatePath = resolve(`scripts/codegen/fulpack-types/${lang}/${templateFilename}`);
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
        `scripts/codegen/fulpack-types/${lang}/${langConfig.postprocess}`
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
      console.log(`Generating fulpack types for all languages: ${languages.join(", ")}`);

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
    console.error(`   - Verify schemas exist: ${metadata.schema_base_path}`);
    console.error(`   - Verify taxonomies exist: ${metadata.taxonomy_base_path}`);
    console.error(`   - Check template syntax and data structure`);
    process.exit(1);
  }
}

main();
