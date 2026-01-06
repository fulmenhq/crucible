import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const LANGUAGE_KEYS = new Set(["go", "python", "typescript", "rust", "csharp"]);
const LANGUAGE_STATUS = new Set(["active", "planned", "deprecated"]);
const CATEGORY_KEYS = new Set([
  "cli",
  "codex",
  "library",
  "microtool",
  "missive",
  "pipeline",
  "sdk",
  "service",
  "spec-host",
  "workhorse",
]);
const MODULE_IDS = new Set([
  "config-path-api",
  "three-layer-config",
  "schema-validation",
  "crucible-shim",
  "fuldx-bootstrap",
  "ssot-sync",
  "observability-logging",
  "foundry-patterns",
  "foundry",
  "error-handling-propagation",
  "docscribe",
  "cloud-storage",
  "pathfinder",
  "ascii-helpers",
  "telemetry-metrics",
  "fulhash",
]);
const CORE_MODULES = new Set([
  "config-path-api",
  "three-layer-config",
  "schema-validation",
  "crucible-shim",
  "fuldx-bootstrap",
  "ssot-sync",
  "observability-logging",
  "foundry-patterns",
  "foundry",
  "error-handling-propagation",
  "docscribe",
  "fulhash",
]);

type JSONObject = Record<string, unknown>;

async function loadFile(filePath: string) {
  const abs = path.resolve(repoRoot, filePath);
  const text = await readFile(abs, "utf8");
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return YAML.load(text);
  }
  return JSON.parse(text);
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message);
  }
  return value;
}

function validateLanguages(registry: any): void {
  assert(
    registry && Array.isArray(registry.languages),
    "languages.yaml must contain a languages array",
  );

  const seenKeys = new Set<string>();
  for (const entry of registry.languages as JSONObject[]) {
    assert(typeof entry === "object" && entry !== null, "language entry must be object");
    const { key, name, libraryName, status, minimumRuntime } = entry as any;
    assert(typeof key === "string" && LANGUAGE_KEYS.has(key), `invalid language key: ${key}`);
    assert(!seenKeys.has(key), `duplicate language key: ${key}`);
    seenKeys.add(key);
    assert(typeof name === "string" && name.length > 0, `language ${key} missing name`);
    assert(
      typeof libraryName === "string" && libraryName.length > 0,
      `language ${key} missing libraryName`,
    );
    assert(
      typeof status === "string" && LANGUAGE_STATUS.has(status),
      `language ${key} invalid status`,
    );
    if (minimumRuntime !== undefined) {
      assert(
        typeof minimumRuntime === "string" && minimumRuntime.length > 0,
        `language ${key} invalid minimumRuntime`,
      );
    }
  }
}

function validateCategories(registry: any): void {
  assert(
    registry && Array.isArray(registry.categories),
    "repository-categories.yaml must contain a categories array",
  );

  const seenKeys = new Set<string>();
  for (const entry of registry.categories as JSONObject[]) {
    assert(typeof entry === "object" && entry !== null, "category entry must be object");
    const { key, summary, primaryEntryPoints, typicalConsumers } = entry as any;
    assert(typeof key === "string" && CATEGORY_KEYS.has(key), `invalid category key: ${key}`);
    assert(!seenKeys.has(key), `duplicate category key: ${key}`);
    seenKeys.add(key);
    assert(typeof summary === "string" && summary.length > 0, `category ${key} missing summary`);
    assert(Array.isArray(primaryEntryPoints), `category ${key} primaryEntryPoints must be array`);
    assert(Array.isArray(typicalConsumers), `category ${key} typicalConsumers must be array`);
  }
}

function validateModuleManifest(manifest: any): void {
  assert(manifest && typeof manifest === "object", "module manifest must be object");
  const manifestRecord = manifest as JSONObject;
  const modules = manifestRecord["modules"];
  assert(Array.isArray(modules) && modules.length > 0, "module manifest requires modules array");

  const seen = new Set<string>();
  for (const moduleEntry of modules as JSONObject[]) {
    assert(moduleEntry && typeof moduleEntry === "object", "module entry must be object");
    const entryRecord = moduleEntry as JSONObject;
    const id = expectString(entryRecord["id"], "module entry missing id");
    const tier = expectString(entryRecord["tier"], `module ${id} missing tier`);
    const requirement = expectString(
      entryRecord["requirement"],
      `module ${id} missing requirement`,
    );
    assert(MODULE_IDS.has(id), `invalid module id: ${id}`);
    assert(!seen.has(id), `duplicate module id: ${id}`);
    seen.add(id);
    if (CORE_MODULES.has(id)) {
      assert(tier === "core", `core module ${id} must use tier "core"`);
      assert(
        requirement === "mandatory" || requirement === "recommended",
        `core module ${id} must be mandatory or recommended`,
      );
    } else {
      assert(tier === "extension", `extension module ${id} must use tier "extension"`);
    }

    const coverage = entryRecord["coverage"];
    if (coverage !== undefined) {
      assert(Array.isArray(coverage), `module ${id} coverage must be array`);
      for (const coverageEntry of coverage as JSONObject[]) {
        assert(
          coverageEntry && typeof coverageEntry === "object",
          `module ${id} coverage entry must be object`,
        );
        const coverageRecord = coverageEntry as JSONObject;
        const language = expectString(
          coverageRecord["language"],
          `module ${id} coverage missing language`,
        );
        const target = coverageRecord["target"];
        assert(LANGUAGE_KEYS.has(language), `module ${id} invalid coverage language`);
        assert(
          typeof target === "number" && Number.isInteger(target) && target >= 0 && target <= 100,
          `module ${id} invalid coverage target for ${language}`,
        );
      }
    }
  }

  const overrides = manifestRecord["languageOverrides"];
  if (overrides !== undefined) {
    assert(Array.isArray(overrides), "languageOverrides must be array");
    for (const overrideEntry of overrides as JSONObject[]) {
      assert(overrideEntry && typeof overrideEntry === "object", "override must be object");
      const overrideRecord = overrideEntry as JSONObject;
      const language = expectString(
        overrideRecord["language"],
        "override must specify valid language",
      );
      assert(LANGUAGE_KEYS.has(language), "override must specify valid language");

      const unsupported = overrideRecord["unsupported"];
      if (unsupported !== undefined) {
        assert(Array.isArray(unsupported), `override for ${language} unsupported must be array`);
        for (const moduleId of unsupported as unknown[]) {
          const moduleIdStr = expectString(
            moduleId,
            `override ${language} invalid unsupported module`,
          );
          assert(MODULE_IDS.has(moduleIdStr), `override ${language} invalid unsupported module`);
        }
      }

      const planned = overrideRecord["planned"];
      if (planned !== undefined) {
        assert(Array.isArray(planned), `override for ${language} planned must be array`);
        for (const moduleId of planned as unknown[]) {
          const moduleIdStr = expectString(moduleId, `override ${language} invalid planned module`);
          assert(MODULE_IDS.has(moduleIdStr), `override ${language} invalid planned module`);
        }
      }
    }
  }
}

