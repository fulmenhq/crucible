#!/usr/bin/env bun

/**
 * Synchronize version constants across Crucible artifacts.
 *
 * Reads the root VERSION file (CalVer) and applies the value to:
 *   - lang/go/schemas.go (const Version)
 *   - lang/typescript/src/index.ts (VERSION, CRUCIBLE_VERSION)
 *   - lang/typescript/src/schemas.ts (VERSION)
 *   - lang/typescript/package.json (version field)
 *   - lang/python/src/crucible/__init__.py (__version__)
 *
 * Usage:
 *   bun run scripts/update-version.ts
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const ROOT = join(import.meta.dir, "..");
const VERSION_FILE = join(ROOT, "VERSION");

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    bump: { type: "string" },
  },
  allowPositionals: false,
});

function readVersion(): string {
  const raw = readFileSync(VERSION_FILE, "utf-8").trim();
  if (!raw) {
    throw new Error("VERSION file is empty");
  }
  return raw;
}

function bumpVersion(current: string, type: string): string {
  const parts = current.split(".");
  if (parts.length !== 3) {
    throw new Error(`Invalid CalVer format: ${current}`);
  }
  const nums = parts.map(Number);
  if (nums.some(Number.isNaN)) {
    throw new Error(`Invalid CalVer numbers: ${current}`);
  }
  const [year, month, micro] = nums as [number, number, number];
  switch (type) {
    case "major":
      return `${year + 1}.${month}.${micro}`;
    case "minor":
      return `${year}.${month + 1}.${micro}`;
    case "patch":
      return `${year}.${month}.${micro + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }
}

function writeVersion(version: string) {
  writeFileSync(VERSION_FILE, `${version}\n`);
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
  const target = join(ROOT, "schemas.go");

  if (!existsSync(target)) {
    return false;
  }

  return replaceInFile(target, (contents) =>
    contents.replace(/const\s+Version\s*=\s*"[^"]+"/, `const Version = "${version}"`),
  );
}

function updateTypeScriptSources(version: string): boolean {
  const idxPath = join(ROOT, "lang/typescript/src/index.ts");
  const schemasPath = join(ROOT, "lang/typescript/src/schemas.ts");

  const changedIndex = replaceInFile(idxPath, (contents) =>
    contents
      .replace(/export const VERSION = '[^']+';/, `export const VERSION = '${version}';`)
      .replace(
        /export const CRUCIBLE_VERSION = '[^']+';/,
        `export const CRUCIBLE_VERSION = '${version}';`,
      ),
  );

  const changedSchemas = replaceInFile(schemasPath, (contents) =>
    contents.replace(/export const VERSION = '[^']+';/, `export const VERSION = '${version}';`),
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

function updatePython(version: string): boolean {
  const initPath = join(ROOT, "lang/python/src/crucible/__init__.py");

  if (!existsSync(initPath)) {
    return false;
  }

  return replaceInFile(initPath, (contents) =>
    contents.replace(/__version__\s*=\s*"[^"]+"/, `__version__ = "${version}"`),
  );
}

function updateTaxonomy(version: string): boolean {
  const taxonomyPath = join(ROOT, "config/taxonomy/metrics.yaml");

  if (!existsSync(taxonomyPath)) {
    return false;
  }

  return replaceInFile(taxonomyPath, (contents) =>
    contents.replace(/^version:\s*"[^"]+"/m, `version: "${version}"`),
  );
}

function main() {
  let version = readVersion();

  if (args.values.bump) {
    const newVersion = bumpVersion(version, args.values.bump);
    writeVersion(newVersion);
    version = newVersion;
    console.log(`🔢 Bumped version to ${version}`);
  } else {
    console.log(`🔢 Synchronizing version ${version}`);
  }

  const mutations = [
    updateGo(version) && "schemas.go",
    updateTypeScriptSources(version) && "lang/typescript/src/*.ts",
    updateTypeScriptPackage(version) && "lang/typescript/package.json",
    updatePython(version) && "lang/python/src/crucible/__init__.py",
    updateTaxonomy(version) && "config/taxonomy/metrics.yaml",
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
