#!/usr/bin/env bun

/**
 * Sync root assets to language wrappers
 *
 * Internal script for crucible maintainers to sync schemas/ and docs/
 * from repository root to lang/go/ and lang/typescript/ before publishing.
 *
 * Usage:
 *   bun run scripts/sync-to-lang.ts
 *   bun run scripts/sync-to-lang.ts --dry-run
 */

import { parseArgs } from "util";
import { existsSync, cpSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface SyncOptions {
  dryRun: boolean;
  verbose: boolean;
}

const ROOT = join(import.meta.dir, "..");

async function main() {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (args.values.help) {
    printHelp();
    process.exit(0);
  }

  const options: SyncOptions = {
    dryRun: args.values["dry-run"] || false,
    verbose: args.values.verbose || false,
  };

  console.log("🔄 Syncing root assets to language wrappers...");
  
  if (options.dryRun) {
    console.log("🔍 DRY RUN - no files will be modified");
  }

  await syncToGo(options);
  await syncToTypeScript(options);

  console.log("✅ Sync complete - language wrappers updated");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Review changes: git diff lang/");
  console.log("  2. Test Go build: cd lang/go && go test -v");
  console.log("  3. Test TS build: cd lang/typescript && bun test");
  console.log("  4. Commit: git add lang/ && git commit -m 'chore: sync assets to lang wrappers'");
}

async function syncToGo(options: SyncOptions) {
  console.log("📦 Go wrapper...");
  
  const goRoot = join(ROOT, "lang/go");
  
  await syncDirectory(
    join(ROOT, "schemas"),
    join(goRoot, "schemas"),
    "schemas/",
    options
  );
  
  await syncDirectory(
    join(ROOT, "docs"),
    join(goRoot, "docs"),
    "docs/",
    options
  );
}

async function syncToTypeScript(options: SyncOptions) {
  console.log("📦 TypeScript wrapper...");
  
  const tsRoot = join(ROOT, "lang/typescript");
  
  await syncDirectory(
    join(ROOT, "schemas"),
    join(tsRoot, "schemas"),
    "schemas/",
    options
  );
  
  await syncDirectory(
    join(ROOT, "docs"),
    join(tsRoot, "docs"),
    "docs/",
    options
  );
}

async function syncDirectory(
  source: string,
  dest: string,
  label: string,
  options: SyncOptions
) {
  console.log(`   ${label} → ${dest}`);
  
  if (options.dryRun) {
    console.log(`   [DRY RUN] Would sync ${source} to ${dest}`);
    return;
  }
  
  if (!existsSync(source)) {
    console.error(`   ❌ Source not found: ${source}`);
    process.exit(1);
  }
  
  // Remove destination to ensure clean sync
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  
  // Copy with recursive and force options
  cpSync(source, dest, {
    recursive: true,
    force: true,
  });
  
  if (options.verbose) {
    const fileCount = countFiles(dest);
    console.log(`   ✓ Synced ${fileCount} files`);
  }
}

function countFiles(dir: string): number {
  let count = 0;
  
  try {
    const files = Bun.readdir(dir);
  
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = Bun.file(fullPath).stat();
  
      if (stat.isDirectory()) {
        count += countFiles(fullPath);
      } else {
        count++;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return count;
}

function printHelp() {
  console.log(`
Sync Root Assets to Language Wrappers

Internal script for crucible maintainers.

USAGE:
  bun run scripts/sync-to-lang.ts [OPTIONS]

OPTIONS:
  --dry-run    Show what would be synced without making changes
  --verbose    Show detailed sync information
  --help       Show this help

DESCRIPTION:
  Syncs schemas/ and docs/ from repository root to:
    - lang/go/schemas/
    - lang/go/docs/
    - lang/typescript/schemas/
    - lang/typescript/docs/

  This ensures language wrappers have up-to-date copies
  of assets before publishing packages.

WHEN TO RUN:
  - Before bumping VERSION
  - Before publishing packages
  - After updating schemas or docs in root

EXAMPLES:
  # Normal sync
  bun run scripts/sync-to-lang.ts

  # Dry run to preview changes
  bun run scripts/sync-to-lang.ts --dry-run

  # Verbose output
  bun run scripts/sync-to-lang.ts --verbose
`);
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