function validateFoundryPatterns(catalog: any): void {
  assert(catalog && typeof catalog === "object", "foundry patterns must be object");
  const record = catalog as JSONObject;
  const version = expectString(record["version"], "foundry catalog missing version");
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), "foundry catalog version must be SemVer/CalVer");

  const patterns = record["patterns"];
  assert(
    Array.isArray(patterns) && patterns.length > 0,
    "foundry patterns array must be non-empty",
  );
  const ids = new Set<string>();
  const allowedKinds = new Set(["regex", "glob", "literal"]);

  for (const entry of patterns as JSONObject[]) {
    assert(entry && typeof entry === "object", "pattern entry must be object");
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord["id"], "pattern entry missing id");
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid pattern id: ${id}`);
    assert(!ids.has(id), `duplicate pattern id: ${id}`);
    ids.add(id);

    expectString(entryRecord["name"], `pattern ${id} missing name`);
    const kind = expectString(entryRecord["kind"], `pattern ${id} missing kind`);
    assert(allowedKinds.has(kind), `pattern ${id} invalid kind: ${kind}`);
    expectString(entryRecord["pattern"], `pattern ${id} missing pattern string`);

    const flags = entryRecord["flags"];
    if (flags !== undefined) {
      assert(
        typeof flags === "object" && !Array.isArray(flags),
        `pattern ${id} flags must be object`,
      );
    }
  }
}

function validateHttpStatusGroups(catalog: any): void {
  assert(catalog && typeof catalog === "object", "http status catalog must be object");
  const record = catalog as JSONObject;
  const version = expectString(record["version"], "http status catalog missing version");
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), "http status catalog version must be SemVer/CalVer");

  const groups = record["groups"];
  assert(Array.isArray(groups) && groups.length > 0, "http status groups must be non-empty array");
  const ids = new Set<string>();

  for (const entry of groups as JSONObject[]) {
    assert(entry && typeof entry === "object", "http status group must be object");
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord["id"], "http status group missing id");
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid http status group id: ${id}`);
    assert(!ids.has(id), `duplicate http status group id: ${id}`);
    ids.add(id);

    expectString(entryRecord["name"], `http status group ${id} missing name`);
    const codes = entryRecord["codes"];
    assert(Array.isArray(codes) && codes.length > 0, `http status group ${id} missing codes array`);
    const seenCodes = new Set<number>();
    for (const codeEntry of codes as JSONObject[]) {
      assert(
        codeEntry && typeof codeEntry === "object",
        `http status group ${id} code entry must be object`,
      );
      const entryObj = codeEntry as JSONObject;
      const valueRaw = entryObj["value"];
      assert(
        typeof valueRaw === "number" && Number.isInteger(valueRaw),
        `http status group ${id} code must be integer`,
      );
      const value = valueRaw as number;
      const reason = expectString(
        entryObj["reason"],
        `http status group ${id} code ${value} missing reason`,
      );
      assert(value >= 100 && value <= 599, `http status group ${id} code ${value} out of range`);
      assert(!seenCodes.has(value), `http status group ${id} duplicate code ${value}`);
      seenCodes.add(value);
      const extraDesc = entryObj["description"];
      if (extraDesc !== undefined) {
        expectString(extraDesc, `http status group ${id} code ${value} description must be string`);
      }
      assert(reason.length > 0, `http status group ${id} code ${value} reason must be non-empty`);
    }
  }
}

function validateCountryCodes(catalog: any): void {
  assert(catalog && typeof catalog === "object", "country code catalog must be object");
  const record = catalog as JSONObject;
  const version = expectString(record["version"], "country code catalog missing version");
  assert(
    /^[vV]?\d+\.\d+\.\d+$/.test(version),
    "country code catalog version must be SemVer/CalVer",
  );

  const countries = record["countries"];
  assert(
    Array.isArray(countries) && countries.length > 0,
    "country code list must be non-empty array",
  );
  const seenAlpha2 = new Set<string>();
  const seenAlpha3 = new Set<string>();

  for (const entry of countries as JSONObject[]) {
    assert(entry && typeof entry === "object", "country entry must be object");
    const entryRecord = entry as JSONObject;
    const alpha2 = expectString(entryRecord["alpha2"], "country entry missing alpha2");
    const alpha3 = expectString(entryRecord["alpha3"], "country entry missing alpha3");
    const numeric = expectString(entryRecord["numeric"], "country entry missing numeric code");
    expectString(entryRecord["name"], "country entry missing name");

    assert(/^[A-Z]{2}$/.test(alpha2), `invalid alpha2 code: ${alpha2}`);
    assert(/^[A-Z]{3}$/.test(alpha3), `invalid alpha3 code: ${alpha3}`);
    assert(/^[0-9]{3}$/.test(numeric), `invalid numeric code: ${numeric}`);
    assert(!seenAlpha2.has(alpha2), `duplicate alpha2 code: ${alpha2}`);
    assert(!seenAlpha3.has(alpha3), `duplicate alpha3 code: ${alpha3}`);
    seenAlpha2.add(alpha2);
    seenAlpha3.add(alpha3);
  }
}

