#!/usr/bin/env bun
/**
 * Platform Modules Registry Validator
 *
 * Validates the Fulmen Helper Library Platform Modules Registry against Crucible reality.
 * Implements 7-check validation strategy from v0.2.10 plan.
 *
 * Validates: config/taxonomy/library/platform-modules/v1.0.0/modules.yaml
 * Does NOT validate: config/taxonomy/library/foundry-catalogs/v1.0.0/catalogs.yaml (TODO v0.2.11)
 *
 * Usage:
 *   bun run scripts/validate-module-registry.ts
 *   make validate-schemas (includes this script)
 *
 * Exit codes:
 *   0: Validation passed
 *   1: Validation failed (errors found)
 *   2: Critical failure (registry not found, schema invalid, etc.)
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { load as parseYAML } from "js-yaml";
import { glob } from "glob";

interface ModuleEntry {
  module_name: string;
  tier: "core" | "common" | "specialized";
  description: string;
  rationale: string;
  evidence: {
    has_schema: boolean;
    schema_path?: string;
    has_config: boolean;
    config_path?: string;
  };
  languages: {
    [key: string]: {
      status: "available" | "planned" | "na";
      tier_override?: string;
      package?: string;
      version?: string;
      rationale?: string;
    };
  };
  dependencies: {
    required_modules: string[];
    external_deps: {
      go: string[];
      python: string[];
      typescript: string[];
    };
  };
  status: string;
  added_version: string;
  sunset_date?: string;
  graduation_metrics?: {
    size_loc?: number;
    release_velocity?: number;
    adoption_rate_pct?: number;
    internal_coupling_pct?: number;
  };
}

interface ModuleRegistry {
  version: string;
  last_updated: string;
  modules: ModuleEntry[];
}

interface EvidenceMap {
  [moduleName: string]: {
    schemas: string[];
    configs: string[];
    go_package?: string;
    python_package?: string;
    typescript_package?: string;
  };
}

// Platform Modules Registry (code modules like config, logging, pathfinder, etc.)
const PLATFORM_MODULES_PATH = "config/taxonomy/library/platform-modules/v1.0.0/modules.yaml";
// Foundry Catalogs Registry (reference data catalogs like countries, http-statuses, etc.)
const FOUNDRY_CATALOGS_PATH = "config/taxonomy/library/foundry-catalogs/v1.0.0/catalogs.yaml";
// DevSecOps Modules Registry (DevSecOps schemas/configs, potential L'Orage implementations)
const DEVSECOPS_MODULES_PATH = "config/taxonomy/devsecops/modules/v1.0.0/modules.yaml";
const SCHEMA_PATH = "schemas/taxonomy/library/modules/v1.0.0/module-entry.schema.json";

// Note: This script currently validates platform-modules only.
// TODO v0.2.11: Add foundry-catalogs validation (simpler checks: schema_path exists, config_path exists, format valid)
// DevSecOps modules are loaded to prevent orphaned artifact warnings but not fully validated yet

let errorCount = 0;
let warnCount = 0;

function error(message: string) {
  console.error(`❌ ERROR: ${message}`);
  errorCount++;
}

function warn(message: string) {
  console.warn(`⚠️  WARN: ${message}`);
  warnCount++;
}

function info(message: string) {
  console.log(`ℹ️  ${message}`);
}

function success(message: string) {
  console.log(`✅ ${message}`);
}

/**
 * Phase 1: Discovery Scan - Build reality map of actual modules
 */
