#!/usr/bin/env bun

/**
 * Role Types Generator
 *
 * Generates a Rust module with a typed Role enum and static RoleMetadata
 * from the agentic role catalog at config/agentic/roles/*.yaml.
 *
 * Usage:
 *   bun run scripts/codegen/generate-role-types.ts
 *   bun run scripts/codegen/generate-role-types.ts --format
 *   bun run scripts/codegen/generate-role-types.ts --out /path/to/output.rs
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";

interface RoleMindset {
  focus?: string[];
  principles?: string[];
}

interface RoleYaml {
  slug: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  status?: string;
  context?: string;
  scope?: string[];
  mindset?: RoleMindset;
  responsibilities?: string[];
  does_not?: string[];
}

interface RoleEntry {
  slug: string;
  variantName: string;
  constName: string;
  name: string;
  description: string;
  version: string;
  status: string;
  author: string | null;
  context: string | null;
  scope: string[];
  responsibilities: string[];
  does_not: string[];
  mindset_focus: string[];
  mindset_principles: string[];
}

// Convert a kebab-case slug to PascalCase: "devlead" → "Devlead", "cxo-tech" → "CxoTech"
function toPascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// Escape a value for embedding in a Rust string literal.
// Returns the full quoted literal including surrounding double-quotes.
function rustStr(s: string | null | undefined): string {
  if (s == null) return '""';
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

// Wrap single-quoted strings in backticks for Rust doc comments
// to silence clippy::doc_link_with_quotes.
function rustDoc(s: string): string {
  return s.replace(/'([^']+)'/g, "`'$1'`");
}

// Load all role YAML files sorted by slug
const rolesDir = resolve("config/agentic/roles");
const roleFiles = readdirSync(rolesDir)
  .filter((f) => f.endsWith(".yaml"))
  .sort();

const roles: RoleEntry[] = roleFiles.map((file) => {
  const raw = loadYaml(readFileSync(resolve(rolesDir, file), "utf-8")) as RoleYaml;
  return {
    slug: raw.slug,
    variantName: toPascalCase(raw.slug),
    constName: raw.slug.toUpperCase().replace(/-/g, "_"),
    name: raw.name ?? "",
    description: (raw.description ?? "").replace(/\n/g, " ").trim(),
    version: raw.version ?? "",
    status: raw.status ?? "",
    author: raw.author ?? null,
    context: raw.context ? raw.context.trim() : null,
    scope: raw.scope ?? [],
    responsibilities: raw.responsibilities ?? [],
    does_not: raw.does_not ?? [],
    mindset_focus: raw.mindset?.focus ?? [],
    mindset_principles: raw.mindset?.principles ?? [],
  };
});

// Resolve output path
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outputPath =
  (outIdx >= 0 ? args[outIdx + 1] : undefined) ?? resolve("lang/rust/src/agentic.rs");
const shouldFormat = args.includes("--format");

// Render template
const ejs = await import("ejs");
const templatePath = resolve("scripts/codegen/role-types/rust/template.ejs");
const templateContent = readFileSync(templatePath, "utf-8");
const rendered = ejs.render(templateContent, { roles, rustStr, rustDoc });

writeFileSync(outputPath, rendered, "utf-8");
console.log(`✓ Wrote ${outputPath}`);

// Optional: run rustfmt
if (shouldFormat) {
  try {
    execSync(`rustfmt "${outputPath}"`, { stdio: "pipe" });
    console.log("✓ Formatted with rustfmt");
  } catch {
    console.warn("Warning: rustfmt not available, skipping formatting");
  }
}

console.log("✓ Role types generated successfully");
