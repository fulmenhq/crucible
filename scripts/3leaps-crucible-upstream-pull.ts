#!/usr/bin/env bun

/**
 * 3leaps Crucible Upstream Pull
 *
 * Syncs vendored content from 3leaps/crucible to fulmenhq/crucible.
 * Assumes repos are cloned as siblings (3leaps/ and fulmenhq/ in same parent).
 *
 * Usage:
 *   bun run scripts/3leaps-crucible-upstream-pull.ts
 *   bun run scripts/3leaps-crucible-upstream-pull.ts --dry-run
 *   bun run scripts/3leaps-crucible-upstream-pull.ts --source=/path/to/3leaps/crucible
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

// =============================================================================
// SYNC CONFIGURATION - Edit these constants to change what gets synced
// =============================================================================

/**
 * Paths to sync from 3leaps/crucible.
 * Format: { source: "path/in/source", dest: "subdir/in/destination" }
 *
 * Destination is relative to UPSTREAM_DEST (schemas/upstream/3leaps-crucible/)
 * so "schemas/classifiers" becomes "schemas/upstream/3leaps-crucible/schemas/classifiers"
 */
const SYNC_PATHS = [
  // Schemas - classifiers framework
  { source: "schemas/classifiers", dest: "schemas/classifiers" },
  // Schemas - foundation types
  { source: "schemas/foundation", dest: "schemas/foundation" },
  // Schemas - ailink (prompt/response)
  { source: "schemas/ailink", dest: "schemas/ailink" },
  // Schemas - agentic role prompts
  { source: "schemas/agentic", dest: "schemas/agentic" },

  // Config - classifier dimensions
  { source: "config/classifiers", dest: "config/classifiers" },

  // Docs - classifier standards
  {
    source: "docs/standards/data-sensitivity-classification.md",
    dest: "docs/standards/data-sensitivity-classification.md",
  },
  {
    source: "docs/standards/volatility-classification.md",
    dest: "docs/standards/volatility-classification.md",
  },
  {
    source: "docs/standards/access-tier-classification.md",
    dest: "docs/standards/access-tier-classification.md",
  },
  {
    source: "docs/standards/retention-lifecycle-classification.md",
    dest: "docs/standards/retention-lifecycle-classification.md",
  },
  {
    source: "docs/standards/schema-stability-classification.md",
    dest: "docs/standards/schema-stability-classification.md",
  },
  {
    source: "docs/standards/volume-tier-classification.md",
    dest: "docs/standards/volume-tier-classification.md",
  },
  {
    source: "docs/standards/velocity-mode-classification.md",
    dest: "docs/standards/velocity-mode-classification.md",
  },
  {
    source: "docs/standards/classifiers-framework.md",
    dest: "docs/standards/classifiers-framework.md",
  },

  // Docs - classifier catalog
  { source: "docs/catalog/classifiers", dest: "docs/catalog/classifiers" },
];

/**
 * Explicitly excluded paths (even if parent is synced).
 * These are synced manually or not needed in fulmenhq.
 */
const EXCLUDE_PATHS = [
  // Role definitions are managed locally (not synced from upstream)
  "config/agentic",
  "docs/catalog/roles",
];

// =============================================================================
// SCRIPT CONSTANTS
// =============================================================================

const DEFAULT_SOURCE = "../../3leaps/crucible";
const UPSTREAM_ORG = "3leaps";
const UPSTREAM_REPO = "crucible";
const UPSTREAM_DEST = `schemas/upstream/${UPSTREAM_ORG}/${UPSTREAM_REPO}`;

// =============================================================================
// MAIN LOGIC
// =============================================================================

interface Options {
  source: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseOptions(): Options {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", default: false, short: "h" },
      "dry-run": { type: "boolean", default: false, short: "n" },
      verbose: { type: "boolean", default: false, short: "v" },
      source: { type: "string", default: DEFAULT_SOURCE, short: "s" },
    },
    allowPositionals: false,
  });

  return {
    source: args.values.source as string,
    dryRun: args.values["dry-run"] as boolean,
    verbose: args.values.verbose as boolean,
    help: args.values.help as boolean,
  };
}

