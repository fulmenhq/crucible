#!/usr/bin/env bun

/**
 * Validate that taxonomy version matches repository VERSION file.
 *
 * Ensures taxonomy versions stay synchronized with Crucible releases per ADR-0010.
 *
 * Usage:
 *   bun run scripts/validate-taxonomy-version.ts
 *
 * Exit codes:
 *   0: Versions match
 *   1: Version mismatch or file read errors
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const VERSION_FILE = path.join(repoRoot, 'VERSION');
const TAXONOMY_FILE = path.join(repoRoot, 'config/taxonomy/metrics.yaml');

interface TaxonomySchema {
  version?: string;
  [key: string]: unknown;
}

async function readVersion(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return content.trim();
}

async function readTaxonomyVersion(): Promise<string> {
  const content = await readFile(TAXONOMY_FILE, 'utf-8');
  const taxonomy = YAML.load(content) as TaxonomySchema;

  if (!taxonomy.version) {
    throw new Error(`Taxonomy file ${TAXONOMY_FILE} missing 'version' field`);
  }

  return taxonomy.version;
}

async function main() {
  try {
    const repoVersion = await readVersion(VERSION_FILE);
    const taxonomyVersion = await readTaxonomyVersion();

    console.log(`Repository VERSION: ${repoVersion}`);
    console.log(`Taxonomy version:   ${taxonomyVersion}`);

    if (repoVersion !== taxonomyVersion) {
      console.error('\n❌ Version mismatch detected!');
      console.error(`   Repository: ${repoVersion}`);
      console.error(`   Taxonomy:   ${taxonomyVersion}`);
      console.error('\nTaxonomy versions must match repository VERSION per ADR-0010.');
      console.error('Run: bun run scripts/update-version.ts');
      process.exit(1);
    }

    console.log('✅ Taxonomy version matches repository VERSION');
    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
