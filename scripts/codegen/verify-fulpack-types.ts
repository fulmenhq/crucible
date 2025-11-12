#!/usr/bin/env bun
/**
 * Fulpack Types Verification Script
 *
 * Verifies generated fulpack type bindings are up-to-date.
 * Regenerates language bindings to a temporary directory, compares with checked-in files,
 * and validates compilation.
 *
 * Usage:
 *   bun run scripts/codegen/verify-fulpack-types.ts
 *   make verify-codegen
 *
 * Exit codes:
 *   0 - All verification passed
 *   1 - Verification failed (drift detected or compilation errors)
 */

import { existsSync, mkdirSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execSync } from "node:child_process";

interface Metadata {
  module: string;
  languages: {
    [key: string]: {
      output_dir: string;
      templates: Record<string, string>;
      postprocess?: string;
    };
  };
}

const TEMP_DIR = "/tmp/crucible-fulpack-verify";
const ROOT = resolve(import.meta.dir, "../..");
const PYTHON_BYTECODE_CACHE = join(TEMP_DIR, "python-bytecode");

async function main(): Promise<number> {
  console.log("🔍 Verifying fulpack types code generation...\n");

  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });

  let exitCode = 0;
  let driftDetected = false;

  const metadataPath = resolve(ROOT, "scripts/codegen/fulpack-types/metadata.json");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as Metadata;

  try {
    // Step 1: Regenerate to temp directory
    regenerateTypes();

    // Step 2: Compare with checked-in versions
    driftDetected = compareFiles(metadata);
    if (driftDetected) {
      exitCode = 1;
    }

    // Step 3: Verify compilation
    const compilationPassed = runCompilationChecks(metadata);
    if (!compilationPassed) {
      exitCode = 1;
    }
  } finally {
    if (existsSync(TEMP_DIR)) {
      try {
        rmSync(TEMP_DIR, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn("⚠️  Warning: Failed to clean temporary directory", cleanupError);
      }
    }
  }

  if (exitCode === 0) {
    console.log("✅ All verification checks passed\n");
    console.log("Fulpack types are:");
    console.log("  • Up-to-date with schemas");
    console.log("  • Syntactically valid");
  } else {
    console.error("❌ Verification failed\n");
    console.error("Remediation:");
    if (driftDetected) {
      console.error(
        "  • Regenerate types: bun run scripts/codegen/generate-fulpack-types.ts --all --format"
      );
      console.error("  • Review changes: git diff lang/python/src/crucible/fulpack/");
      console.error("  • Commit updated types: git add . && git commit");
    }
    console.error("  • Check compilation errors above");
  }

  return exitCode;
}