function validateMimeTypes(catalog: any): void {
  assert(catalog && typeof catalog === "object", "mime type catalog must be object");
  const record = catalog as JSONObject;
  const version = expectString(record["version"], "mime type catalog missing version");
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), "mime type catalog version must be SemVer/CalVer");

  const types = record["types"];
  assert(Array.isArray(types) && types.length > 0, "mime type list must be non-empty array");
  const seenIds = new Set<string>();
  const seenMimes = new Set<string>();

  for (const entry of types as JSONObject[]) {
    assert(entry && typeof entry === "object", "mime type entry must be object");
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord["id"], "mime type entry missing id");
    const mime = expectString(entryRecord["mime"], `mime type ${id} missing mime`);
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid mime type id: ${id}`);
    assert(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mime), `invalid mime value: ${mime}`);
    assert(!seenIds.has(id), `duplicate mime type id: ${id}`);
    assert(!seenMimes.has(mime), `duplicate mime value: ${mime}`);
    seenIds.add(id);
    seenMimes.add(mime);

    const extensions = entryRecord["extensions"];
    if (extensions !== undefined) {
      assert(Array.isArray(extensions), `mime type ${id} extensions must be array`);
      const seenExt = new Set<string>();
      for (const ext of extensions as unknown[]) {
        const extStr = expectString(ext, `mime type ${id} extension must be string`);
        assert(/^[a-z0-9]+$/.test(extStr), `mime type ${id} invalid extension: ${extStr}`);
        assert(!seenExt.has(extStr), `mime type ${id} duplicate extension: ${extStr}`);
        seenExt.add(extStr);
      }
    }
  }
}

function validateLogEventSchema(schema: unknown): void {
  assert(schema && typeof schema === "object", "log-event schema must be object");
  const schemaRecord = schema as JSONObject;
  const propsUnknown = schemaRecord["properties"];
  assert(
    propsUnknown && typeof propsUnknown === "object" && !Array.isArray(propsUnknown),
    "log-event schema missing properties",
  );
  const props = propsUnknown as JSONObject;

  const requiredProps = [
    "contextId",
    "requestId",
    "correlationId",
    "operation",
    "durationMs",
    "userId",
  ];
  for (const prop of requiredProps) {
    assert(prop in props, `log-event schema missing ${prop} property`);
  }
  assert("parentSpanId" in props, "log-event schema missing parentSpanId property");

  const examplesUnknown = schemaRecord["examples"];
  assert(
    Array.isArray(examplesUnknown) && examplesUnknown.length > 0,
    "log-event schema must include examples",
  );
}

async function validateHttpExamples(): Promise<void> {
  const successExample = await loadFile(
    "examples/protocol/http/v1.0.0/success-response.example.json",
  );
  assert(successExample && typeof successExample === "object", "success example missing");
  assert(
    (successExample as JSONObject)["success"] === true,
    "success example must set success=true",
  );

  const errorExample = await loadFile("examples/protocol/http/v1.0.0/error-response.example.json");
  assert(errorExample && typeof errorExample === "object", "error example missing");
  assert((errorExample as JSONObject)["success"] === false, "error example must set success=false");

  const healthExample = await loadFile(
    "examples/protocol/http/v1.0.0/health-response.example.json",
  );
  assert(healthExample && typeof healthExample === "object", "health example missing");
  assert(
    typeof (healthExample as JSONObject)["status"] === "string",
    "health example must include status field",
  );

  const versionExample = await loadFile(
    "examples/protocol/http/v1.0.0/version-response.example.json",
  );
  assert(versionExample && typeof versionExample === "object", "version example missing");
  assert(
    (versionExample as JSONObject)["success"] === true,
    "version example must set success=true",
  );
}

async function validateSimilarityFixtures(): Promise<void> {
  const { execSync } = await import("node:child_process");
  const goneatBin = process.env["GONEAT"] ?? "goneat";
  const schemaPath = "schemas/library/similarity/v2.0.0/similarity.schema.json";
  const dataPath = "config/library/similarity/fixtures.yaml";

  try {
    execSync(`${goneatBin} validate data --schema-file ${schemaPath} --data ${dataPath}`, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error: any) {
    throw new Error(`Similarity fixtures validation failed: ${error.message}`);
  }
}

function validateAppIdentityExample(example: any): void {
  assert(example && typeof example === "object", "app-identity example must be object");
  const record = example as JSONObject;

  // Validate app section (required)
  const app = record["app"];
  assert(app && typeof app === "object", "app-identity example missing app section");
  const appRecord = app as JSONObject;

  const binaryName = expectString(
    appRecord["binary_name"],
    "app-identity example missing app.binary_name",
  );
  assert(
    /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/.test(binaryName),
    `invalid binary_name format: ${binaryName}`,
  );

  const vendor = expectString(appRecord["vendor"], "app-identity example missing app.vendor");
  assert(/^[a-z][a-z0-9]{0,62}[a-z0-9]$/.test(vendor), `invalid vendor format: ${vendor}`);

  const envPrefix = expectString(
    appRecord["env_prefix"],
    "app-identity example missing app.env_prefix",
  );
  assert(
    /^[A-Z][A-Z0-9_]*_$/.test(envPrefix),
    `invalid env_prefix format (must end with underscore): ${envPrefix}`,
  );

  const configName = expectString(
    appRecord["config_name"],
    "app-identity example missing app.config_name",
  );
  assert(
    /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/.test(configName),
    `invalid config_name format: ${configName}`,
  );

  const description = expectString(
    appRecord["description"],
    "app-identity example missing app.description",
  );
  assert(
    description.length >= 10 && description.length <= 200,
    "app.description must be 10-200 characters",
  );

  // Validate metadata section (optional)
  const metadata = record["metadata"];
  if (metadata !== undefined) {
    assert(metadata && typeof metadata === "object", "app-identity metadata must be object");
    const metadataRecord = metadata as JSONObject;

    // Validate optional fields if present
    if (metadataRecord["project_url"] !== undefined) {
      const url = expectString(
        metadataRecord["project_url"],
        "metadata.project_url must be string",
      );
      assert(
        url.startsWith("http://") || url.startsWith("https://"),
        "metadata.project_url must be valid URI",
      );
    }

    if (metadataRecord["support_email"] !== undefined) {
      const email = expectString(
        metadataRecord["support_email"],
        "metadata.support_email must be string",
      );
      assert(/@/.test(email), "metadata.support_email must be valid email format");
    }

    if (metadataRecord["repository_category"] !== undefined) {
      const category = expectString(
        metadataRecord["repository_category"],
        "metadata.repository_category must be string",
      );
      assert(CATEGORY_KEYS.has(category), `invalid repository_category: ${category}`);
    }

    if (metadataRecord["telemetry_namespace"] !== undefined) {
      const telemetryNs = expectString(
        metadataRecord["telemetry_namespace"],
        "metadata.telemetry_namespace must be string",
      );
      assert(
        /^[a-z][a-z0-9_]{0,62}[a-z0-9]$/.test(telemetryNs),
        `invalid telemetry_namespace format: ${telemetryNs}`,
      );
    }

    // Validate Python metadata if present
    const python = metadataRecord["python"];
    if (python !== undefined) {
      assert(python && typeof python === "object", "metadata.python must be object");
      const pythonRecord = python as JSONObject;

      if (pythonRecord["distribution_name"] !== undefined) {
        const distName = expectString(
          pythonRecord["distribution_name"],
          "python.distribution_name must be string",
        );
        assert(
          /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/.test(distName),
          `invalid python.distribution_name format: ${distName}`,
        );
      }

      if (pythonRecord["package_name"] !== undefined) {
        const pkgName = expectString(
          pythonRecord["package_name"],
          "python.package_name must be string",
        );
        assert(
          /^[a-z][a-z0-9_]{0,62}[a-z0-9]$/.test(pkgName),
          `invalid python.package_name format: ${pkgName}`,
        );
      }

      if (pythonRecord["console_scripts"] !== undefined) {
        const scripts = pythonRecord["console_scripts"];
        assert(Array.isArray(scripts), "python.console_scripts must be array");
        for (const script of scripts as JSONObject[]) {
          assert(script && typeof script === "object", "console_script entry must be object");
          const scriptRecord = script as JSONObject;
          expectString(scriptRecord["name"], "console_script missing name");
          expectString(scriptRecord["entry_point"], "console_script missing entry_point");
        }
      }
    }
  }
}

function validateExitCodes(catalog: any): void {
  assert(catalog && typeof catalog === "object", "exit codes catalog must be object");
  const record = catalog as JSONObject;
  const version = expectString(record["version"], "exit codes catalog missing version");
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), "exit codes catalog version must be SemVer/CalVer");

  const categories = record["categories"];
  assert(
    Array.isArray(categories) && categories.length > 0,
    "exit codes categories must be non-empty array",
  );

  const seenCategoryIds = new Set<string>();
  const allCodes = new Set<number>();
  const codeToCategory = new Map<number, string>();

  // Validate each category
  for (const entry of categories as JSONObject[]) {
    assert(entry && typeof entry === "object", "exit code category must be object");
    const entryRecord = entry as JSONObject;

    const id = expectString(entryRecord["id"], "exit code category missing id");
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid exit code category id: ${id}`);
    assert(!seenCategoryIds.has(id), `duplicate exit code category id: ${id}`);
    seenCategoryIds.add(id);

    expectString(entryRecord["name"], `exit code category ${id} missing name`);
    expectString(entryRecord["description"], `exit code category ${id} missing description`);

    // Validate range
    const range = entryRecord["range"];
    assert(range && typeof range === "object", `exit code category ${id} missing range`);
    const rangeRecord = range as JSONObject;
    const minValRaw = rangeRecord["min"];
    const maxValRaw = rangeRecord["max"];
    assert(
      typeof minValRaw === "number" && Number.isInteger(minValRaw),
      `exit code category ${id} range.min must be integer`,
    );
    assert(
      typeof maxValRaw === "number" && Number.isInteger(maxValRaw),
      `exit code category ${id} range.max must be integer`,
    );
    const minVal = minValRaw as number;
    const maxVal = maxValRaw as number;
    assert(
      minVal >= 0 && minVal <= 255,
      `exit code category ${id} range.min out of bounds: ${minVal}`,
    );
    assert(
      maxVal >= 0 && maxVal <= 255,
      `exit code category ${id} range.max out of bounds: ${maxVal}`,
    );
    assert(minVal <= maxVal, `exit code category ${id} range.min > range.max`);

    // Validate codes in category
    const codes = entryRecord["codes"];
    assert(
      Array.isArray(codes) && codes.length > 0,
      `exit code category ${id} missing codes array`,
    );

    for (const codeEntry of codes as JSONObject[]) {
      assert(
        codeEntry && typeof codeEntry === "object",
        `exit code category ${id} code entry must be object`,
      );
      const codeRecord = codeEntry as JSONObject;

      const codeVal = codeRecord["code"];
      assert(
        typeof codeVal === "number" && Number.isInteger(codeVal),
        `exit code category ${id} code must be integer`,
      );
      const code = codeVal as number;
      assert(code >= 0 && code <= 255, `exit code category ${id} code ${code} out of range`);

      const name = expectString(
        codeRecord["name"],
        `exit code category ${id} code ${code} missing name`,
      );
      assert(
        /^EXIT_[A-Z0-9_]+$/.test(name),
        `exit code category ${id} code ${code} invalid name format: ${name}`,
      );

      expectString(
        codeRecord["description"],
        `exit code category ${id} code ${code} missing description`,
      );

      // Check for duplicate codes across all categories
      if (allCodes.has(code)) {
        const prevCategory = codeToCategory.get(code);
        throw new Error(
          `duplicate exit code ${code} in category ${id} (previously defined in ${prevCategory})`,
        );
      }
      allCodes.add(code);
      codeToCategory.set(code, id);

      // Validate optional fields
      const retryHint = codeRecord["retry_hint"];
      if (retryHint !== undefined) {
        assert(typeof retryHint === "string", `exit code ${code} retry_hint must be string`);
        assert(
          ["retry", "no_retry", "investigate"].includes(retryHint as string),
          `exit code ${code} invalid retry_hint: ${retryHint}`,
        );
      }

      // Validate range compliance (code within category range) with special case for EX_USAGE
      if (code !== 64 || id !== "usage") {
        // Code 64 is allowed to break range for BSD compatibility
        if (code < minVal || code > maxVal) {
          throw new Error(
            `exit code ${code} (${name}) in category ${id} outside declared range [${minVal}-${maxVal}]`,
          );
        }
      }
    }
  }

  // Validate signal codes follow 128+N pattern
  const signalCategory = (categories as JSONObject[]).find((c: any) => c.id === "signals");
  if (signalCategory) {
    const signalCodes = (signalCategory as any).codes as JSONObject[];
    for (const codeEntry of signalCodes) {
      const code = (codeEntry as any).code as number;
      assert(code >= 128 && code <= 165, `signal exit code ${code} must be in range 128-165`);
    }
  }

  // Validate simplified modes
  const simplifiedModes = record["simplified_modes"];
  if (simplifiedModes !== undefined) {
    assert(Array.isArray(simplifiedModes), "simplified_modes must be array");
    const seenModeIds = new Set<string>();

    for (const mode of simplifiedModes as JSONObject[]) {
      assert(mode && typeof mode === "object", "simplified mode must be object");
      const modeRecord = mode as JSONObject;

      const modeId = expectString(modeRecord["id"], "simplified mode missing id");
      assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(modeId), `invalid simplified mode id: ${modeId}`);
      assert(!seenModeIds.has(modeId), `duplicate simplified mode id: ${modeId}`);
      seenModeIds.add(modeId);

      expectString(modeRecord["name"], `simplified mode ${modeId} missing name`);

      const mappings = modeRecord["mappings"];
      assert(
        Array.isArray(mappings) && mappings.length > 0,
        `simplified mode ${modeId} missing mappings array`,
      );

      const seenSimplifiedCodes = new Set<number>();
      for (const mapping of mappings as JSONObject[]) {
        assert(
          mapping && typeof mapping === "object",
          `simplified mode ${modeId} mapping must be object`,
        );
        const mappingRecord = mapping as JSONObject;

        const simplifiedCode = mappingRecord["simplified_code"];
        assert(
          typeof simplifiedCode === "number" && Number.isInteger(simplifiedCode),
          `simplified mode ${modeId} simplified_code must be integer`,
        );
        assert(
          !seenSimplifiedCodes.has(simplifiedCode as number),
          `simplified mode ${modeId} duplicate simplified_code: ${simplifiedCode}`,
        );
        seenSimplifiedCodes.add(simplifiedCode as number);

        expectString(
          mappingRecord["simplified_name"],
          `simplified mode ${modeId} code ${simplifiedCode} missing simplified_name`,
        );

        const mapsFrom = mappingRecord["maps_from"];
        assert(
          Array.isArray(mapsFrom) && mapsFrom.length > 0,
          `simplified mode ${modeId} code ${simplifiedCode} missing maps_from array`,
        );

        // Verify all mapped codes exist in catalog
        for (const sourceCode of mapsFrom as unknown[]) {
          assert(
            typeof sourceCode === "number" && Number.isInteger(sourceCode),
            `simplified mode ${modeId} maps_from must contain integers`,
          );
          if (!allCodes.has(sourceCode as number)) {
            throw new Error(
              `simplified mode ${modeId} maps code ${sourceCode} which is not defined in catalog`,
            );
          }
        }
      }
    }
  }

  // Validate BSD compatibility mappings (if present)
  const bsdCompat = record["bsd_compatibility"];
  if (bsdCompat !== undefined) {
    assert(bsdCompat && typeof bsdCompat === "object", "bsd_compatibility must be object");
    const bsdRecord = bsdCompat as JSONObject;

    const mappings = bsdRecord["mappings"];
    if (mappings !== undefined) {
      assert(Array.isArray(mappings), "bsd_compatibility.mappings must be array");
      for (const mapping of mappings as JSONObject[]) {
        assert(mapping && typeof mapping === "object", "bsd mapping must be object");
        const mappingRecord = mapping as JSONObject;

        const bsdCode = mappingRecord["bsd_code"];
        const fulmenCode = mappingRecord["fulmen_code"];
        assert(
          typeof bsdCode === "number" && Number.isInteger(bsdCode),
          "bsd_code must be integer",
        );
        assert(
          typeof fulmenCode === "number" && Number.isInteger(fulmenCode),
          "fulmen_code must be integer",
        );

        // Verify fulmen_code exists in catalog
        if (!allCodes.has(fulmenCode as number)) {
          throw new Error(`BSD mapping references undefined fulmen_code: ${fulmenCode}`);
        }

        expectString(mappingRecord["bsd_name"], `BSD code ${bsdCode} missing bsd_name`);
        expectString(mappingRecord["fulmen_name"], `BSD code ${bsdCode} missing fulmen_name`);
        expectString(mappingRecord["category"], `BSD code ${bsdCode} missing category`);
      }
    }
  }
}