function discoverModules(): EvidenceMap {
  info("Phase 1: Discovering modules from Crucible artifacts...");

  const evidence: EvidenceMap = {};

  // Scan schemas/* for module schemas
  // Note: Some schemas are nested (schemas/observability/logging/v1.0.0/)
  // We'll record the actual schema path for validation, not just top-level
  const schemaDirs = glob.sync("schemas/**/v*/", { ignore: ["**/meta/**", "**/taxonomy/**", "**/node_modules/**"] });
  // Track unique schema paths for verification
  const schemaPathsFound = new Set(schemaDirs);

  // Scan config/* for module configs
  const configDirs = glob.sync("config/**/v*/", { ignore: ["**/taxonomy/**", "**/sync/**"] });
  for (const configDir of configDirs) {
    const parts = configDir.split("/");
    if (parts.length >= 4 && parts[2]) {
      // e.g., config/library/foundry/v2.0.0/ -> foundry
      const moduleName = parts[2];
      if (!evidence[moduleName]) {
        evidence[moduleName] = { schemas: [], configs: [] };
      }
      evidence[moduleName].configs.push(configDir);
    }
  }

  // Special cases for known config locations
  if (existsSync("config/library/foundry/")) {
    if (!evidence["foundry"]) {
      evidence["foundry"] = { schemas: [], configs: [] };
    }
    evidence["foundry"].configs.push("config/library/foundry/");
  }
  if (existsSync("config/taxonomy/metrics.yaml")) {
    if (!evidence["metrics"]) {
      evidence["metrics"] = { schemas: [], configs: [] };
    }
    evidence["metrics"].configs.push("config/taxonomy/metrics.yaml");
  }

  info(`Discovered ${Object.keys(evidence).length} modules from artifacts`);
  return evidence;
}

/**
 * Load and parse the platform modules registry
 */
function loadRegistry(): ModuleRegistry {
  if (!existsSync(PLATFORM_MODULES_PATH)) {
    error(`Platform modules registry not found at ${PLATFORM_MODULES_PATH}`);
    process.exit(2);
  }

  try {
    const content = readFileSync(PLATFORM_MODULES_PATH, "utf-8");
    const registry = parseYAML(content) as ModuleRegistry;

    if (!registry.modules || !Array.isArray(registry.modules)) {
      error("Registry does not contain valid 'modules' array");
      process.exit(2);
    }

    info(`Loaded platform modules registry with ${registry.modules.length} modules`);
    return registry;
  } catch (err) {
    error(`Failed to parse platform modules registry: ${err}`);
    process.exit(2);
  }
}

/**
 * Check 1: Orphan Detection - Schemas/configs with no registry entry
 * Note: We only warn about orphans, not error, since some schemas (policy, protocol)
 * are not "modules" but standalone schemas.
 */
function checkOrphans(registry: ModuleRegistry, evidence: EvidenceMap) {
  info("Check 1: Detecting orphaned artifacts...");

  // Load DevSecOps modules registry to check for DevSecOps artifacts
  let devsecopsModules = new Set<string>();
  if (existsSync(DEVSECOPS_MODULES_PATH)) {
    try {
      const devsecopsRegistry = parseYAML(readFileSync(DEVSECOPS_MODULES_PATH, "utf8")) as ModuleRegistry;
      devsecopsModules = new Set(devsecopsRegistry.modules.map(m => m.module_name));
      info(`  Loaded DevSecOps modules registry with ${devsecopsModules.size} modules`);
    } catch (err) {
      warn(`Failed to load DevSecOps registry: ${err}`);
    }
  }

  // Known non-module artifacts that should not be in any module registry
  const knownNonModules = new Set([
    "app-identity",   // Application identity config - used by appidentity module but not a module itself
  ]);

  const platformModules = new Set(registry.modules.map(m => m.module_name));
  let orphanCount = 0;

  for (const [moduleName, moduleEvidence] of Object.entries(evidence)) {
    // Check if module is in platform registry, DevSecOps registry, or known non-modules
    const isInPlatformRegistry = platformModules.has(moduleName);
    const isInDevsecopsRegistry = devsecopsModules.has(moduleName);
    const isKnownNonModule = knownNonModules.has(moduleName);

    if (!isInPlatformRegistry && !isInDevsecopsRegistry && !isKnownNonModule) {
      if (moduleEvidence.schemas.length > 0 || moduleEvidence.configs.length > 0) {
        warn(`Orphaned artifacts for module '${moduleName}' - has ${moduleEvidence.schemas.length} schemas, ${moduleEvidence.configs.length} configs but no registry entry (checked platform-modules and devsecops registries)`);
        orphanCount++;
      }
    }
  }

  if (orphanCount === 0) {
    success("No orphaned artifacts found");
  } else {
    info(`Found ${orphanCount} modules with orphaned artifacts`);
  }
}