function regenerateTypes(): void {
  console.log("→ Step 1: Regenerating fulpack types to temp directory...");

  try {
    // Generate Python types
    console.log("  • Python: generating temp types...");
    const tempPythonDir = join(TEMP_DIR, "python");
    mkdirSync(tempPythonDir, { recursive: true });

    execSync(
      `bun run ${ROOT}/scripts/codegen/generate-fulpack-types.ts --lang python --format`,
      {
        cwd: ROOT,
        stdio: "pipe",
        env: {
          ...process.env,
          FULPACK_OUTPUT_OVERRIDE: tempPythonDir,
        },
      }
    );

    // Copy generated Python files to temp directory
    const pythonOutputDir = resolve(ROOT, "lang/python/src/crucible/fulpack");
    if (existsSync(pythonOutputDir)) {
      for (const file of readdirSync(pythonOutputDir)) {
        if (file.endsWith(".py")) {
          execSync(`cp "${join(pythonOutputDir, file)}" "${join(tempPythonDir, file)}"`);
        }
      }
    }

    // Generate TypeScript types
    console.log("  • TypeScript: generating temp types...");
    const tempTypescriptDir = join(TEMP_DIR, "typescript");
    mkdirSync(tempTypescriptDir, { recursive: true });

    execSync(
      `bun run ${ROOT}/scripts/codegen/generate-fulpack-types.ts --lang typescript --format`,
      {
        cwd: ROOT,
        stdio: "pipe",
      }
    );

    // Copy generated TypeScript files to temp directory
    const typescriptOutputDir = resolve(ROOT, "lang/typescript/src/fulpack");
    if (existsSync(typescriptOutputDir)) {
      for (const file of readdirSync(typescriptOutputDir)) {
        if (file.endsWith(".ts")) {
          execSync(`cp "${join(typescriptOutputDir, file)}" "${join(tempTypescriptDir, file)}"`);
        }
      }
    }

    // Generate Go types
    console.log("  • Go: generating temp types...");
    const tempGoDir = join(TEMP_DIR, "go");
    mkdirSync(tempGoDir, { recursive: true });

    execSync(
      `bun run ${ROOT}/scripts/codegen/generate-fulpack-types.ts --lang go --format`,
      {
        cwd: ROOT,
        stdio: "pipe",
      }
    );

    // Copy generated Go files to temp directory
    const goOutputDir = resolve(ROOT, "fulpack");
    if (existsSync(goOutputDir)) {
      for (const file of readdirSync(goOutputDir)) {
        if (file.endsWith(".go")) {
          execSync(`cp "${join(goOutputDir, file)}" "${join(tempGoDir, file)}"`);
        }
      }
    }

    console.log("  ✓ Code generation complete\n");
  } catch (error) {
    throw new Error(
      `Code generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function compareFiles(metadata: Metadata): boolean {
  console.log("→ Step 2: Comparing generated files with checked-in versions...");

  let driftDetected = false;

  // Check Python files
  const pythonConfig = metadata.languages["python"];
  if (pythonConfig) {
    const outputDir = resolve(ROOT, pythonConfig.output_dir);
    const tempDir = join(TEMP_DIR, "python");

    if (!existsSync(outputDir)) {
      console.error("  ❌ Python output directory not found");
      console.error(`     Expected: ${outputDir}`);
      driftDetected = true;
    } else {
      const pythonFiles = ["__init__.py", "enums.py", "types.py", "options.py"];

      for (const file of pythonFiles) {
        const checkedInPath = join(outputDir, file);
        const tempPath = join(tempDir, file);

        if (!existsSync(checkedInPath)) {
          console.error(`  ❌ Python ${file}: Checked-in file not found`);
          driftDetected = true;
          continue;
        }

        if (!existsSync(tempPath)) {
          console.error(`  ❌ Python ${file}: Temp file not generated`);
          driftDetected = true;
          continue;
        }

        const checkedInContent = readFileSync(checkedInPath, "utf8");
        const regeneratedContent = readFileSync(tempPath, "utf8");

        if (checkedInContent === regeneratedContent) {
          console.log(`  ✓ Python ${file}: Up-to-date`);
        } else {
          console.error(`  ❌ Python ${file}: Drift detected`);
          console.error(`     Checked-in file differs from freshly generated code`);
          driftDetected = true;
        }
      }
    }
  }

  // Check TypeScript files
  const typescriptConfig = metadata.languages["typescript"];
  if (typescriptConfig) {
    const outputDir = resolve(ROOT, typescriptConfig.output_dir);
    const tempDir = join(TEMP_DIR, "typescript");

    if (!existsSync(outputDir)) {
      console.error("  ❌ TypeScript output directory not found");
      console.error(`     Expected: ${outputDir}`);
      driftDetected = true;
    } else {
      const typescriptFiles = ["types.ts", "index.ts"];

      for (const file of typescriptFiles) {
        const checkedInPath = join(outputDir, file);
        const tempPath = join(tempDir, file);

        if (!existsSync(checkedInPath)) {
          console.error(`  ❌ TypeScript ${file}: Checked-in file not found`);
          driftDetected = true;
          continue;
        }

        if (!existsSync(tempPath)) {
          console.error(`  ❌ TypeScript ${file}: Temp file not generated`);
          driftDetected = true;
          continue;
        }

        const checkedInContent = readFileSync(checkedInPath, "utf8");
        const regeneratedContent = readFileSync(tempPath, "utf8");

        if (checkedInContent === regeneratedContent) {
          console.log(`  ✓ TypeScript ${file}: Up-to-date`);
        } else {
          console.error(`  ❌ TypeScript ${file}: Drift detected`);
          console.error(`     Checked-in file differs from freshly generated code`);
          driftDetected = true;
        }
      }
    }
  }

  // Check Go files
  const goConfig = metadata.languages["go"];
  if (goConfig) {
    const outputDir = resolve(ROOT, goConfig.output_dir);
    const tempDir = join(TEMP_DIR, "go");

    if (!existsSync(outputDir)) {
      console.error("  ❌ Go output directory not found");
      console.error(`     Expected: ${outputDir}`);
      driftDetected = true;
    } else {
      const goFiles = ["types.go"];

      for (const file of goFiles) {
        const checkedInPath = join(outputDir, file);
        const tempPath = join(tempDir, file);

        if (!existsSync(checkedInPath)) {
          console.error(`  ❌ Go ${file}: Checked-in file not found`);
          driftDetected = true;
          continue;
        }

        if (!existsSync(tempPath)) {
          console.error(`  ❌ Go ${file}: Temp file not generated`);
          driftDetected = true;
          continue;
        }

        const checkedInContent = readFileSync(checkedInPath, "utf8");
        const regeneratedContent = readFileSync(tempPath, "utf8");

        if (checkedInContent === regeneratedContent) {
          console.log(`  ✓ Go ${file}: Up-to-date`);
        } else {
          console.error(`  ❌ Go ${file}: Drift detected`);
          console.error(`     Checked-in file differs from freshly generated code`);
          driftDetected = true;
        }
      }
    }
  }

  console.log("");
  return driftDetected;
}

function runCompilationChecks(metadata: Metadata): boolean {
  console.log("→ Step 3: Verifying compilation...");

  let passed = true;

  // Python syntax check
  try {
    mkdirSync(PYTHON_BYTECODE_CACHE, { recursive: true });
    const pythonConfig = metadata.languages["python"];
    if (!pythonConfig) {
      throw new Error("Python configuration not found");
    }

    const outputDir = resolve(ROOT, pythonConfig.output_dir);
    const pythonFiles = readdirSync(outputDir).filter((f) => f.endsWith(".py"));

    for (const file of pythonFiles) {
      const filePath = join(outputDir, file);
      const relPath = relative(join(ROOT, "lang/python"), filePath);
      execSync(`cd lang/python && uv run python -m py_compile "${relPath}"`, {
        cwd: ROOT,
        stdio: "pipe",
        env: {
          ...process.env,
          PYTHONDONTWRITEBYTECODE: "1",
          PYTHONPYCACHEPREFIX: PYTHON_BYTECODE_CACHE,
        },
      });
    }
    console.log("  ✓ Python syntax valid");
  } catch (error) {
    console.error("  ❌ Python syntax check failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  // Python imports check
  try {
    execSync(
      `cd lang/python && uv run python -c "from crucible.fulpack import *; print('Imports OK')"`,
      {
        cwd: ROOT,
        stdio: "pipe",
      }
    );
    console.log("  ✓ Python imports valid");
  } catch (error) {
    console.error("  ❌ Python imports failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  // TypeScript type check
  try {
    const typescriptConfig = metadata.languages["typescript"];
    if (!typescriptConfig) {
      throw new Error("TypeScript configuration not found");
    }

    const outputDir = resolve(ROOT, typescriptConfig.output_dir);
    execSync(`bunx tsc --noEmit ${join(outputDir, "types.ts")} ${join(outputDir, "index.ts")}`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log("  ✓ TypeScript syntax valid");
  } catch (error) {
    console.error("  ❌ TypeScript type check failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  // Go compilation check
  try {
    const goConfig = metadata.languages["go"];
    if (!goConfig) {
      throw new Error("Go configuration not found");
    }

    execSync("go build ./fulpack", {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log("  ✓ Go compilation valid");
  } catch (error) {
    console.error("  ❌ Go compilation failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  console.log("");
  return passed;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error("❌ Verification failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