function validateSignalCatalog(catalog: any, exitCodes: any): void {
  assert(catalog && typeof catalog === "object", "signal catalog must be object");
  const record = catalog as JSONObject;

  const version = expectString(record["version"], "signal catalog missing version");
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), "signal catalog version must be SemVer");

  expectString(record["description"], "signal catalog missing description");

  // Validate signals array
  const signals = record["signals"];
  assert(Array.isArray(signals) && signals.length > 0, "signals must be non-empty array");

  const requiredSignals = ["term", "int", "hup", "quit", "pipe", "alrm", "usr1", "usr2"];
  const seenSignalIds = new Set<string>();
  const signalExitCodes = new Map<string, number>();

  for (const entry of signals as JSONObject[]) {
    assert(entry && typeof entry === "object", "signal entry must be object");
    const entryRecord = entry as JSONObject;

    const id = expectString(entryRecord["id"], "signal missing id");
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(id), `invalid signal id: ${id}`);
    assert(!seenSignalIds.has(id), `duplicate signal id: ${id}`);
    seenSignalIds.add(id);

    const name = expectString(entryRecord["name"], `signal ${id} missing name`);
    assert(/^SIG[A-Z0-9]+$/.test(name), `signal ${id} invalid name format: ${name}`);

    const unixNumber = entryRecord["unix_number"];
    assert(
      typeof unixNumber === "number" && Number.isInteger(unixNumber),
      `signal ${id} unix_number must be integer`,
    );
    const unixNumberVal = unixNumber as number;
    assert(
      unixNumberVal >= 1 && unixNumberVal <= 64,
      `signal ${id} unix_number out of range: ${unixNumberVal}`,
    );

    expectString(entryRecord["description"], `signal ${id} missing description`);

    const defaultBehavior = expectString(
      entryRecord["default_behavior"],
      `signal ${id} missing default_behavior`,
    );
    const validBehaviors = [
      "graceful_shutdown",
      "graceful_shutdown_with_double_tap",
      "reload_via_restart",
      "immediate_exit",
      "custom",
      "observe_only",
    ];
    assert(
      validBehaviors.includes(defaultBehavior),
      `signal ${id} invalid default_behavior: ${defaultBehavior}`,
    );

    const exitCode = entryRecord["exit_code"];
    assert(
      typeof exitCode === "number" && Number.isInteger(exitCode),
      `signal ${id} exit_code must be integer`,
    );
    const exitCodeVal = exitCode as number;
    assert(
      exitCodeVal >= 0 && exitCodeVal <= 255,
      `signal ${id} exit_code out of range: ${exitCodeVal}`,
    );

    signalExitCodes.set(name, exitCodeVal);

    // Validate optional windows_event (can be null)
    const windowsEvent = entryRecord["windows_event"];
    if (windowsEvent !== undefined && windowsEvent !== null) {
      assert(typeof windowsEvent === "string", `signal ${id} windows_event must be string or null`);
    }
  }

  // Verify all required signals are present
  for (const requiredId of requiredSignals) {
    assert(seenSignalIds.has(requiredId), `missing required signal: ${requiredId}`);
  }

  // Validate behaviors array
  const behaviors = record["behaviors"];
  assert(Array.isArray(behaviors) && behaviors.length > 0, "behaviors must be non-empty array");

  const seenBehaviorIds = new Set<string>();
  for (const entry of behaviors as JSONObject[]) {
    assert(entry && typeof entry === "object", "behavior entry must be object");
    const entryRecord = entry as JSONObject;

    const id = expectString(entryRecord["id"], "behavior missing id");
    assert(/^[a-z0-9][a-z0-9_]*[a-z0-9]$|^[a-z]$/.test(id), `invalid behavior id: ${id}`);
    assert(!seenBehaviorIds.has(id), `duplicate behavior id: ${id}`);
    seenBehaviorIds.add(id);

    expectString(entryRecord["name"], `behavior ${id} missing name`);
    expectString(entryRecord["description"], `behavior ${id} missing description`);

    const phases = entryRecord["phases"];
    assert(
      Array.isArray(phases) && phases.length > 0,
      `behavior ${id} must have non-empty phases array`,
    );

    for (const phase of phases as JSONObject[]) {
      assert(phase && typeof phase === "object", `behavior ${id} phase must be object`);
      const phaseRecord = phase as JSONObject;
      expectString(phaseRecord["name"], `behavior ${id} phase missing name`);
      expectString(phaseRecord["description"], `behavior ${id} phase missing description`);
    }
  }

  // Validate os_mappings
  const osMappings = record["os_mappings"];
  assert(osMappings && typeof osMappings === "object", "os_mappings must be object");
  const osMappingsRecord = osMappings as JSONObject;

  assert(
    osMappingsRecord["unix"] && typeof osMappingsRecord["unix"] === "object",
    "os_mappings missing unix section",
  );
  assert(
    osMappingsRecord["windows"] && typeof osMappingsRecord["windows"] === "object",
    "os_mappings missing windows section",
  );
  assert(
    osMappingsRecord["signal_to_event"] && typeof osMappingsRecord["signal_to_event"] === "object",
    "os_mappings missing signal_to_event section",
  );

  // Validate exit_codes section
  const exitCodesSection = record["exit_codes"];
  assert(
    exitCodesSection && typeof exitCodesSection === "object",
    "signal catalog missing exit_codes section",
  );
  const exitCodesRecord = exitCodesSection as JSONObject;

  // Cross-reference with exit-codes.yaml
  const exitCodesCatalog = exitCodes as JSONObject;
  const exitCodesCategories = exitCodesCatalog["categories"];
  assert(Array.isArray(exitCodesCategories), "exit-codes.yaml missing categories array");

  const signalsCategory = (exitCodesCategories as JSONObject[]).find(
    (c: any) => c.id === "signals",
  );

  if (signalsCategory) {
    // TODO: Use for additional signal codes validation
    const _signalsCodes = (signalsCategory as any).codes as JSONObject[];

    // Verify signal exit codes match between catalogs
    for (const [signalName, expectedExitCode] of signalExitCodes.entries()) {
      const exitCodeEntry = exitCodesRecord[signalName];
      if (exitCodeEntry !== undefined) {
        assert(
          exitCodeEntry === expectedExitCode,
          `exit code mismatch for ${signalName}: signals.yaml has ${expectedExitCode}, ` +
            `exit-codes section has ${exitCodeEntry}`,
        );
      }
    }
  }
}

