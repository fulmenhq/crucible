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
