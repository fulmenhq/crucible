import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

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

export function loadTerminalCatalog(
  version: string = 'v1.0.0'
): Map<string, TerminalConfig> {
  const catalog = new Map<string, TerminalConfig>();
  const catalogPath = join(
    __dirname,
    '../schemas/terminal',
    version,
    'catalog'
  );

  const files = readdirSync(catalogPath).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    const content = readFileSync(join(catalogPath, file), 'utf-8');
    const config = yaml.load(content) as TerminalConfig;
    catalog.set(config.name, config);
  }

  return catalog;
}

export function getTerminalConfig(
  name: string,
  version: string = 'v1.0.0'
): TerminalConfig | undefined {
  const catalog = loadTerminalCatalog(version);
  return catalog.get(name);
}

export function getTerminalSchema(version: string = 'v1.0.0'): object {
  const schemaPath = join(
    __dirname,
    '../schemas/terminal',
    version,
    'schema.json'
  );
  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

export function validateTerminalConfig(config: unknown): config is TerminalConfig {
  const c = config as any;
  return (
    typeof c === 'object' &&
    typeof c.name === 'string' &&
    typeof c.detection === 'object' &&
    typeof c.overrides === 'object'
  );
}