function validateWebBranding(config: any): void {
  assert(config && typeof config === "object", "web branding config must be object");
  const record = config as JSONObject;

  const name = expectString(record["name"], "branding config missing name");
  assert(name.length >= 1 && name.length <= 50, "branding name must be 1-50 characters");

  const tagline = record["tagline"];
  if (tagline !== undefined) {
    const taglineStr = expectString(tagline, "branding tagline must be string");
    assert(taglineStr.length <= 120, "branding tagline must be ≤120 characters");
  }

  const logo = record["logo"];
  if (logo !== undefined) {
    assert(logo && typeof logo === "object", "branding logo must be object");
    const logoRecord = logo as JSONObject;
    expectString(logoRecord["src"], "logo missing src");
    expectString(logoRecord["alt"], "logo missing alt");

    if (logoRecord["width"] !== undefined) {
      const width = logoRecord["width"];
      assert(
        typeof width === "number" && width >= 32 && width <= 256,
        "logo width must be 32-256px",
      );
    }
    if (logoRecord["height"] !== undefined) {
      const height = logoRecord["height"];
      assert(
        typeof height === "number" && height >= 32 && height <= 256,
        "logo height must be 32-256px",
      );
    }
  }

  const logoPresentation = expectString(
    record["logoPresentation"],
    "branding config missing logoPresentation",
  );
  const validPresentations = new Set([
    "logo_only",
    "logo_left_text_right",
    "logo_top_text_bottom",
    "text_only",
    "gridbox_logo_text",
  ]);
  assert(validPresentations.has(logoPresentation), `invalid logoPresentation: ${logoPresentation}`);
}

