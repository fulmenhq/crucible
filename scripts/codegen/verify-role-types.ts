#!/usr/bin/env bun

/**
 * Role Types Verification Script
 *
 * Verifies that lang/rust/src/agentic.rs is up-to-date with the role
 * catalog at config/agentic/roles/*.yaml by regenerating to a temp file
 * and comparing against the checked-in version.
 *
 * Usage:
 *   bun run scripts/codegen/verify-role-types.ts
 *   make verify-codegen
 *
 * Exit codes:
 *   0 - Verified: generated output matches checked-in file
 *   1 - Drift detected or verification error
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const checkedInPath = resolve("lang/rust/src/agentic.rs");
const tmpDir = resolve(".tmp/codegen-verify-roles");
const tmpPath = resolve(tmpDir, "agentic.rs");

// Ensure tmp directory exists
mkdirSync(tmpDir, { recursive: true });

try {
  // Regenerate to temp location
  execSync(`bun run scripts/codegen/generate-role-types.ts --format --out "${tmpPath}"`, {
    stdio: "pipe",
  });

  const generated = readFileSync(tmpPath, "utf-8");
  const checkedIn = readFileSync(checkedInPath, "utf-8");

  if (generated === checkedIn) {
    console.log("✅ Role types are up-to-date");
    process.exit(0);
  } else {
    console.error("❌ Role types drift detected");
    console.error("   lang/rust/src/agentic.rs does not match regenerated output.");
    console.error("   Run `make codegen-roles` to update.");
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Role types verification failed:");
  console.error(`   ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
} finally {
  // Clean up temp dir
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