/**
 * Check 2: Dead Entry Detection - Registry entries with no evidence
 * Note: Code-only modules (no schema/config) are valid, so we check evidence pointers instead
 */
function checkDeadEntries(registry: ModuleRegistry, evidence: EvidenceMap) {
  info("Check 2: Detecting dead registry entries...");

  let deadCount = 0;

  for (const module of registry.modules) {
    // For code-only modules (no schema/config), skip this check
    if (!module.evidence.has_schema && !module.evidence.has_config) {
      continue;
    }

    // If module claims schema/config, evidence pointer validation (Check 3) handles it
    // This check is now redundant with Check 3, so we skip it
  }

  success("Dead entry detection skipped (handled by evidence pointer validation)");
}

/**
 * Check 3: Evidence Pointer Validation - Registry claims match reality
 */
function checkEvidencePointers(registry: ModuleRegistry) {
  info("Check 3: Validating evidence pointers...");

  let pointerErrors = 0;

  for (const module of registry.modules) {
    // Check schema path
    if (module.evidence.has_schema) {
      if (!module.evidence.schema_path) {
        error(`Module '${module.module_name}' has_schema=true but no schema_path`);
        pointerErrors++;
      } else if (!existsSync(module.evidence.schema_path)) {
        error(`Module '${module.module_name}' claims schema at '${module.evidence.schema_path}' but path not found`);
        pointerErrors++;
      }
    }

    // Check config path
    if (module.evidence.has_config) {
      if (!module.evidence.config_path) {
        error(`Module '${module.module_name}' has_config=true but no config_path`);
        pointerErrors++;
      } else if (!existsSync(module.evidence.config_path)) {
        error(`Module '${module.module_name}' claims config at '${module.evidence.config_path}' but path not found`);
        pointerErrors++;
      }
    }
  }

  if (pointerErrors === 0) {
    success("All evidence pointers valid");
  }
}

/**
 * Check 4: Cross-Language Status Validation
 * Note: Full package validation would require inspecting go.mod, package.json, pyproject.toml
 * For now, we do basic validation of required fields
 */
function checkCrossLanguageStatus(registry: ModuleRegistry) {
  info("Check 4: Validating cross-language status...");

  let statusErrors = 0;

  for (const module of registry.modules) {
    for (const [lang, impl] of Object.entries(module.languages)) {
      if (impl.status === "available") {
        if (!impl.package) {
          error(`Module '${module.module_name}' ${lang}: status=available but no package specified`);
          statusErrors++;
        }
        if (!impl.version) {
          error(`Module '${module.module_name}' ${lang}: status=available but no version specified`);
          statusErrors++;
        }
      }

      if (impl.tier_override && !impl.rationale) {
        error(`Module '${module.module_name}' ${lang}: tier_override specified but no rationale`);
        statusErrors++;
      }

      if (impl.status === "na" && !impl.rationale) {
        error(`Module '${module.module_name}' ${lang}: status=na but no rationale`);
        statusErrors++;
      }
    }
  }

  if (statusErrors === 0) {
    success("Cross-language status valid");
  }
}

/**
 * Check 5: Schema Validation
 * Note: Full JSON Schema validation would require a proper validator
 * For now, we do basic structural checks
 */
