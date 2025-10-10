import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const LANGUAGE_KEYS = new Set(['go', 'python', 'typescript', 'rust', 'csharp']);
const LANGUAGE_STATUS = new Set(['active', 'planned', 'deprecated']);
const CATEGORY_KEYS = new Set(['cli', 'workhorse', 'service', 'library', 'pipeline', 'codex', 'sdk']);
const MODULE_IDS = new Set([
  'config-path-api',
  'three-layer-config',
  'schema-validation',
  'crucible-shim',
  'fuldx-bootstrap',
  'ssot-sync',
  'observability-logging',
  'foundry-patterns',
  'cloud-storage',
  'pathfinder',
  'ascii-helpers',
]);
const CORE_MODULES = new Set([
  'config-path-api',
  'three-layer-config',
  'schema-validation',
  'crucible-shim',
  'fuldx-bootstrap',
  'ssot-sync',
  'observability-logging',
  'foundry-patterns',
]);

type JSONObject = Record<string, unknown>;

async function loadFile(filePath: string) {
  const abs = path.resolve(repoRoot, filePath);
  const text = await readFile(abs, 'utf8');
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
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
  if (typeof value !== 'string') {
    throw new Error(message);
  }
  return value;
}

function validateLanguages(registry: any): void {
  assert(registry && Array.isArray(registry.languages), 'languages.yaml must contain a languages array');

  const seenKeys = new Set<string>();
  for (const entry of registry.languages as JSONObject[]) {
    assert(typeof entry === 'object' && entry !== null, 'language entry must be object');
    const { key, name, libraryName, status, minimumRuntime } = entry as any;
    assert(typeof key === 'string' && LANGUAGE_KEYS.has(key), `invalid language key: ${key}`);
    assert(!seenKeys.has(key), `duplicate language key: ${key}`);
    seenKeys.add(key);
    assert(typeof name === 'string' && name.length > 0, `language ${key} missing name`);
    assert(
      typeof libraryName === 'string' && libraryName.length > 0,
      `language ${key} missing libraryName`,
    );
    assert(typeof status === 'string' && LANGUAGE_STATUS.has(status), `language ${key} invalid status`);
    if (minimumRuntime !== undefined) {
      assert(
        typeof minimumRuntime === 'string' && minimumRuntime.length > 0,
        `language ${key} invalid minimumRuntime`,
      );
    }
  }
}

function validateCategories(registry: any): void {
  assert(
    registry && Array.isArray(registry.categories),
    'repository-categories.yaml must contain a categories array',
  );

  const seenKeys = new Set<string>();
  for (const entry of registry.categories as JSONObject[]) {
    assert(typeof entry === 'object' && entry !== null, 'category entry must be object');
    const { key, summary, primaryEntryPoints, typicalConsumers } = entry as any;
    assert(typeof key === 'string' && CATEGORY_KEYS.has(key), `invalid category key: ${key}`);
    assert(!seenKeys.has(key), `duplicate category key: ${key}`);
    seenKeys.add(key);
    assert(typeof summary === 'string' && summary.length > 0, `category ${key} missing summary`);
    assert(
      Array.isArray(primaryEntryPoints),
      `category ${key} primaryEntryPoints must be array`,
    );
    assert(Array.isArray(typicalConsumers), `category ${key} typicalConsumers must be array`);
  }
}

