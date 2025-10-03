#!/usr/bin/env bun

/**
 * Synchronize version constants across Crucible artifacts.
 *
 * Reads the root VERSION file (CalVer) and applies the value to:
 *   - lang/go/schemas.go (const Version)
 *   - lang/typescript/src/index.ts (VERSION, CRUCIBLE_VERSION)
 *   - lang/typescript/src/schemas.ts (VERSION)
 *   - lang/typescript/package.json (version field)
 *
 * Usage:
 *   bun run scripts/update-version.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const VERSION_FILE = join(ROOT, "VERSION");

function readVersion(): string {
  const raw = readFileSync(VERSION_FILE, "utf-8").trim();
  if (!raw) {
    throw new Error("VERSION file is empty");
  }
  return raw;
}

function replaceInFile(path: string, replacer: (contents: string) => string) {
  const original = readFileSync(path, "utf-8");
  const updated = replacer(original);
  if (original === updated) {
    return false;
  }
  writeFileSync(path, updated);
  return true;
}

function updateGo(version: string): boolean {
  const target = join(ROOT, "lang/go/schemas.go");
  return replaceInFile(target, contents =>
    contents.replace(
      /const\s+Version\s*=\s*"[^"]+"/,
      `const Version = "${version}"`
    )
  );
}

function updateTypeScriptSources(version: string): boolean {
  const idxPath = join(ROOT, "lang/typescript/src/index.ts");
  const schemasPath = join(ROOT, "lang/typescript/src/schemas.ts");

  const changedIndex = replaceInFile(idxPath, contents =>
    contents
      .replace(
        /export const VERSION = '[^']+';/,
        `export const VERSION = '${version}';`
      )
      .replace(
        /export const CRUCIBLE_VERSION = '[^']+';/,
        `export const CRUCIBLE_VERSION = '${version}';`
      )
  );

  const changedSchemas = replaceInFile(schemasPath, contents =>
    contents.replace(
      /export const VERSION = '[^']+';/,
      `export const VERSION = '${version}';`
    )
  );

  return changedIndex || changedSchemas;
}

function updateTypeScriptPackage(version: string): boolean {
  const pkgPath = join(ROOT, "lang/typescript/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  if (pkg.version === version) {
    return false;
  }
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}

function main() {
  const version = readVersion();
  console.log(`🔢 Synchronizing version ${version}`);

  const mutations = [
    updateGo(version) && "lang/go/schemas.go",
    updateTypeScriptSources(version) && "lang/typescript/src/*.ts",
    updateTypeScriptPackage(version) && "lang/typescript/package.json"
  ].filter(Boolean) as string[];

  if (mutations.length === 0) {
    console.log("✅ All artifacts already aligned");
  } else {
    for (const entry of mutations) {
      console.log(`✏️  Updated ${entry}`);
    }
    console.log("✅ Version synchronization complete");
  }
}

main();
