#!/usr/bin/env bun

/**
 * Crucible Pull Script - Reference Implementation
 *
 * Synchronizes schemas, docs, and templates from fulmenhq/crucible
 * to a downstream repository.
 *
 * Usage:
 *   bun run crucible-pull.ts
 *   bun run crucible-pull.ts --schemas
 *   bun run crucible-pull.ts --version=2025.10.0
 *   bun run crucible-pull.ts --config=.crucible-sync.json
 *
 * Designed to be copied and adapted for your repository's needs.
 */

import { parseArgs } from "util";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface PullOptions {
  version?: string;
  ref?: string;
  output: string;
  schemas?: boolean | string[];
  docs?: boolean | string[];
  templates?: boolean | string[];
  config?: string;
  force?: boolean;
  dryRun?: boolean;
  gitignore?: boolean;
}

interface SyncConfig {
  version?: string;
  output?: string;
  include?: {
    schemas?: string[];
    docs?: string[];
    templates?: string[];
  };
  exclude?: string[];
  gitignore?: boolean;
}

const DEFAULT_OUTPUT = ".crucible";
const CRUCIBLE_REPO = "https://github.com/fulmenhq/crucible.git";

async function main() {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      version: { type: "string" },
      ref: { type: "string" },
      output: { type: "string" },
      schemas: { type: "string", multiple: true },
      docs: { type: "string", multiple: true },
      templates: { type: "string", multiple: true },
      config: { type: "string" },
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      gitignore: { type: "boolean", default: true },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (args.values.help) {
    printHelp();
    process.exit(0);
  }

  let config: SyncConfig = {};

  if (args.values.config) {
    const configPath = args.values.config;
    if (!existsSync(configPath)) {
      console.error(`❌ Config file not found: ${configPath}`);
      process.exit(1);
    }
    config = JSON.parse(readFileSync(configPath, "utf-8"));
    console.log(`📋 Loaded config from ${configPath}`);
  }

  const options: PullOptions = {
    version: args.values.version || config.version || "latest",
    ref: args.values.ref,
    output: args.values.output || config.output || DEFAULT_OUTPUT,
    schemas: parseInclude(args.values.schemas, config.include?.schemas),
    docs: parseInclude(args.values.docs, config.include?.docs),
    templates: parseInclude(args.values.templates, config.include?.templates),
    force: args.values.force || false,
    dryRun: args.values["dry-run"] || false,
    gitignore: args.values.gitignore ?? config.gitignore ?? true,
  };

  if (
    !options.schemas &&
    !options.docs &&
    !options.templates
  ) {
    options.schemas = true;
    options.docs = true;
    options.templates = true;
  }

  console.log("🔥 Crucible Pull - Reference Implementation");
  console.log(`📦 Version: ${options.version}`);
  console.log(`📁 Output: ${options.output}`);
  console.log(
    `🎯 Include: ${[
      options.schemas && "schemas",
      options.docs && "docs",
      options.templates && "templates",
    ]
      .filter(Boolean)
      .join(", ")}`
  );

  if (options.dryRun) {
    console.log("🔍 Dry run mode - no files will be modified");
  }

  await pullCrucible(options);

  console.log("✅ Crucible pull complete");
}

function parseInclude(
  argValues: string[] | undefined,
  configValues: string[] | undefined
): boolean | string[] {
  if (argValues && argValues.length > 0) {
    return argValues;
  }
  if (configValues && configValues.length > 0) {
    return configValues;
  }
  return false;
}

async function pullCrucible(options: PullOptions) {
  const tmpDir = join("/tmp", `crucible-pull-${Date.now()}`);

  try {
    console.log(`📥 Cloning crucible to ${tmpDir}...`);

    if (!options.dryRun) {
      mkdirSync(tmpDir, { recursive: true });

      let cloneRef = "main";
      if (options.ref) {
        cloneRef = options.ref;
      } else if (options.version && options.version !== "latest") {
        cloneRef = `v${options.version}`;
      }

      execSync(
        `git clone --depth 1 --branch ${cloneRef} ${CRUCIBLE_REPO} ${tmpDir}`,
        { stdio: "inherit" }
      );
    }

    if (options.schemas) {
      await syncDirectory(
        tmpDir,
        options.output,
        "schemas",
        options.schemas,
        options.dryRun
      );
    }

    if (options.docs) {
      await syncDirectory(
        tmpDir,
        options.output,
        "docs",
        options.docs,
        options.dryRun
      );
    }

    if (options.templates) {
      await syncDirectory(
        tmpDir,
        options.output,
        "templates",
        options.templates,
        options.dryRun
      );
    }

    if (options.gitignore && !options.dryRun) {
      ensureGitignore(options.output);
    }

    if (!options.dryRun) {
      const versionFile = join(options.output, ".crucible-version");
      const version = options.version === "latest"
        ? readVersionFromRepo(tmpDir)
        : options.version;
      writeFileSync(versionFile, `${version}\n`);
      console.log(`📝 Wrote version: ${version}`);
    }
  } finally {
    if (!options.dryRun && existsSync(tmpDir)) {
      console.log(`🧹 Cleaning up ${tmpDir}...`);
      execSync(`rm -rf ${tmpDir}`);
    }
  }
}