function validateServerManagement(config: any): void {
  assert(config && typeof config === "object", "server management config must be object");
  const record = config as JSONObject;

  // Validate envPrefix
  const envPrefix = record["envPrefix"];
  if (envPrefix !== undefined) {
    const envPrefixStr = expectString(envPrefix, "envPrefix must be string");
    assert(/^[A-Z][A-Z0-9_]*$/.test(envPrefixStr), `invalid envPrefix format: ${envPrefixStr}`);
  }

  // Validate configurations
  const configurations = record["configurations"];
  assert(
    configurations && typeof configurations === "object",
    "server management config missing configurations",
  );
  const configurationsRecord = configurations as JSONObject;

  const requiredClasses = ["dev", "test", "a11y", "preview", "prod_like"];
  for (const configClass of requiredClasses) {
    const serverConfig = configurationsRecord[configClass];
    if (serverConfig !== undefined) {
      validateServerConfig(serverConfig, configClass);
    }
  }

  // Validate additionalConfigurations
  const additionalConfigurations = record["additionalConfigurations"];
  if (additionalConfigurations !== undefined) {
    assert(typeof additionalConfigurations === "object", "additionalConfigurations must be object");
    const additionalRecord = additionalConfigurations as JSONObject;
    for (const key of Object.keys(additionalRecord)) {
      assert(
        /^x-[a-z0-9][a-z0-9_-]*$/.test(key),
        `invalid additional configuration key: ${key} (must match ^x-[a-z0-9][a-z0-9_-]*$)`,
      );
      validateServerConfig(additionalRecord[key], key);
    }
  }
}