function validateModuleManifest(manifest: any): void {
  assert(manifest && typeof manifest === 'object', 'module manifest must be object');
  const manifestRecord = manifest as JSONObject;
  const modules = manifestRecord['modules'];
  assert(Array.isArray(modules) && modules.length > 0, 'module manifest requires modules array');

  const seen = new Set<string>();
  for (const moduleEntry of modules as JSONObject[]) {
    assert(moduleEntry && typeof moduleEntry === 'object', 'module entry must be object');
    const entryRecord = moduleEntry as JSONObject;
    const id = expectString(entryRecord['id'], 'module entry missing id');
    const tier = expectString(entryRecord['tier'], `module ${id} missing tier`);
    const requirement = expectString(entryRecord['requirement'], `module ${id} missing requirement`);
    assert(MODULE_IDS.has(id), `invalid module id: ${id}`);
    assert(!seen.has(id), `duplicate module id: ${id}`);
    seen.add(id);
    if (CORE_MODULES.has(id)) {
      assert(tier === 'core', `core module ${id} must use tier "core"`);
      assert(
        requirement === 'mandatory' || requirement === 'recommended',
        `core module ${id} must be mandatory or recommended`,
      );
    } else {
      assert(tier === 'extension', `extension module ${id} must use tier "extension"`);
    }

    const coverage = entryRecord['coverage'];
    if (coverage !== undefined) {
      assert(Array.isArray(coverage), `module ${id} coverage must be array`);
      for (const coverageEntry of coverage as JSONObject[]) {
        assert(
          coverageEntry && typeof coverageEntry === 'object',
          `module ${id} coverage entry must be object`,
        );
        const coverageRecord = coverageEntry as JSONObject;
        const language = expectString(coverageRecord['language'], `module ${id} coverage missing language`);
        const target = coverageRecord['target'];
        assert(LANGUAGE_KEYS.has(language), `module ${id} invalid coverage language`);
        assert(
          typeof target === 'number' && Number.isInteger(target) && target >= 0 && target <= 100,
          `module ${id} invalid coverage target for ${language}`,
        );
      }
    }
  }

  const overrides = manifestRecord['languageOverrides'];
  if (overrides !== undefined) {
    assert(Array.isArray(overrides), 'languageOverrides must be array');
    for (const overrideEntry of overrides as JSONObject[]) {
      assert(overrideEntry && typeof overrideEntry === 'object', 'override must be object');
      const overrideRecord = overrideEntry as JSONObject;
      const language = expectString(overrideRecord['language'], 'override must specify valid language');
      assert(LANGUAGE_KEYS.has(language), 'override must specify valid language');

      const unsupported = overrideRecord['unsupported'];
      if (unsupported !== undefined) {
        assert(Array.isArray(unsupported), `override for ${language} unsupported must be array`);
        for (const moduleId of unsupported as unknown[]) {
          const moduleIdStr = expectString(moduleId, `override ${language} invalid unsupported module`);
          assert(MODULE_IDS.has(moduleIdStr), `override ${language} invalid unsupported module`);
        }
      }

      const planned = overrideRecord['planned'];
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
  assert(catalog && typeof catalog === 'object', 'foundry patterns must be object');
  const record = catalog as JSONObject;
  const version = expectString(record['version'], 'foundry catalog missing version');
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), 'foundry catalog version must be SemVer/CalVer');

  const patterns = record['patterns'];
  assert(Array.isArray(patterns) && patterns.length > 0, 'foundry patterns array must be non-empty');
  const ids = new Set<string>();
  const allowedKinds = new Set(['regex', 'glob', 'literal']);

  for (const entry of patterns as JSONObject[]) {
    assert(entry && typeof entry === 'object', 'pattern entry must be object');
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord['id'], 'pattern entry missing id');
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid pattern id: ${id}`);
    assert(!ids.has(id), `duplicate pattern id: ${id}`);
    ids.add(id);

    expectString(entryRecord['name'], `pattern ${id} missing name`);
    const kind = expectString(entryRecord['kind'], `pattern ${id} missing kind`);
    assert(allowedKinds.has(kind), `pattern ${id} invalid kind: ${kind}`);
    expectString(entryRecord['pattern'], `pattern ${id} missing pattern string`);

    const flags = entryRecord['flags'];
    if (flags !== undefined) {
      assert(typeof flags === 'object' && !Array.isArray(flags), `pattern ${id} flags must be object`);
    }
  }
}

function validateHttpStatusGroups(catalog: any): void {
  assert(catalog && typeof catalog === 'object', 'http status catalog must be object');
  const record = catalog as JSONObject;
  const version = expectString(record['version'], 'http status catalog missing version');
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), 'http status catalog version must be SemVer/CalVer');

  const groups = record['groups'];
  assert(Array.isArray(groups) && groups.length > 0, 'http status groups must be non-empty array');
  const ids = new Set<string>();

  for (const entry of groups as JSONObject[]) {
    assert(entry && typeof entry === 'object', 'http status group must be object');
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord['id'], 'http status group missing id');
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid http status group id: ${id}`);
    assert(!ids.has(id), `duplicate http status group id: ${id}`);
    ids.add(id);

    expectString(entryRecord['name'], `http status group ${id} missing name`);
    const codes = entryRecord['codes'];
    assert(Array.isArray(codes) && codes.length > 0, `http status group ${id} missing codes array`);
    const seenCodes = new Set<number>();
    for (const codeEntry of codes as JSONObject[]) {
      assert(codeEntry && typeof codeEntry === 'object', `http status group ${id} code entry must be object`);
      const entryObj = codeEntry as JSONObject;
      const valueRaw = entryObj['value'];
      assert(
        typeof valueRaw === 'number' && Number.isInteger(valueRaw),
        `http status group ${id} code must be integer`,
      );
      const value = valueRaw as number;
      const reason = expectString(entryObj['reason'], `http status group ${id} code ${value} missing reason`);
      assert(value >= 100 && value <= 599, `http status group ${id} code ${value} out of range`);
      assert(!seenCodes.has(value), `http status group ${id} duplicate code ${value}`);
      seenCodes.add(value);
      const extraDesc = entryObj['description'];
      if (extraDesc !== undefined) {
        expectString(extraDesc, `http status group ${id} code ${value} description must be string`);
      }
      assert(reason.length > 0, `http status group ${id} code ${value} reason must be non-empty`);
    }
  }
}