async function syncDirectory(
  sourceRoot: string,
  outputRoot: string,
  dirName: string,
  include: boolean | string[],
  dryRun: boolean
) {
  const sourcePath = join(sourceRoot, dirName);
  const outputPath = join(outputRoot, dirName);

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️  ${dirName}/ not found in crucible, skipping`);
    return;
  }

  console.log(`📂 Syncing ${dirName}/...`);

  if (dryRun) {
    console.log(`   Would sync to ${outputPath}`);
    return;
  }

  mkdirSync(outputPath, { recursive: true });

  if (Array.isArray(include)) {
    for (const item of include) {
      const itemPath = join(sourcePath, item);
      const itemOutput = join(outputPath, item);
  
      if (!existsSync(itemPath)) {
        console.warn(`   ⚠️  ${item} not found, skipping`);
        continue;
      }

      console.log(`   📄 Copying ${item}...`);
      execSync(`cp -r ${itemPath} ${itemOutput}`);
    }
  } else {
    console.log(`   📄 Copying all ${dirName}...`);
    execSync(`cp -r ${sourcePath}/* ${outputPath}/`);
  }
}

function ensureGitignore(outputPath: string) {
  const gitignorePath = ".gitignore";
  const pattern = `${outputPath}/`;

  let gitignoreContent = "";
  if (existsSync(gitignorePath)) {
    gitignoreContent = readFileSync(gitignorePath, "utf-8");
  }

  if (!gitignoreContent.includes(pattern)) {
    const newContent = gitignoreContent
      ? `${gitignoreContent}\n\n# Crucible synced assets\n${pattern}\n`
      : `# Crucible synced assets\n${pattern}\n`;

    writeFileSync(gitignorePath, newContent);
    console.log(`📝 Added ${pattern} to .gitignore`);
  }
}

function readVersionFromRepo(tmpDir: string): string {
  const versionFile = join(tmpDir, "VERSION");
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, "utf-8").trim();
  }
  return "unknown";
}

function printHelp() {
  console.log(`
Crucible Pull Script - Reference Implementation

Synchronizes schemas, docs, and templates from fulmenhq/crucible.

USAGE:
  bun run crucible-pull.ts [OPTIONS]

OPTIONS:
  --version <version>    Pull specific version (e.g., 2025.10.0)
  --ref <ref>            Pull specific git ref (e.g., main, v2025.10.0)
  --output <path>        Output directory (default: .crucible)
  --schemas [items...]   Pull schemas (all or specific: terminal,pathfinder)
  --docs [items...]      Pull docs (all or specific: standards/coding)
  --templates [items...]  Pull templates (all or specific)
  --config <path>        Load config from JSON file
  --force                Force overwrite existing files
  --dry-run              Show what would be done without making changes
  --no-gitignore         Don't update .gitignore
  --help                 Show this help

EXAMPLES:
  # Pull everything (latest version)
  bun run crucible-pull.ts

  # Pull only schemas
  bun run crucible-pull.ts --schemas

  # Pull specific schemas
  bun run crucible-pull.ts --schemas terminal pathfinder

  # Pull specific version
  bun run crucible-pull.ts --version=2025.10.0

  # Pull from main branch
  bun run crucible-pull.ts --ref=main

  # Use config file
  bun run crucible-pull.ts --config=.crucible-sync.json

  # Dry run
  bun run crucible-pull.ts --dry-run

CONFIG FILE (.crucible-sync.json):
  {
    "version": "2025.10.0",
    "output": ".crucible",
    "include": {
      "schemas": ["terminal", "pathfinder"],
      "docs": ["standards/coding"],
      "templates": []
    },
    "gitignore": true
  }
`);
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
