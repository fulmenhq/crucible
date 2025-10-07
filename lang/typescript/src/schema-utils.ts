import { load as parseYaml } from "js-yaml";

/**
 * Canonically sort object keys to produce stable JSON output.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    if (value instanceof Map) {
      const sortedEntries = Array.from(value.entries())
        .map(([key, val]) => [key, canonicalize(val)] as [string, unknown])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

      return Object.fromEntries(sortedEntries);
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, canonicalize(val)] as [string, unknown])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return Object.fromEntries(entries);
  }

  return value;
}

function toStringInput(input: string | Buffer | Uint8Array): string {
  if (typeof input === "string") {
    return input;
  }
  if (Buffer.isBuffer(input)) {
    return input.toString("utf-8");
  }
  return Buffer.from(input).toString("utf-8");
}

export interface SchemaNormalizationOptions {
  /** When true, minify output JSON instead of pretty printing */
  compact?: boolean;
}

export interface SchemaComparisonResult {
  equal: boolean;
  normalizedA: string;
  normalizedB: string;
}

/**
 * Normalize a JSON or YAML schema into canonical, pretty-printed JSON.
 */
export function normalizeSchema(
  input: string | Buffer | Uint8Array,
  options: SchemaNormalizationOptions = {},
): string {
  const raw = toStringInput(input).trim();
  if (!raw) {
    throw new Error("Schema content is empty");
  }

  const parsed = parseYaml(raw, { json: true });
  const canonical = canonicalize(parsed);
  const spacing = options.compact ? 0 : 2;
  return JSON.stringify(canonical, null, spacing);
}

/**
 * Compare two schema documents semantically by normalizing them first.
 */
export function compareSchemas(
  schemaA: string | Buffer | Uint8Array,
  schemaB: string | Buffer | Uint8Array,
  options: SchemaNormalizationOptions = {},
): SchemaComparisonResult {
  const normalizedA = normalizeSchema(schemaA, options);
  const normalizedB = normalizeSchema(schemaB, options);

  return {
    equal: normalizedA === normalizedB,
    normalizedA,
    normalizedB,
  };
}
