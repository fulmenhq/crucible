#!/usr/bin/env bun
/**
 * Fulhash Types Generator
 *
 * Generates language-native type bindings from fulhash JSON schemas and YAML taxonomies.
 *
 * Usage:
 *   bun run scripts/codegen/generate-fulhash-types.ts --lang python
 *   bun run scripts/codegen/generate-fulhash-types.ts --all
 *   bun run scripts/codegen/generate-fulhash-types.ts --all --format
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import { execSync } from "node:child_process";

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
  pattern?: string;
  maximum?: number;
  minimum?: number;
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
  allOf?: any[];
}

interface TaxonomyItem {
  id: string;
  constant_name: string;
  constant_name_go: string;
  display_name: string;
  description?: string;
}

interface Taxonomy {
  version: string;
  last_updated?: string;
  description?: string;
  algorithms?: any[];
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
  process.exit(40);
}

// Load metadata
const metadataPath = resolve("scripts/codegen/fulhash-types/metadata.json");
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

// Helper: Convert kebab-case to Go constant format
function toGoConstantCase(name: string): string {
  // xxh3-128 -> XXH3_128, crc32 -> CRC32
  return name.toUpperCase().replace(/-/g, "_");
}

// Helper: Infer Python type from JSON Schema property
function inferPythonType(property: JSONSchemaProperty, isOptional: boolean = false): string {
  const { type, enum: enumValues, items } = property;

  if (enumValues && enumValues.length > 0) {
    const literalTypes = enumValues.map((v) => JSON.stringify(v)).join(", ");
    return `Literal[${literalTypes}]`;
  }

  if (type === "array" && items) {
    const itemType = inferPythonType(items, false);
    return `list[${itemType}]`;
  }

  const typeMap: { [key: string]: string } = {
    string: "str",
    integer: "int",
    number: "float",
    boolean: "bool",
    object: "dict[str, Any]",
  };

  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length === 0) return "None";
    const baseType = nonNullTypes[0]!; // Safe
    const pythonType = typeMap[baseType] || "Any";
    return type.includes("null") ? `${pythonType} | None` : pythonType;
  }

  return type ? typeMap[type] || "Any" : "Any";
}

// Helper: Infer TypeScript type
function inferTypeScriptType(property: JSONSchemaProperty): string {
  const { type, enum: enumValues, items } = property;

  if (enumValues && enumValues.length > 0) {
    return enumValues.map((v) => JSON.stringify(v)).join(" | ");
  }

  if (type === "array" && items) {
    const itemType = inferTypeScriptType(items);
    const needsParens = itemType.includes(" | ");
    return needsParens ? `(${itemType})[]` : `${itemType}[]`;
  }

  const typeMap: { [key: string]: string } = {
    string: "string",
    integer: "number",
    number: "number",
    boolean: "boolean",
    object: "Record<string, unknown>",
  };

  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length === 0) return "null";
    const tsType = typeMap[nonNullTypes[0]!] || "unknown";
    return type.includes("null") ? `${tsType} | null` : tsType;
  }

  return type ? typeMap[type] || "unknown" : "unknown";
}

// Helper: Infer Go type
function inferGoType(property: JSONSchemaProperty, isOptional: boolean = false): string {
  const { type, enum: enumValues, items } = property;

  // Special case for Algorithm enum property
  if (property.description && property.description.includes("Algorithm identifier")) {
    return "Algorithm";
  }

  if (enumValues && enumValues.length > 0) {
    return "string";
  }

  if (type === "array" && items) {
    if (items.type === "integer" && items.maximum === 255) {
      return "[]byte";
    }
    const itemType = inferGoType(items, false);
    return `[]${itemType}`;
  }

  const typeMap: { [key: string]: string } = {
    string: "string",
    integer: "int64",
    number: "float64",
    boolean: "bool",
    object: "map[string]interface{}",
  };

  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length === 0) return "interface{}";
    const goType = typeMap[nonNullTypes[0]!] || "interface{}";
    return type.includes("null") || isOptional ? `*${goType}` : goType;
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

function loadSchema(schemaPath: string): JSONSchema {
  const fullPath = resolve(schemaPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Schema not found: ${fullPath}`);
  }
  return JSON.parse(readFileSync(fullPath, "utf8")) as JSONSchema;
}

function loadTaxonomy(taxonomyPath: string): Taxonomy {
  const fullPath = resolve(taxonomyPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Taxonomy not found: ${fullPath}`);
  }
  return loadYaml(readFileSync(fullPath, "utf8")) as Taxonomy;
}

function processSchema(schemaFilename: string, schemaBasePath: string): any {
  const schemaPath = `${schemaBasePath}/${schemaFilename}`;
  const schema = loadSchema(schemaPath);

  const className = toPascalCase(schemaFilename.replace(".schema.json", ""));
  const properties = schema.properties || {};
  const required = schema.required || [];

  const processedProps = Object.entries(properties).map(([propName, propDef]) => {
    const isRequired = required.includes(propName);
    const pythonType = inferPythonType(propDef);
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
      default: propDef.default,
    };
  });

  return {
    className,
    filename: schemaFilename,
    description: schema.description || `${className} type`,
    properties: processedProps,
    required_properties: processedProps.filter((p) => p.is_required),
    optional_properties: processedProps.filter((p) => !p.is_required),
  };
}

function processTaxonomy(
  taxonomyKey: string,
  taxonomyFullPath: string,
  taxonomyRelPath: string,
): any {
  const taxonomy = loadTaxonomy(taxonomyFullPath);
  let items: TaxonomyItem[] = [];

  if (taxonomy.algorithms) {
    items = taxonomy.algorithms.map((algo: any) => ({
      id: algo.id,
      constant_name: toConstantCase(algo.id),
      constant_name_go: toGoConstantCase(algo.id),
      display_name: algo.name,
      description: algo.description || "",
    }));
  }

  const className = "Algorithm"; // Hardcoded for now since we only have one

  return {
    className,
    key: taxonomyKey,
    path: taxonomyRelPath,
    description: taxonomy.description || `${className} enum`,
    items,
  };
}

function prepareTemplateData(lang: string) {
  // Prevent unused warning by using the lang parameter in a trivial way if needed,
  // or just leave it as is if the linter allows unused parameters.
  // In this case, we just need to fix the TS errors.
  const schemaBasePath = metadata.schema_base_path;
  const taxonomyBasePath = metadata.taxonomy_base_path;

  const dataStructures = metadata.schemas.data_structures.map((filename) =>
    processSchema(filename, schemaBasePath),
  );

  const taxonomies = Object.entries(metadata.taxonomies).map(([key, path]) =>
    processTaxonomy(key, `${taxonomyBasePath}/${path}`, path),
  );

  return {
    version: metadata.version,
    last_reviewed: metadata.last_reviewed,
    data_structures: dataStructures,
    taxonomies,
    module: metadata.module,
  };
}

async function renderTemplate(lang: string, templateType: string, data: any): Promise<string> {
  const langConfig = metadata.languages[lang];
  if (!langConfig) throw new Error(`Language "${lang}" not found`);

  const templateFilename = langConfig.templates[templateType];
  if (!templateFilename) throw new Error(`Template "${templateType}" not found`);

  const templatePath = resolve(`scripts/codegen/fulhash-types/${lang}/${templateFilename}`);
  if (!existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

  const templateContent = readFileSync(templatePath, "utf8");

  if (lang === "python") {
    const nunjucks = await import("nunjucks");
    const env = new nunjucks.Environment(null, { autoescape: false });
    env.addFilter("pyjson", (str: string) => JSON.stringify(str));
    return env.renderString(templateContent, data);
  } else if (lang === "typescript" || lang === "go") {
    const ejs = await import("ejs");
    return ejs.render(templateContent, { ...data, JSON });
  }

  throw new Error(`Unsupported language: ${lang}`);
}

async function generateLanguage(lang: string) {
  console.log(`\n→ Generating ${lang}...`);
  const langConfig = metadata.languages[lang];
  if (!langConfig) return;

  const outputDir = resolve(langConfig.output_dir);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const data = prepareTemplateData(lang);

  for (const [templateType, templateFilename] of Object.entries(langConfig.templates)) {
    console.log(`  Rendering ${templateType} template: ${templateFilename}`);
    const rendered = await renderTemplate(lang, templateType, data);

    let outputFilename: string;
    if (lang === "python") {
      outputFilename = templateType === "init" ? "__init__.py" : `${templateType}.py`;
    } else if (lang === "typescript") {
      outputFilename = `${templateType}.ts`;
    } else if (lang === "go") {
      // types.template.ejs generates everything for Go usually, but let's assume we name it types.go for now
      // or algorithms.go if we want to split. Let's match template keys.
      if (templateType === "types") outputFilename = "types.go";
      else outputFilename = `${templateType}.go`;
    } else {
      outputFilename = `${templateType}.txt`;
    }

    const outputPath = `${outputDir}/${outputFilename}`;
    console.log(`  Writing to: ${outputPath}`);
    writeFileSync(outputPath, rendered, "utf8");

    if (flags.format && langConfig.postprocess) {
      const postprocessPath = resolve(
        `scripts/codegen/fulhash-types/${lang}/${langConfig.postprocess}`,
      );
      if (existsSync(postprocessPath)) {
        try {
          execSync(`${postprocessPath} ${outputPath}`, { stdio: "inherit" });
        } catch (e) {}
      }
    }
  }
}

async function main() {
  if (flags.all) {
    for (const lang of Object.keys(metadata.languages)) {
      await generateLanguage(lang);
    }
  } else if (flags.lang) {
    await generateLanguage(flags.lang);
  }
}

main();
