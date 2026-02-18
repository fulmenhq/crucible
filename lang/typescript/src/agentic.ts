import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROLES_DIR = join(__dirname, "../config/agentic/roles");

const ROLE_SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export interface RoleMindset {
  focus: string[];
  principles: string[];
}

export interface RoleEscalation {
  target: string;
  when: string;
}

export interface RoleExample {
  type: string;
  title: string;
  content: string;
}

/** Typed representation of a role definition from the agentic role catalog. */
export interface RolePrompt {
  slug: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  status: string;
  category?: string;
  extends?: string;
  domains?: string[];
  tags?: string[];
  context?: string;
  scope: string[];
  mindset?: RoleMindset;
  responsibilities: string[];
  escalates_to: RoleEscalation[];
  does_not: string[];
  examples?: RoleExample[];
  checklists?: Record<string, string[]>;
}

/**
 * Returns the slugs of all available roles in the embedded catalog.
 * README.md is excluded automatically.
 */
export function listRoleSlugs(): string[] {
  const entries = readdirSync(ROLES_DIR);
  return entries
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();
}

/**
 * Loads and parses a single role by slug.
 * Returns undefined if the role is not found.
 */
export function loadRole(slug: string): RolePrompt | undefined {
  if (!ROLE_SLUG_RE.test(slug)) {
    return undefined;
  }
  try {
    const content = readFileSync(join(ROLES_DIR, `${slug}.yaml`), "utf-8");
    return yaml.load(content) as RolePrompt;
  } catch {
    return undefined;
  }
}

/**
 * Loads all roles from the embedded catalog.
 * Returns a Map keyed by slug.
 */
export function loadRoleCatalog(): Map<string, RolePrompt> {
  const catalog = new Map<string, RolePrompt>();
  for (const slug of listRoleSlugs()) {
    const role = loadRole(slug);
    if (role) {
      catalog.set(role.slug, role);
    }
  }
  return catalog;
}