function validateServerConfig(config: any, configClass: string): void {
  assert(config && typeof config === "object", `server config ${configClass} must be object`);
  const record = config as JSONObject;

  // Validate preferredPort
  const preferredPort = record["preferredPort"];
  assert(
    typeof preferredPort === "number" && Number.isInteger(preferredPort),
    `${configClass} preferredPort must be integer`,
  );
  const preferredPortNum = preferredPort as number;
  assert(
    preferredPortNum >= 1024 && preferredPortNum <= 65535,
    `${configClass} preferredPort must be 1024-65535`,
  );

  // Validate range
  const range = record["range"];
  assert(range && typeof range === "object", `${configClass} missing range`);
  const rangeRecord = range as JSONObject;
  const min = rangeRecord["min"];
  const max = rangeRecord["max"];
  assert(
    typeof min === "number" && Number.isInteger(min),
    `${configClass} range.min must be integer`,
  );
  assert(
    typeof max === "number" && Number.isInteger(max),
    `${configClass} range.max must be integer`,
  );
  const minNum = min as number;
  const maxNum = max as number;
  assert(minNum >= 1024 && minNum <= 65535, `${configClass} range.min must be 1024-65535`);
  assert(maxNum >= 1024 && maxNum <= 65535, `${configClass} range.max must be 1024-65535`);
  assert(minNum <= maxNum, `${configClass} range.min must be <= range.max`);
  assert(
    preferredPortNum >= minNum && preferredPortNum <= maxNum,
    `${configClass} preferredPort must be within range [${minNum}-${maxNum}]`,
  );

  // Validate healthCheck
  const healthCheck = record["healthCheck"];
  assert(healthCheck && typeof healthCheck === "object", `${configClass} missing healthCheck`);
  const healthCheckRecord = healthCheck as JSONObject;

  const method = healthCheckRecord["method"];
  if (method !== undefined) {
    const methodStr = expectString(method, `${configClass} healthCheck.method must be string`);
    assert(
      ["GET", "HEAD", "POST"].includes(methodStr),
      `${configClass} healthCheck.method must be GET, HEAD, or POST`,
    );
  }

  const path = expectString(healthCheckRecord["path"], `${configClass} healthCheck missing path`);
  assert(path.startsWith("/"), `${configClass} healthCheck.path must start with /`);

  if (healthCheckRecord["timeout"] !== undefined) {
    const timeout = healthCheckRecord["timeout"];
    assert(
      typeof timeout === "number" && timeout >= 100 && timeout <= 30000,
      `${configClass} healthCheck.timeout must be 100-30000ms`,
    );
  }

  if (healthCheckRecord["retries"] !== undefined) {
    const retries = healthCheckRecord["retries"];
    assert(
      typeof retries === "number" && retries >= 0 && retries <= 10,
      `${configClass} healthCheck.retries must be 0-10`,
    );
  }

  if (healthCheckRecord["interval"] !== undefined) {
    const interval = healthCheckRecord["interval"];
    assert(
      typeof interval === "number" && interval >= 100 && interval <= 10000,
      `${configClass} healthCheck.interval must be 100-10000ms`,
    );
  }

  // Validate exitBehavior
  const exitBehavior = record["exitBehavior"];
  if (exitBehavior !== undefined) {
    assert(typeof exitBehavior === "object", `${configClass} exitBehavior must be object`);
    const exitBehaviorRecord = exitBehavior as JSONObject;
    for (const key of ["portInUse", "healthCheckFailed", "startupTimeout"]) {
      if (exitBehaviorRecord[key] !== undefined) {
        const code = exitBehaviorRecord[key];
        assert(
          typeof code === "number" && code >= 0 && code <= 255,
          `${configClass} exitBehavior.${key} must be 0-255`,
        );
      }
    }
  }

  // Validate envOverrides
  const envOverrides = record["envOverrides"];
  if (envOverrides !== undefined) {
    assert(Array.isArray(envOverrides), `${configClass} envOverrides must be array`);
    const seen = new Set<string>();
    for (const envVar of envOverrides as unknown[]) {
      const envVarStr = expectString(envVar, `${configClass} envOverride must be string`);
      assert(
        /^[A-Z][A-Z0-9_]*$/.test(envVarStr),
        `${configClass} invalid envOverride format: ${envVarStr}`,
      );
      assert(!seen.has(envVarStr), `${configClass} duplicate envOverride: ${envVarStr}`);
      seen.add(envVarStr);
    }
  }

  // Validate pidFile
  const pidFile = record["pidFile"];
  if (pidFile !== undefined) {
    const pidFileStr = expectString(pidFile, `${configClass} pidFile must be string`);
    assert(
      /^[^/].*\.pid$/.test(pidFileStr),
      `${configClass} pidFile must be relative path ending in .pid`,
    );
  }

  // Validate logFile
  const logFile = record["logFile"];
  if (logFile !== undefined) {
    expectString(logFile, `${configClass} logFile must be string`);
  }
}

