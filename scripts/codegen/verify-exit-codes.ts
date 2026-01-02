#!/usr/bin/env bun

/**
 * Exit Codes Verification Script
 *
 * Verifies generated exit code bindings match the catalog and are up-to-date.
 * Regenerates language bindings to a temporary directory, compares with checked-in files,
 * validates compilation, and checks parity against the canonical catalog metadata.
 *
 * Usage:
 *   bun run scripts/codegen/verify-exit-codes.ts
 *   make verify-codegen
 *
 * Exit codes:
 *   0 - All verification passed
 *   1 - Verification failed (drift detected, compilation errors, parity issues)
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";

interface Metadata {
  languages: {
    [key: string]: {
      output_path: string;
      template?: string;
      postprocess?: string;
    };
  };
}

interface CatalogCode {
  code: number;
  name: string;
  description: string;
  context: string;
  retry_hint?: string;
  bsd_equivalent?: string;
  python_note?: string;
}

interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  range: { min: number; max: number };
  codes: CatalogCode[];
}

interface ExitCodeCatalog {
  version: string;
  categories: CatalogCategory[];
}

interface ExpectedEntry {
  code: number;
  name: string;
  category: string;
  description: string;
  context: string;
  retry_hint?: string;
  bsd_equivalent?: string;
  python_note?: string;
}

interface LanguageParityResult {
  language: string;
  display: string;
  errors: string[];
  codeCount: number;
}

const TEMP_DIR = "/tmp/crucible-codegen-verify";
const ROOT = resolve(import.meta.dir, "../..");
const GO_BUILD_CACHE = join(TEMP_DIR, "go-build-cache");
const PYTHON_BYTECODE_CACHE = join(TEMP_DIR, "python-bytecode");

let goOutputPath = "";
let pythonOutputPath = "";
let typescriptOutputPath = "";
let rustOutputPath = "";

async function main(): Promise<number> {
  console.log("🔍 Verifying exit codes code generation...\n");

  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });

  let exitCode = 0;
  let driftDetected = false;

  const metadataPath = resolve(ROOT, "scripts/codegen/exit-codes/metadata.json");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as Metadata;
  const catalogPath = resolve(ROOT, "config/library/foundry/exit-codes.yaml");
  const catalog = loadYaml(readFileSync(catalogPath, "utf8")) as ExitCodeCatalog;
  const expectedEntries = buildExpectedEntryMap(catalog);
  const languageEntries = Object.entries(metadata.languages);

  goOutputPath = resolve(ROOT, metadata.languages["go"]!.output_path);
  pythonOutputPath = resolve(ROOT, metadata.languages["python"]!.output_path);
  typescriptOutputPath = resolve(ROOT, metadata.languages["typescript"]!.output_path);
  if (metadata.languages["rust"]) {
    rustOutputPath = resolve(ROOT, metadata.languages["rust"].output_path);
  }

  try {
    regenerateBindings(languageEntries);

    driftDetected = compareBindings(languageEntries);
    if (driftDetected) {
      exitCode = 1;
    }

    const compilationPassed = runCompilationChecks();
    if (!compilationPassed) {
      exitCode = 1;
    }

    console.log("→ Step 4: Validating parity with catalog...");
    const snapshotPath = resolve(ROOT, "config/library/foundry/exit-codes.snapshot.json");
    const snapshot = existsSync(snapshotPath)
      ? JSON.parse(readFileSync(snapshotPath, "utf8"))
      : null;

    const goContent = readFileSync(goOutputPath, "utf8");
    const pyContent = readFileSync(pythonOutputPath, "utf8");
    const tsContent = readFileSync(typescriptOutputPath, "utf8");
    const rustContent = rustOutputPath ? readFileSync(rustOutputPath, "utf8") : "";

    const parityResults = await validateParity(expectedEntries, catalog.version, {
      go: goContent,
      python: pyContent,
      typescript: tsContent,
      rust: rustContent,
    });

    if (snapshot) {
      const snapshotCount = Object.keys(snapshot.codes || {}).length;
      console.log(`  Snapshot codes: ${snapshotCount}`);
    }
    console.log(`  Catalog codes:  ${expectedEntries.size}`);
    for (const report of parityResults) {
      console.log(`  ${report.display} codes: ${report.codeCount}`);
    }

    let parityPassed = true;
    for (const report of parityResults) {
      if (report.errors.length === 0) {
        console.log(`  ✓ ${report.display}: Parity verified`);
      } else {
        parityPassed = false;
        console.error(`  ❌ ${report.display}:`);
        for (const err of report.errors) {
          console.error(`     - ${err}`);
        }
      }
    }

    if (!parityPassed) {
      exitCode = 1;
    }
    console.log("");
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
    console.log("Exit code bindings are:");
    console.log("  • Up-to-date with catalog");
    console.log("  • Syntactically valid in all languages");
    console.log("  • Parity with canonical snapshot verified");
  } else {
    console.error("❌ Verification failed\n");
    console.error("Remediation:");
    if (driftDetected) {
      console.error(
        "  • Regenerate bindings: bun run scripts/codegen/generate-exit-codes.ts --all --format",
      );
      console.error("  • Review changes: git diff lang/");
      console.error("  • Commit updated bindings: git add lang/ && git commit");
    }
    console.error("  • Check compilation errors above");
    console.error("  • Verify catalog is valid: bun run scripts/validate-schemas.ts");
  }

  return exitCode;
}

function regenerateBindings(
  languageEntries: [string, { output_path: string; template?: string; postprocess?: string }][],
): void {
  console.log("→ Step 1: Regenerating exit codes to temp directory...");

  try {
    for (const [langKey, config] of languageEntries) {
      console.log(`  • ${langKey}: generating temp binding...`);
      const ext =
        extname(config.output_path) ||
        (langKey === "go"
          ? ".go"
          : langKey === "python"
            ? ".py"
            : langKey === "rust"
              ? ".rs"
              : ".ts");
      const tempOutPath = join(TEMP_DIR, `${langKey}${ext}`);
      const tempDir = dirname(tempOutPath);
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      execSync(
        `bun run ${ROOT}/scripts/codegen/generate-exit-codes.ts --lang ${langKey} --out ${tempOutPath} --format`,
        {
          cwd: ROOT,
          stdio: "pipe",
        },
      );
    }
    console.log("  ✓ Code generation complete\n");
  } catch (error) {
    throw new Error(
      `Code generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function compareBindings(
  languageEntries: [string, { output_path: string; template?: string; postprocess?: string }][],
): boolean {
  console.log("→ Step 2: Comparing generated files with checked-in versions...");

  const filesToCompare = languageEntries.map(([key, config]) => {
    const ext =
      extname(config.output_path) ||
      (key === "go"
        ? ".go"
        : key === "python"
          ? ".py"
          : key === "typescript"
            ? ".ts"
            : key === "rust"
              ? ".rs"
              : "");
    const display =
      key === "go"
        ? "Go"
        : key === "python"
          ? "Python"
          : key === "typescript"
            ? "TypeScript"
            : key === "rust"
              ? "Rust"
              : key;
    return {
      key,
      display,
      checkedInPath: resolve(ROOT, config.output_path),
      tempPath: join(TEMP_DIR, `${key}${ext}`),
    };
  });

  let driftDetected = false;

  for (const file of filesToCompare) {
    if (!existsSync(file.checkedInPath)) {
      console.error(`  ❌ ${file.display}: Checked-in file not found`);
      console.error(`     Expected: ${file.checkedInPath}`);
      driftDetected = true;
      continue;
    }

    if (!existsSync(file.tempPath)) {
      console.error(`  ❌ ${file.display}: Temp file not generated`);
      console.error(`     Expected: ${file.tempPath}`);
      driftDetected = true;
      continue;
    }

    const checkedInContent = readFileSync(file.checkedInPath, "utf8");
    const regeneratedContent = readFileSync(file.tempPath, "utf8");

    if (checkedInContent === regeneratedContent) {
      console.log(`  ✓ ${file.display}: Up-to-date`);
    } else {
      console.error(`  ❌ ${file.display}: Drift detected`);
      console.error(`     Checked-in file differs from freshly generated code`);
      console.error(`     Run: bun run scripts/codegen/generate-exit-codes.ts --all --format`);
      driftDetected = true;
    }
  }

  console.log("");
  return driftDetected;
}

function runCompilationChecks(): boolean {
  console.log("→ Step 3: Verifying compilation...");

  let passed = true;

  try {
    mkdirSync(GO_BUILD_CACHE, { recursive: true });
    execSync(`go build ./foundry`, {
      cwd: ROOT,
      stdio: "pipe",
      env: {
        ...process.env,
        GOCACHE: GO_BUILD_CACHE,
      },
    });
    console.log("  ✓ Go compilation valid");
  } catch (error) {
    console.error("  ❌ Go compilation failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  try {
    mkdirSync(PYTHON_BYTECODE_CACHE, { recursive: true });
    const pythonRelPath = relative(join(ROOT, "lang/python"), pythonOutputPath);
    execSync(`cd lang/python && uv run python -m py_compile "${pythonRelPath}"`, {
      cwd: ROOT,
      stdio: "pipe",
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONPYCACHEPREFIX: PYTHON_BYTECODE_CACHE,
      },
    });
    console.log("  ✓ Python syntax valid");
  } catch (error) {
    console.error("  ❌ Python syntax check failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  try {
    execSync(`cd ${ROOT}/lang/typescript && bun x tsc --noEmit src/foundry/exitCodes.ts`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log("  ✓ TypeScript types valid");
  } catch (error) {
    console.error("  ❌ TypeScript type check failed");
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
    passed = false;
  }

  if (rustOutputPath) {
    try {
      // output path is lang/rust/src/foundry/exit_codes.rs
      // dirname is .../lang/rust/src/foundry
      // we need .../lang/rust
      const rustPkgRoot = resolve(dirname(rustOutputPath), "../..");
      execSync(`cargo check`, {
        cwd: rustPkgRoot,
        stdio: "pipe",
      });
      console.log("  ✓ Rust compilation valid");
    } catch (error) {
      console.error("  ❌ Rust compilation failed");
      console.error(`     ${error instanceof Error ? error.message : String(error)}`);
      passed = false;
    }
  }

  console.log("");
  return passed;
}

function buildExpectedEntryMap(catalog: ExitCodeCatalog): Map<number, ExpectedEntry> {
  const map = new Map<number, ExpectedEntry>();

  for (const category of catalog.categories || []) {
    for (const code of category.codes || []) {
      map.set(code.code, {
        code: code.code,
        name: code.name,
        category: category.id,
        description: code.description,
        context: code.context,
        retry_hint: code.retry_hint,
        bsd_equivalent: code.bsd_equivalent,
        python_note: code.python_note,
      });
    }
  }

  return map;
}

async function validateParity(
  expectedEntries: Map<number, ExpectedEntry>,
  version: string,
  contents: { go: string; python: string; typescript: string; rust: string },
): Promise<LanguageParityResult[]> {
  const reports: LanguageParityResult[] = [];

  reports.push({
    language: "go",
    display: "Go",
    ...validateGo(expectedEntries, contents.go, version),
  });

  reports.push({
    language: "python",
    display: "Python",
    ...validatePython(expectedEntries, contents.python, version),
  });

  reports.push({
    language: "typescript",
    display: "TypeScript",
    ...(await validateTypeScript(expectedEntries, contents.typescript, version)),
  });

  if (contents.rust) {
    reports.push({
      language: "rust",
      display: "Rust",
      ...validateRust(expectedEntries, contents.rust, version),
    });
  }

  return reports;
}

function validateRust(
  expectedEntries: Map<number, ExpectedEntry>,
  content: string,
  version: string,
): Omit<LanguageParityResult, "language" | "display"> {
  const errors: string[] = [];

  if (!content.includes(`Version: ${version}`)) {
    errors.push(`Catalog version header missing or incorrect (expected ${version})`);
  }

  const constants = parseRustConstants(content);

  if (constants.size !== expectedEntries.size) {
    errors.push(`Expected ${expectedEntries.size} constants, found ${constants.size}`);
  }

  for (const [code, entry] of expectedEntries.entries()) {
    const constantName = constants.get(code);
    if (!constantName) {
      errors.push(`Missing constant for ${entry.name} (${code})`);
    } else if (constantName !== entry.name) {
      errors.push(
        `Constant mismatch for code ${code}: expected ${entry.name}, found ${constantName}`,
      );
    }
  }

  for (const code of constants.keys()) {
    if (!expectedEntries.has(code)) {
      errors.push(`Unexpected Rust constant for code ${code}`);
    }
  }

  return { errors, codeCount: constants.size };
}

function parseRustConstants(content: string): Map<number, string> {
  // Regex to match "NamePascal = Code," inside enum
  const regex = /^\s*([A-Za-z0-9]+)\s*=\s*(\d+),/gm;
  const map = new Map<number, string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const pascalName = match[1]!;
    const code = Number(match[2]);
    const constName = pascalToConstName(pascalName); // Reusing pascalToConstName from generated utils
    if (!map.has(code)) {
      map.set(code, constName);
    }
  }

  return map;
}

function normalizeForGo(value: string): string {
  return value.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function validateGo(
  expectedEntries: Map<number, ExpectedEntry>,
  content: string,
  version: string,
): Omit<LanguageParityResult, "language" | "display"> {
  const errors: string[] = [];

  if (!content.includes(`Catalog Version: ${version}`)) {
    errors.push(`Catalog version header missing or incorrect (expected ${version})`);
  }

  const constants = parseGoConstants(content);
  const metadata = parseGoMetadata(content);

  if (constants.size !== expectedEntries.size) {
    errors.push(`Expected ${expectedEntries.size} constants, found ${constants.size}`);
  }

  for (const [code, entry] of expectedEntries.entries()) {
    const constantName = constants.get(code);
    if (!constantName) {
      errors.push(`Missing constant for ${entry.name} (${code})`);
    } else if (constantName !== entry.name) {
      errors.push(
        `Constant mismatch for code ${code}: expected ${entry.name}, found ${constantName}`,
      );
    }

    const meta = metadata.get(code);
    if (!meta) {
      errors.push(`Missing metadata for code ${code} (${entry.name})`);
      continue;
    }

    if (meta.name !== entry.name) {
      errors.push(`Metadata name mismatch for code ${code} (${entry.name})`);
    }
    // Go/Rust generator normalizes descriptions and context to single line
    if (meta.description !== normalizeForGo(entry.description)) {
      errors.push(`Metadata description mismatch for code ${code} (${entry.name})`);
    }
    if (meta.context !== normalizeForGo(entry.context)) {
      errors.push(`Metadata context mismatch for code ${code} (${entry.name})`);
    }
    if (meta.category !== entry.category) {
      errors.push(`Metadata category mismatch for code ${code} (${entry.name})`);
    }

    if (!optionalEquals(meta.retry_hint, entry.retry_hint)) {
      errors.push(`Metadata retry_hint mismatch for code ${code} (${entry.name})`);
    }
    if (!optionalEquals(meta.bsd_equivalent, entry.bsd_equivalent)) {
      errors.push(`Metadata bsd_equivalent mismatch for code ${code} (${entry.name})`);
    }
  }

  for (const code of constants.keys()) {
    if (!expectedEntries.has(code)) {
      errors.push(`Unexpected Go constant for code ${code}`);
    }
  }

  return { errors, codeCount: constants.size };
}

function parseGoConstants(content: string): Map<number, string> {
  const regex = /^\s*Exit([A-Za-z0-9]+)\s*=\s*(\d+)/gm;
  const map = new Map<number, string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const pascalName = match[1]!;
    const code = Number(match[2]);
    const constName = pascalToConstName(pascalName);
    if (!map.has(code)) {
      map.set(code, constName);
    }
  }

  return map;
}

function parseGoMetadata(content: string): Map<
  number,
  {
    name: string;
    description: string;
    context: string;
    category: string;
    retry_hint?: string;
    bsd_equivalent?: string;
    python_note?: string;
  }
> {
  const regex = /(\d+):\s*{\s*([\s\S]+?)\s*},/g;
  const map = new Map<
    number,
    {
      name: string;
      description: string;
      context: string;
      category: string;
      retry_hint?: string;
      bsd_equivalent?: string;
      python_note?: string;
    }
  >();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const code = Number(match[1]);
    const body = match[2]!;

    const name = extractGoField(body, "Name")!;
    const description = extractGoField(body, "Description")!;
    const context = extractGoField(body, "Context")!;
    const category = extractGoField(body, "Category")!;
    const retryHint = normalizeOptional(extractGoField(body, "RetryHint", true));
    const bsdEquivalent = normalizeOptional(extractGoField(body, "BSDEquivalent", true));
    const pythonNote = normalizeOptional(extractGoField(body, "PythonNote", true));

    map.set(code, {
      name,
      description,
      context,
      category,
      retry_hint: retryHint,
      bsd_equivalent: bsdEquivalent,
      python_note: pythonNote,
    });
  }

  return map;
}

function extractGoField(body: string, field: string, optional = false): string | undefined {
  const regex = new RegExp(`${field}:\\s+"([^"]*)"`);
  const match = body.match(regex);
  if (!match) {
    if (optional) {
      return undefined;
    }
    throw new Error(`Go metadata missing field ${field}`);
  }

  return decodeGoStringLiteral(match[1]!);
}

function decodeGoStringLiteral(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');
}

function validatePython(
  expectedEntries: Map<number, ExpectedEntry>,
  content: string,
  version: string,
): Omit<LanguageParityResult, "language" | "display"> {
  const errors: string[] = [];

  if (!content.includes(`Catalog Version: ${version}`)) {
    errors.push(`Catalog version header missing or incorrect (expected ${version})`);
  }

  const modulePath = pythonOutputPath;
  const pythonScript = `
import json
import importlib.util
from pathlib import Path

module_path = Path("${modulePath.replace(/\\/g, "\\\\")}")
spec = importlib.util.spec_from_file_location("py_exit_codes", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

codes = {name: int(member.value) for name, member in module.ExitCode.__members__.items()}
metadata = {}
for code, info in module.EXIT_CODE_METADATA.items():
    entry = {
        "name": info["name"],
        "description": info["description"],
        "context": info["context"],
        "category": info["category"],
    }
    if info.get("retry_hint") is not None:
        entry["retry_hint"] = info.get("retry_hint")
    if info.get("bsd_equivalent") is not None:
        entry["bsd_equivalent"] = info.get("bsd_equivalent")
    if info.get("python_note") is not None:
        entry["python_note"] = info.get("python_note")
    metadata[int(code)] = entry

print(json.dumps({"codes": codes, "metadata": metadata}))
`;

  mkdirSync(PYTHON_BYTECODE_CACHE, { recursive: true });
  const result = execSync(`cd lang/python && uv run python - <<'PY'\n${pythonScript}\nPY`, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONPYCACHEPREFIX: PYTHON_BYTECODE_CACHE,
    },
  }).trim();

  const parsed = JSON.parse(result) as {
    codes: Record<string, number>;
    metadata: Record<string, Record<string, unknown>>;
  };

  const codes = new Map<number, string>();
  for (const [name, value] of Object.entries(parsed.codes || {})) {
    codes.set(value, name);
  }

  for (const [code, entry] of expectedEntries.entries()) {
    const name = codes.get(code);
    if (!name) {
      errors.push(`Missing Python enum entry for ${entry.name} (${code})`);
    } else if (name !== entry.name) {
      errors.push(`Python enum mismatch for code ${code}: expected ${entry.name}, found ${name}`);
    }

    const metadataEntry = parsed.metadata[String(code)];
    if (!metadataEntry) {
      errors.push(`Missing Python metadata for code ${code} (${entry.name})`);
      continue;
    }

    if (metadataEntry["name"] !== entry.name) {
      errors.push(`Python metadata name mismatch for code ${code} (${entry.name})`);
    }
    if (metadataEntry["description"] !== entry.description) {
      errors.push(`Python metadata description mismatch for code ${code} (${entry.name})`);
    }
    if (metadataEntry["context"] !== entry.context) {
      errors.push(`Python metadata context mismatch for code ${code} (${entry.name})`);
    }
    if (metadataEntry["category"] !== entry.category) {
      errors.push(`Python metadata category mismatch for code ${code} (${entry.name})`);
    }

    if (
      !optionalEquals(
        normalizeOptional(metadataEntry["retry_hint"]),
        normalizeOptional(entry.retry_hint),
      )
    ) {
      errors.push(`Python metadata retry_hint mismatch for code ${code} (${entry.name})`);
    }

    if (
      !optionalEquals(
        normalizeOptional(metadataEntry["bsd_equivalent"]),
        normalizeOptional(entry.bsd_equivalent),
      )
    ) {
      errors.push(`Python metadata bsd_equivalent mismatch for code ${code} (${entry.name})`);
    }

    if (
      !optionalEquals(
        normalizeOptional(metadataEntry["python_note"]),
        normalizeOptional(entry.python_note),
      )
    ) {
      errors.push(`Python metadata python_note mismatch for code ${code} (${entry.name})`);
    }
  }

  for (const [code, name] of codes.entries()) {
    if (!expectedEntries.has(code)) {
      errors.push(`Unexpected Python enum entry ${name} (${code})`);
    }
  }

  return { errors, codeCount: codes.size };
}

async function validateTypeScript(
  expectedEntries: Map<number, ExpectedEntry>,
  content: string,
  version: string,
): Promise<Omit<LanguageParityResult, "language" | "display">> {
  const errors: string[] = [];

  if (!content.includes(`Catalog Version: ${version}`)) {
    errors.push(`Catalog version header missing or incorrect (expected ${version})`);
  }

  const moduleUrl = pathToFileURL(typescriptOutputPath).href;

  const tsModule = (await import(moduleUrl)) as {
    exitCodes: Record<string, number>;
    exitCodeMetadata: Record<string, any>;
  };

  const codes = new Map<number, string>();
  for (const [name, value] of Object.entries(tsModule.exitCodes || {})) {
    if (codes.has(value)) {
      errors.push(`Duplicate TypeScript constant value ${value} (${name})`);
    }
    codes.set(value, name);
  }

  const metadata = new Map<
    number,
    {
      name: string;
      description: string;
      context: string;
      category: string;
      retry_hint?: string;
      bsd_equivalent?: string;
      python_note?: string;
    }
  >();

  for (const [key, value] of Object.entries(tsModule.exitCodeMetadata || {})) {
    const code = typeof value.code === "number" ? value.code : Number(key);
    metadata.set(code, {
      name: value.name,
      description: value.description,
      context: value.context,
      category: value.category,
      retry_hint: normalizeOptional(value.retryHint ?? value.retry_hint),
      bsd_equivalent: normalizeOptional(value.bsdEquivalent ?? value.bsd_equivalent),
      python_note: normalizeOptional(value.pythonNote ?? value.python_note),
    });
  }

  if (codes.size !== expectedEntries.size) {
    errors.push(`Expected ${expectedEntries.size} constants, found ${codes.size}`);
  }

  for (const [code, entry] of expectedEntries.entries()) {
    const name = codes.get(code);
    if (!name) {
      errors.push(`Missing TypeScript constant for ${entry.name} (${code})`);
    } else if (name !== entry.name) {
      errors.push(
        `TypeScript constant mismatch for code ${code}: expected ${entry.name}, found ${name}`,
      );
    }

    const meta = metadata.get(code);
    if (!meta) {
      errors.push(`Missing TypeScript metadata for code ${code} (${entry.name})`);
      continue;
    }

    if (meta.name !== entry.name) {
      errors.push(`TypeScript metadata name mismatch for code ${code} (${entry.name})`);
    }
    if (meta.description !== entry.description) {
      errors.push(`TypeScript metadata description mismatch for code ${code} (${entry.name})`);
    }
    if (meta.context !== entry.context) {
      errors.push(`TypeScript metadata context mismatch for code ${code} (${entry.name})`);
    }
    if (meta.category !== entry.category) {
      errors.push(`TypeScript metadata category mismatch for code ${code} (${entry.name})`);
    }

    if (!optionalEquals(meta.retry_hint, entry.retry_hint)) {
      errors.push(`TypeScript metadata retry_hint mismatch for code ${code} (${entry.name})`);
    }
    if (!optionalEquals(meta.bsd_equivalent, entry.bsd_equivalent)) {
      errors.push(`TypeScript metadata bsd_equivalent mismatch for code ${code} (${entry.name})`);
    }
    if (!optionalEquals(meta.python_note, entry.python_note)) {
      errors.push(`TypeScript metadata python_note mismatch for code ${code} (${entry.name})`);
    }
  }

  for (const code of codes.keys()) {
    if (!expectedEntries.has(code)) {
      errors.push(`Unexpected TypeScript constant for code ${code}`);
    }
  }

  return { errors, codeCount: codes.size };
}

function pascalToConstName(pascal: string): string {
  const withoutPrefix = pascal.startsWith("Exit") ? pascal.slice(4) : pascal;
  const segments = withoutPrefix
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .split("_")
    .filter(Boolean);
  return `EXIT_${segments.join("_").toUpperCase()}`;
}

function normalizeOptional(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length === 0 ? undefined : text;
}

function optionalEquals(a?: string, b?: string): boolean {
  return normalizeOptional(a) === normalizeOptional(b);
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