function printHelp(): void {
  console.log(`
3leaps Crucible Upstream Pull

Syncs vendored content from 3leaps/crucible to fulmenhq/crucible.

USAGE:
  bun run scripts/3leaps-crucible-upstream-pull.ts [OPTIONS]

OPTIONS:
  -h, --help       Show this help
  -n, --dry-run    Preview changes without writing
  -v, --verbose    Show detailed output
  -s, --source     Path to 3leaps/crucible (default: ${DEFAULT_SOURCE})

EXAMPLES:
  # Standard sync (repos as siblings)
  bun run scripts/3leaps-crucible-upstream-pull.ts

  # Preview changes
  bun run scripts/3leaps-crucible-upstream-pull.ts --dry-run

  # Custom source path
  bun run scripts/3leaps-crucible-upstream-pull.ts --source=/path/to/3leaps/crucible

 OUTPUT:
   schemas/upstream/3leaps/crucible/
   ├── schemas/
   │   ├── classifiers/v0/
   │   ├── foundation/v0/
   │   ├── ailink/v0/
   │   └── agentic/v0/
   ├── config/
   │   └── classifiers/dimensions/
   ├── docs/
   │   ├── standards/
   │   └── catalog/classifiers/
   └── PROVENANCE.md

EXCLUDED (manual sync):
   - config/agentic/ (role definitions)
`);
}