function validateWebStyling(config: any): void {
  assert(config && typeof config === "object", "web styling config must be object");
  const record = config as JSONObject;

  // Validate themes
  const themes = record["themes"];
  assert(themes && typeof themes === "object", "styling config missing themes");
  const themesRecord = themes as JSONObject;

  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const requiredColors = [
    "background",
    "foreground",
    "accent",
    "success",
    "failure",
    "warning",
    "critical",
  ];

  for (const mode of ["light", "dark"]) {
    const theme = themesRecord[mode];
    assert(theme && typeof theme === "object", `styling themes missing ${mode} mode`);
    const themeRecord = theme as JSONObject;

    // Check required colors
    for (const colorKey of requiredColors) {
      const color = themeRecord[colorKey];
      const colorStr = expectString(color, `theme ${mode} missing ${colorKey}`);
      assert(
        hexPattern.test(colorStr),
        `theme ${mode} ${colorKey} invalid hex format: ${colorStr}`,
      );
    }

    // Validate optional categorical palette
    const categorical = themeRecord["categorical"];
    if (categorical !== undefined) {
      assert(Array.isArray(categorical), `theme ${mode} categorical must be array`);
      const categoricalArray = categorical as unknown[];
      assert(
        categoricalArray.length >= 5 && categoricalArray.length <= 12,
        `theme ${mode} categorical must have 5-12 colors`,
      );
      const seenColors = new Set<string>();
      for (const color of categoricalArray) {
        const colorStr = expectString(color, `theme ${mode} categorical color must be string`);
        assert(hexPattern.test(colorStr), `theme ${mode} categorical invalid hex: ${colorStr}`);
        assert(!seenColors.has(colorStr), `theme ${mode} categorical duplicate color: ${colorStr}`);
        seenColors.add(colorStr);
      }
    }
  }

  // Validate typography
  const typography = record["typography"];
  assert(typography && typeof typography === "object", "styling config missing typography");
  const typographyRecord = typography as JSONObject;

  const fonts = typographyRecord["fonts"];
  assert(fonts && typeof fonts === "object", "typography missing fonts");
  const fontsRecord = fonts as JSONObject;

  // Validate required fonts (body and code)
  for (const fontType of ["body", "code"]) {
    const font = fontsRecord[fontType];
    assert(font && typeof font === "object", `typography fonts missing ${fontType}`);
    const fontRecord = font as JSONObject;

    expectString(fontRecord["family"], `typography ${fontType} missing family`);
    expectString(fontRecord["src"], `typography ${fontType} missing src`);

    if (fontRecord["weights"] !== undefined) {
      const weights = fontRecord["weights"];
      assert(Array.isArray(weights), `typography ${fontType} weights must be array`);
      for (const weight of weights as unknown[]) {
        assert(
          typeof weight === "number" && weight >= 100 && weight <= 900,
          `typography ${fontType} invalid weight: ${weight}`,
        );
      }
    }

    if (fontRecord["size"] !== undefined) {
      const size = fontRecord["size"];
      assert(size && typeof size === "object", `typography ${fontType} size must be object`);
      const sizeRecord = size as JSONObject;
      const base = sizeRecord["base"];
      const baseStr = expectString(base, `typography ${fontType} size missing base`);
      assert(
        /^[0-9]+(\.[0-9]+)?(px|rem|em)$/.test(baseStr),
        `typography ${fontType} size.base invalid format: ${baseStr}`,
      );
    }
  }

  // Validate icons
  const icons = record["icons"];
  assert(icons && typeof icons === "object", "styling config missing icons");
  const iconsRecord = icons as JSONObject;

  const registry = expectString(iconsRecord["registry"], "icons missing registry");
  const validRegistries = new Set(["mdi", "heroicons", "lucide", "tabler"]);
  assert(validRegistries.has(registry), `invalid icon registry: ${registry}`);

  if (iconsRecord["size"] !== undefined) {
    const size = iconsRecord["size"];
    assert(typeof size === "number" && size >= 16 && size <= 48, "icons size must be 16-48px");
  }

  // Validate a11y constraints
  const a11y = record["a11y"];
  if (a11y !== undefined) {
    assert(a11y && typeof a11y === "object", "a11y must be object");
    const a11yRecord = a11y as JSONObject;

    const minContrast = a11yRecord["minContrast"];
    if (minContrast !== undefined) {
      assert(minContrast && typeof minContrast === "object", "a11y minContrast must be object");
      const contrastRecord = minContrast as JSONObject;

      for (const [key, min, max] of [
        ["normal", 3.0, 21.0],
        ["large", 2.0, 21.0],
        ["graphics", 3.0, 21.0],
      ] as Array<[string, number, number]>) {
        if (contrastRecord[key] !== undefined) {
          const value = contrastRecord[key];
          assert(
            typeof value === "number" && value >= min && value <= max,
            `a11y minContrast.${key} must be ${min}-${max}`,
          );
        }
      }
    }

    const level = a11yRecord["level"];
    if (level !== undefined) {
      const levelStr = expectString(level, "a11y level must be string");
      assert(["AA", "AAA"].includes(levelStr), `a11y level must be AA or AAA: ${levelStr}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("Validating taxonomy registries...");
  const languages = await loadFile("config/taxonomy/languages.yaml");
  validateLanguages(languages);

  const categories = await loadFile("config/taxonomy/repository-categories.yaml");
  validateCategories(categories);

  console.log("Validating library module manifest...");
  const manifest = await loadFile("config/library/v1.0.0/module-manifest.yaml");
  validateModuleManifest(manifest);

  console.log("Validating foundry pattern catalog...");
  const foundry = await loadFile("config/library/foundry/patterns.yaml");
  validateFoundryPatterns(foundry);

  console.log("Validating HTTP status catalog...");
  const httpStatuses = await loadFile("config/library/foundry/http-statuses.yaml");
  validateHttpStatusGroups(httpStatuses);

  console.log("Validating country code catalog...");
  const countryCodes = await loadFile("config/library/foundry/country-codes.yaml");
  validateCountryCodes(countryCodes);

  console.log("Validating MIME types catalog...");
  const mimeTypes = await loadFile("config/library/foundry/mime-types.yaml");
  validateMimeTypes(mimeTypes);

  console.log("Validating exit codes catalog...");
  const exitCodes = await loadFile("config/library/foundry/exit-codes.yaml");
  validateExitCodes(exitCodes);

  console.log("Validating signal catalog...");
  const signals = await loadFile("config/library/foundry/signals.yaml");
  validateSignalCatalog(signals, exitCodes);

  console.log("Validating web branding config...");
  const webBranding = await loadFile("config/web/branding/site-branding.yaml");
  validateWebBranding(webBranding);

  console.log("Validating web styling config...");
  const webStyling = await loadFile("config/web/styling/site-styling.yaml");
  validateWebStyling(webStyling);

  console.log("Validating server management config...");
  const serverManagement = await loadFile("config/server/management/server-management.yaml");
  validateServerManagement(serverManagement);

  console.log("Validating log-event schema structure...");
  const logEventSchema = await loadFile(
    "schemas/observability/logging/v1.0.0/log-event.schema.json",
  );
  validateLogEventSchema(logEventSchema);

  console.log("Validating HTTP API examples...");
  await validateHttpExamples();

  console.log("Validating similarity fixtures...");
  await validateSimilarityFixtures();

  console.log("Validating app-identity example...");
  const appIdentityExample = await loadFile(
    "config/repository/app-identity/app-identity.example.yaml",
  );
  validateAppIdentityExample(appIdentityExample);

  console.log("✅ Schema validation complete");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
