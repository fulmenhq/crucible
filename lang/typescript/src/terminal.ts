import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TerminalConfig {
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

export function loadTerminalCatalog(version = "v1.0.0"): Map<string, TerminalConfig> {
  const catalog = new Map<string, TerminalConfig>();
  const catalogPath = join(__dirname, "../schemas/terminal", version, "catalog");

  const files = readdirSync(catalogPath).filter((f) => f.endsWith(".yaml"));

  for (const file of files) {
    const content = readFileSync(join(catalogPath, file), "utf-8");
    const config = yaml.load(content) as TerminalConfig;
    catalog.set(config.name, config);
  }

  return catalog;
}

export function getTerminalConfig(name: string, version = "v1.0.0"): TerminalConfig | undefined {
  const catalog = loadTerminalCatalog(version);
  return catalog.get(name);
}

export function getTerminalSchema(version = "v1.0.0"): object {
  const schemaPath = join(__dirname, "../schemas/terminal", version, "schema.json");
  return JSON.parse(readFileSync(schemaPath, "utf-8"));
}

export function validateTerminalConfig(config: unknown): config is TerminalConfig {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  const c = config as Record<string, unknown>;
  return (
    typeof c["name"] === "string" &&
    typeof c["detection"] === "object" &&
    typeof c["overrides"] === "object"
  );
}