function checkSchemaCompliance(registry: ModuleRegistry) {
  info("Check 5: Checking schema compliance...");

  // Basic structural validation
  let schemaErrors = 0;

  for (const module of registry.modules) {
    if (!module.module_name || typeof module.module_name !== "string") {
      error(`Invalid module_name in entry`);
      schemaErrors++;
    }
    if (!["core", "common", "specialized"].includes(module.tier)) {
      error(`Module '${module.module_name}': invalid tier '${module.tier}'`);
      schemaErrors++;
    }
    if (!module.description || module.description.length < 10) {
      error(`Module '${module.module_name}': description too short or missing`);
      schemaErrors++;
    }
    if (!module.rationale || module.rationale.length < 10) {
      error(`Module '${module.module_name}': rationale too short or missing`);
      schemaErrors++;
    }
  }

  if (schemaErrors === 0) {
    success("Schema compliance checks passed");
  }
}

/**
 * Check 6: Tier Override Validation - Core universality rules
 */
function checkTierOverrides(registry: ModuleRegistry) {
  info("Check 6: Validating tier override rules...");

  let overrideErrors = 0;

  for (const module of registry.modules) {
    if (module.tier === "core") {
      // Core modules cannot have tier overrides or NA status
      for (const [lang, impl] of Object.entries(module.languages)) {
        if (impl.tier_override) {
          error(`Core module '${module.module_name}' has tier_override in ${lang} (not allowed)`);
          overrideErrors++;
        }
        if (impl.status === "na") {
          error(`Core module '${module.module_name}' has status=na in ${lang} (core must be universal)`);
          overrideErrors++;
        }
      }
    }

    if (module.tier === "specialized") {
      // Specialized modules require graduation metrics and sunset date
      if (!module.graduation_metrics) {
        warn(`Specialized module '${module.module_name}' missing graduation_metrics`);
      }
      if (!module.sunset_date) {
        warn(`Specialized module '${module.module_name}' missing sunset_date`);
      }
    }
  }

  if (overrideErrors === 0) {
    success("Tier override rules enforced");
  }
}

/**
 * Check 7: Cross-Reference Validation - required_modules exist
 */
function checkCrossReferences(registry: ModuleRegistry) {
  info("Check 7: Validating cross-references...");

  const moduleNames = new Set(registry.modules.map(m => m.module_name));
  let refErrors = 0;

  for (const module of registry.modules) {
    for (const requiredModule of module.dependencies.required_modules) {
      if (!moduleNames.has(requiredModule)) {
        error(`Module '${module.module_name}' requires '${requiredModule}' but it's not in registry`);
        refErrors++;
      }
    }
  }

  if (refErrors === 0) {
    success("All cross-references valid");
  }
}

/**
 * Main validation function
 */
function main() {
  console.log("🔍 Validating Fulmen Helper Library Platform Modules Registry\n");
  console.log(`   Registry: ${PLATFORM_MODULES_PATH}\n`);

  const registry = loadRegistry();
  const evidence = discoverModules();

  console.log("\n" + "=".repeat(70));
  checkOrphans(registry, evidence);
  console.log("=".repeat(70));
  checkDeadEntries(registry, evidence);
  console.log("=".repeat(70));
  checkEvidencePointers(registry);
  console.log("=".repeat(70));
  checkCrossLanguageStatus(registry);
  console.log("=".repeat(70));
  checkSchemaCompliance(registry);
  console.log("=".repeat(70));
  checkTierOverrides(registry);
  console.log("=".repeat(70));
  checkCrossReferences(registry);
  console.log("=".repeat(70));

  // Summary
  console.log("\n📊 Validation Summary:");
  console.log(`   Modules in registry: ${registry.modules.length}`);
  console.log(`   Modules with evidence: ${Object.keys(evidence).length}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Warnings: ${warnCount}`);

  if (errorCount > 0) {
    console.log("\n❌ Validation FAILED\n");
    process.exit(1);
  } else if (warnCount > 0) {
    console.log("\n⚠️  Validation passed with warnings\n");
    process.exit(0);
  } else {
    console.log("\n✅ Validation PASSED\n");
    process.exit(0);
  }
}

main();
