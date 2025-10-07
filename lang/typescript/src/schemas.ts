import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMAS_ROOT = join(__dirname, "../schemas");
const DOCS_ROOT = join(__dirname, "../docs");

export const VERSION = "2025.10.0";

export interface TerminalCatalogConfig {
  name: string;
  detection: {
    env?: Record<string, string>;
    term_program?: string;
  };
  overrides: {
    emoji_width?: number;
    specific_chars?: Record<string, number>;
  };
}

class TerminalSchemas {
  v1_0_0(): object {
    const path = join(SCHEMAS_ROOT, "terminal/v1.0.0/schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  catalog(): Map<string, TerminalCatalogConfig> {
    const catalogPath = join(SCHEMAS_ROOT, "terminal/v1.0.0/catalog");
    const configs = new Map<string, TerminalCatalogConfig>();

    const files = readdirSync(catalogPath);

    for (const file of files) {
      const filePath = join(catalogPath, file);
      if (statSync(filePath).isFile()) {
        const content = readFileSync(filePath, "utf-8");
        const config = this.parseYAML(content) as TerminalCatalogConfig;
        configs.set(config.name, config);
      }
    }

    return configs;
  }

  private parseYAML(content: string): unknown {
    try {
      return parseYaml(content, { json: true });
    } catch (e) {
      throw new Error(`Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

class PathfinderSchemasV1 {
  findQuery(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/find-query.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  finderConfig(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/finder-config.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  pathResult(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/path-result.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  errorResponse(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/error-response.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  metadata(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/metadata.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  pathConstraint(): object {
    const path = join(SCHEMAS_ROOT, "pathfinder/v1.0.0/path-constraint.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }
}

class PathfinderSchemas {
  v1_0_0(): PathfinderSchemasV1 {
    return new PathfinderSchemasV1();
  }
}

class ASCIISchemasV1 {
  stringAnalysis(): object {
    const path = join(SCHEMAS_ROOT, "ascii/v1.0.0/string-analysis.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  boxChars(): object {
    const path = join(SCHEMAS_ROOT, "ascii/v1.0.0/box-chars.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }
}

class ASCIISchemas {
  v1_0_0(): ASCIISchemasV1 {
    return new ASCIISchemasV1();
  }
}

class SchemaValidationSchemasV1 {
  validatorConfig(): object {
    const path = join(SCHEMAS_ROOT, "schema-validation/v1.0.0/validator-config.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  schemaRegistry(): object {
    const path = join(SCHEMAS_ROOT, "schema-validation/v1.0.0/schema-registry.schema.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  }
}

class SchemaValidationSchemas {
  v1_0_0(): SchemaValidationSchemasV1 {
    return new SchemaValidationSchemasV1();
  }
}

class SchemasRegistry {
  terminal(): TerminalSchemas {
    return new TerminalSchemas();
  }

  pathfinder(): PathfinderSchemas {
    return new PathfinderSchemas();
  }

  ascii(): ASCIISchemas {
    return new ASCIISchemas();
  }

  schemaValidation(): SchemaValidationSchemas {
    return new SchemaValidationSchemas();
  }
}

export const schemas = new SchemasRegistry();

class CodingStandards {
  go(): string {
    const path = join(DOCS_ROOT, "standards/coding/go.md");
    return readFileSync(path, "utf-8");
  }

  typescript(): string {
    const path = join(DOCS_ROOT, "standards/coding/typescript.md");
    return readFileSync(path, "utf-8");
  }
}

class StandardsRegistry {
  coding(): CodingStandards {
    return new CodingStandards();
  }
}

export const standards = new StandardsRegistry();

export function getSchema(schemaPath: string): object {
  const fullPath = join(SCHEMAS_ROOT, schemaPath);
  return JSON.parse(readFileSync(fullPath, "utf-8"));
}

export function getDoc(docPath: string): string {
  const fullPath = join(DOCS_ROOT, docPath);
  return readFileSync(fullPath, "utf-8");
}

export function listSchemas(basePath: string): string[] {
  const fullPath = join(SCHEMAS_ROOT, basePath);
  return readdirSync(fullPath);
}
