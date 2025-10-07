#!/usr/bin/env bun

/**
 * Fetch JSON Schema meta-schemas from upstream
 *
 * Downloads canonical meta-schemas for offline validation.
 *
 * Usage:
 *   bun run scripts/sync-schemas.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const META_DIR = join(ROOT, "schemas/meta");

interface MetaSchema {
  name: string;
  url: string;
  path: string;
}

const SCHEMAS: MetaSchema[] = [
  {
    name: "draft-07",
    url: "https://json-schema.org/draft-07/schema",
    path: "draft-07/schema.json",
  },
  {
    name: "draft-2020-12",
    url: "https://json-schema.org/draft/2020-12/schema",
    path: "draft-2020-12/schema.json",
  },
];

const VOCABULARIES: MetaSchema[] = [
  {
    name: "core",
    url: "https://json-schema.org/draft/2020-12/meta/core",
    path: "draft-2020-12/meta/core.json",
  },
  {
    name: "applicator",
    url: "https://json-schema.org/draft/2020-12/meta/applicator",
    path: "draft-2020-12/meta/applicator.json",
  },
  {
    name: "unevaluated",
    url: "https://json-schema.org/draft/2020-12/meta/unevaluated",
    path: "draft-2020-12/meta/unevaluated.json",
  },
  {
    name: "validation",
    url: "https://json-schema.org/draft/2020-12/meta/validation",
    path: "draft-2020-12/meta/validation.json",
  },
  {
    name: "meta-data",
    url: "https://json-schema.org/draft/2020-12/meta/meta-data",
    path: "draft-2020-12/meta/meta-data.json",
  },
  {
    name: "format-annotation",
    url: "https://json-schema.org/draft/2020-12/meta/format-annotation",
    path: "draft-2020-12/meta/format-annotation.json",
  },
  {
    name: "content",
    url: "https://json-schema.org/draft/2020-12/meta/content",
    path: "draft-2020-12/meta/content.json",
  },
];

async function main() {
  console.log("📥 Fetching JSON Schema meta-schemas...");

  // Create directories
  mkdirSync(join(META_DIR, "draft-07"), { recursive: true });
  mkdirSync(join(META_DIR, "draft-2020-12/meta"), { recursive: true });

  // Fetch main schemas
  for (const schema of SCHEMAS) {
    await fetchSchema(schema);
  }

  // Fetch vocabularies
  for (const vocab of VOCABULARIES) {
    await fetchVocabulary(vocab);
  }

  console.log(`✅ Synced meta-schemas to ${META_DIR}`);
}

async function fetchSchema(schema: MetaSchema) {
  console.log(`📄 Fetching ${schema.name}...`);

  try {
    const response = await fetch(schema.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const outputPath = join(META_DIR, schema.path);

    writeFileSync(outputPath, content);
    console.log(`   ✓ Saved to ${schema.path}`);
  } catch (error) {
    console.error(`   ❌ Failed to fetch ${schema.name}:`, error);
    process.exit(1);
  }
}

async function fetchVocabulary(vocab: MetaSchema) {
  console.log(`📄 Fetching ${vocab.name} vocabulary...`);

  try {
    const response = await fetch(vocab.url);

    if (!response.ok) {
      console.warn(`   ⚠️  Failed to fetch ${vocab.name}: HTTP ${response.status}`);
      return;
    }

    const content = await response.text();
    const outputPath = join(META_DIR, vocab.path);

    writeFileSync(outputPath, content);
    console.log(`   ✓ Saved ${vocab.name} vocabulary`);
  } catch (_error) {
    console.warn(`   ⚠️  Warning: failed to download ${vocab.url}`);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