function getGitInfo(repoPath: string): { commit: string; tag: string | null; date: string } {
  const commit = execSync("git rev-parse HEAD", { cwd: repoPath, encoding: "utf-8" }).trim();
  const date =
    execSync("git log -1 --format=%ci", { cwd: repoPath, encoding: "utf-8" })
      .trim()
      .split(" ")[0] ?? "";

  let tag: string | null = null;
  try {
    tag = execSync("git describe --tags --exact-match 2>/dev/null", {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim();
  } catch {
    // Not on a tag
  }

  return { commit, tag, date };
}

function isExcluded(path: string): boolean {
  return EXCLUDE_PATHS.some((excluded) => path.startsWith(excluded) || path === excluded);
}

function copyPath(source: string, dest: string, dryRun: boolean, verbose: boolean): number {
  if (!existsSync(source)) {
    console.error(`  ⚠️  Source not found: ${source}`);
    return 0;
  }

  const stat = statSync(source);
  let count = 0;

  if (stat.isDirectory()) {
    if (!dryRun) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(source);
    for (const entry of entries) {
      const srcPath = join(source, entry);
      const destPath = join(dest, entry);
      count += copyPath(srcPath, destPath, dryRun, verbose);
    }
  } else {
    if (verbose) {
      console.log(`  ${dryRun ? "[DRY] " : ""}${source} → ${dest}`);
    }
    if (!dryRun) {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(source, dest);
    }
    count = 1;
  }

  return count;
}

function generateProvenance(
  gitInfo: { commit: string; tag: string | null; date: string },
  fileCount: number,
): string {
  const tagLine = gitInfo.tag ? gitInfo.tag : "(untagged)";

  return `# Provenance: 3leaps/crucible

**DO NOT EDIT THESE FILES.** They are vendored copies from upstream.

## Source

| Field      | Value                                      |
| ---------- | ------------------------------------------ |
| Repository | https://github.com/3leaps/crucible         |
| Tag        | ${tagLine.padEnd(40)} |
| Commit     | ${gitInfo.commit} |
| Date       | ${gitInfo.date.padEnd(40)} |
| Synced By  | devlead (Claude Opus 4.5 via Claude Code)  |

## Structure

\`\`\`
schemas/upstream/3leaps/crucible/
 ├── schemas/
 │   ├── classifiers/v0/   # Dimension meta-schemas
 │   ├── foundation/v0/    # Type primitives, error response
 │   ├── ailink/v0/        # Prompt/response schemas
 │   └── agentic/v0/       # Role prompt schemas
 ├── config/
 │   └── classifiers/      # Dimension definitions
 ├── docs/
 │   ├── standards/        # Classification standards
 │   └── catalog/          # Classifier catalog
 └── PROVENANCE.md
\`\`\`

## Files Synced

${fileCount} files from 3leaps/crucible

## Canonical URLs

These schemas are canonically hosted at:

- \`https://schemas.3leaps.dev/classifiers/v0/*.json\`
- \`https://schemas.3leaps.dev/foundation/v0/*.json\`
- \`https://schemas.3leaps.dev/ailink/v0/*.json\`
- \`https://schemas.3leaps.dev/agentic/v0/*.json\`

## Excluded (Manual Sync)

The following are NOT synced by this script:

- \`config/agentic/\` - Role definitions

These are synced manually as they require review for fulmenhq-specific customization.

## Refresh

To refresh from upstream:

\`\`\`bash
bun run scripts/3leaps-crucible-upstream-pull.ts
\`\`\`

Or with dry-run to preview:

\`\`\`bash
bun run scripts/3leaps-crucible-upstream-pull.ts --dry-run
\`\`\`
`;
}

async function main(): Promise<void> {
  const opts = parseOptions();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const scriptDir = dirname(Bun.main);
  const repoRoot = resolve(scriptDir, "..");
  const sourcePath = resolve(repoRoot, opts.source);
  const destPath = resolve(repoRoot, UPSTREAM_DEST);

  console.log("3leaps Crucible Upstream Pull");
  console.log("─".repeat(40));

  // Validate source
  if (!existsSync(sourcePath)) {
    console.error(`❌ Source repo not found: ${sourcePath}`);
    console.error(`   Expected 3leaps/crucible at: ${opts.source}`);
    process.exit(1);
  }

  // Get git info from source
  const gitInfo = getGitInfo(sourcePath);
  console.log(`Source:  ${sourcePath}`);
  console.log(`Tag:     ${gitInfo.tag || "(untagged)"}`);
  console.log(`Commit:  ${gitInfo.commit.substring(0, 12)}`);
  console.log(`Dest:    ${destPath}`);
  console.log("");

  if (opts.dryRun) {
    console.log("🔍 DRY RUN - no files will be modified\n");
  }

  // Clean destination (except PROVENANCE.md which we'll regenerate)
  if (!opts.dryRun && existsSync(destPath)) {
    console.log("Cleaning existing vendored content...");
    for (const subdir of ["schemas", "config", "docs"]) {
      const subdirPath = join(destPath, subdir);
      if (existsSync(subdirPath)) {
        rmSync(subdirPath, { recursive: true });
      }
    }
  }

  // Sync each path
  let totalFiles = 0;
  console.log("Syncing paths:");

  for (const syncPath of SYNC_PATHS) {
    if (isExcluded(syncPath.source)) {
      console.log(`  ⏭️  Skipped (excluded): ${syncPath.source}`);
      continue;
    }

    const src = join(sourcePath, syncPath.source);
    const dst = join(destPath, syncPath.dest);

    if (!existsSync(src)) {
      console.log(`  ⚠️  Not found: ${syncPath.source}`);
      continue;
    }

    const count = copyPath(src, dst, opts.dryRun, opts.verbose);
    totalFiles += count;
    console.log(`  ✅ ${syncPath.source} (${count} files)`);
  }

  // Generate PROVENANCE.md
  const provenancePath = join(destPath, "PROVENANCE.md");
  const provenanceContent = generateProvenance(gitInfo, totalFiles);

  if (!opts.dryRun) {
    mkdirSync(destPath, { recursive: true });
    await Bun.write(provenancePath, provenanceContent);
  }
  console.log(`  ✅ PROVENANCE.md`);

  console.log("");
  console.log(`${opts.dryRun ? "[DRY RUN] Would sync" : "Synced"} ${totalFiles} files`);

  if (!opts.dryRun) {
    console.log("");
    console.log("✅ Upstream sync complete");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Review changes: git diff schemas/upstream/");
    console.log("  2. Run validation: make upstream-validate");
    console.log(`  3. Commit: git add ${UPSTREAM_DEST}/`);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