function validateCountryCodes(catalog: any): void {
  assert(catalog && typeof catalog === 'object', 'country code catalog must be object');
  const record = catalog as JSONObject;
  const version = expectString(record['version'], 'country code catalog missing version');
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), 'country code catalog version must be SemVer/CalVer');

  const countries = record['countries'];
  assert(Array.isArray(countries) && countries.length > 0, 'country code list must be non-empty array');
  const seenAlpha2 = new Set<string>();
  const seenAlpha3 = new Set<string>();

  for (const entry of countries as JSONObject[]) {
    assert(entry && typeof entry === 'object', 'country entry must be object');
    const entryRecord = entry as JSONObject;
    const alpha2 = expectString(entryRecord['alpha2'], 'country entry missing alpha2');
    const alpha3 = expectString(entryRecord['alpha3'], 'country entry missing alpha3');
    const numeric = expectString(entryRecord['numeric'], 'country entry missing numeric code');
    expectString(entryRecord['name'], 'country entry missing name');

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
  assert(catalog && typeof catalog === 'object', 'mime type catalog must be object');
  const record = catalog as JSONObject;
  const version = expectString(record['version'], 'mime type catalog missing version');
  assert(/^[vV]?\d+\.\d+\.\d+$/.test(version), 'mime type catalog version must be SemVer/CalVer');

  const types = record['types'];
  assert(Array.isArray(types) && types.length > 0, 'mime type list must be non-empty array');
  const seenIds = new Set<string>();
  const seenMimes = new Set<string>();

  for (const entry of types as JSONObject[]) {
    assert(entry && typeof entry === 'object', 'mime type entry must be object');
    const entryRecord = entry as JSONObject;
    const id = expectString(entryRecord['id'], 'mime type entry missing id');
    const mime = expectString(entryRecord['mime'], `mime type ${id} missing mime`);
    assert(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id), `invalid mime type id: ${id}`);
    assert(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mime), `invalid mime value: ${mime}`);
    assert(!seenIds.has(id), `duplicate mime type id: ${id}`);
    assert(!seenMimes.has(mime), `duplicate mime value: ${mime}`);
    seenIds.add(id);
    seenMimes.add(mime);

    const extensions = entryRecord['extensions'];
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
  assert(schema && typeof schema === 'object', 'log-event schema must be object');
  const schemaRecord = schema as JSONObject;
  const propsUnknown = schemaRecord['properties'];
  assert(
    propsUnknown && typeof propsUnknown === 'object' && !Array.isArray(propsUnknown),
    'log-event schema missing properties',
  );
  const props = propsUnknown as JSONObject;

  const requiredProps = ['contextId', 'requestId', 'correlationId', 'operation', 'durationMs', 'userId'];
  for (const prop of requiredProps) {
    assert(prop in props, `log-event schema missing ${prop} property`);
  }
  assert('parentSpanId' in props, 'log-event schema missing parentSpanId property');

  const examplesUnknown = schemaRecord['examples'];
  assert(Array.isArray(examplesUnknown) && examplesUnknown.length > 0, 'log-event schema must include examples');
}

async function validateHttpExamples(): Promise<void> {
  const successExample = await loadFile('examples/api/http/v1.0.0/success-response.example.json');
  assert(successExample && typeof successExample === 'object', 'success example missing');
  assert((successExample as JSONObject)['success'] === true, 'success example must set success=true');

  const errorExample = await loadFile('examples/api/http/v1.0.0/error-response.example.json');
  assert(errorExample && typeof errorExample === 'object', 'error example missing');
  assert((errorExample as JSONObject)['success'] === false, 'error example must set success=false');

  const healthExample = await loadFile('examples/api/http/v1.0.0/health-response.example.json');
  assert(healthExample && typeof healthExample === 'object', 'health example missing');
  assert(
    typeof (healthExample as JSONObject)['status'] === 'string',
    'health example must include status field',
  );

  const versionExample = await loadFile('examples/api/http/v1.0.0/version-response.example.json');
  assert(versionExample && typeof versionExample === 'object', 'version example missing');
  assert((versionExample as JSONObject)['success'] === true, 'version example must set success=true');
}

async function main(): Promise<void> {
  console.log('Validating taxonomy registries...');
  const languages = await loadFile('config/taxonomy/languages.yaml');
  validateLanguages(languages);

  const categories = await loadFile('config/taxonomy/repository-categories.yaml');
  validateCategories(categories);

  console.log('Validating library module manifest...');
  const manifest = await loadFile('config/library/v1.0.0/module-manifest.yaml');
  validateModuleManifest(manifest);

  console.log('Validating foundry pattern catalog...');
  const foundry = await loadFile('config/library/foundry/patterns.yaml');
  validateFoundryPatterns(foundry);

  console.log('Validating HTTP status catalog...');
  const httpStatuses = await loadFile('config/library/foundry/http-statuses.yaml');
  validateHttpStatusGroups(httpStatuses);

  console.log('Validating country code catalog...');
  const countryCodes = await loadFile('config/library/foundry/country-codes.yaml');
  validateCountryCodes(countryCodes);

  console.log('Validating MIME types catalog...');
  const mimeTypes = await loadFile('config/library/foundry/mime-types.yaml');
  validateMimeTypes(mimeTypes);

  console.log('Validating log-event schema structure...');
  const logEventSchema = await loadFile('schemas/observability/logging/v1.0.0/log-event.schema.json');
  validateLogEventSchema(logEventSchema);

  console.log('Validating HTTP API examples...');
  await validateHttpExamples();

  console.log('✅ Schema validation complete');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
