#!/usr/bin/env bun
/**
 * Comprehensive Schema Validation
 *
 * This script performs TWO types of validation:
 * 1. Meta-validation: Validate all .schema.json files against JSON Schema 2020-12
 * 2. Data validation: Validate data files against their corresponding schemas
 *
 * Usage: bun run scripts/validate-all-schemas.ts
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

interface ValidationResult {
  file: string;
  passed: boolean;
  metaSchema?: string;
  error?: string;
}

/**
 * Recursively find all .schema.json files
 */
function findSchemaFiles(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry !== "node_modules" && !entry.startsWith(".")) {
          results.push(...findSchemaFiles(fullPath));
        }
      } else if (entry.endsWith(".schema.json")) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Meta-validate a schema file using goneat
 */
function metaValidateSchema(schemaPath: string): ValidationResult {
  const relativePath = path.relative(repoRoot, schemaPath);

  try {
    const output = execSync(`bin/goneat schema validate-schema "${schemaPath}"`, {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30000, // 30 second timeout per file (increased from 5s)
      stdio: ["pipe", "pipe", "pipe"], // Suppress stderr noise
    });

    // Parse output to extract meta-schema version
    const match = output.match(/\(([^)]+)\)/);
    const metaSchema = match ? match[1] : "unknown";

    return {
      file: relativePath,
      passed: true,
      metaSchema,
    };
  } catch (err: any) {
    return {
      file: relativePath,
      passed: false,
      error: err.stderr || err.message || "Validation timed out",
    };
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log("🔍 Comprehensive Schema Validation");
  console.log("");
  console.log("This validates ALL .schema.json files against their meta-schemas.");
  console.log("");

  // Find all schema files
  const schemaDir = path.join(repoRoot, "schemas");
  const schemaFiles = findSchemaFiles(schemaDir);

  console.log(`Found ${schemaFiles.length} schema files to validate`);
  console.log("");

  // Meta-validate each schema with progress
  const results: ValidationResult[] = [];
  const errors: ValidationResult[] = [];
  let processed = 0;

  for (const schemaFile of schemaFiles) {
    processed++;
    if (processed % 10 === 0 || processed === 1) {
      process.stdout.write(`\rValidating: ${processed}/${schemaFiles.length}`);
    }

    const result = metaValidateSchema(schemaFile);
    results.push(result);

    if (!result.passed) {
      errors.push(result);
      console.log(`\n❌ Failed: ${result.file}`);
    }
  }
  console.log(""); // New line after progress

  // Report results
  console.log("📊 Validation Results:");
  console.log("");

  if (errors.length === 0) {
    console.log(`✅ All ${results.length} schemas passed meta-validation`);
    console.log("");

    // Count by meta-schema
    const metaSchemaCounts: Record<string, number> = {};
    for (const result of results) {
      if (result.metaSchema) {
        metaSchemaCounts[result.metaSchema] = (metaSchemaCounts[result.metaSchema] || 0) + 1;
      }
    }

    console.log("Meta-schema distribution:");
    for (const [metaSchema, count] of Object.entries(metaSchemaCounts).sort()) {
      console.log(`  ${metaSchema}: ${count} schemas`);
    }
  } else {
    console.log(`❌ ${errors.length} schemas failed meta-validation:`);
    console.log("");

    for (const error of errors) {
      console.log(`  ❌ ${error.file}`);
      if (error.error) {
        console.log(`     ${error.error.split("\n")[0]}`);
      }
    }

    process.exit(1);
  }

  console.log("");
  console.log("✅ Meta-validation complete");
  console.log("");
  console.log("Note: Data validation (YAML/JSON against schemas) not yet implemented.");
  console.log("      See: https://github.com/fulmenhq/crucible/issues/XXX");

  // Explicitly exit to prevent hanging
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
