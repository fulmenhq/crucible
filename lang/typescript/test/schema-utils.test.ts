import { describe, expect, test } from "vitest";
import { compareSchemas, normalizeSchema } from "../src/schema-utils";

const jsonSchema = '{"type":"object","properties":{"name":{"type":"string"}}}';
const yamlSchema = "# sample schema\n---\ntype: object\nproperties:\n  name:\n    type: string\n";

describe("schema utils", () => {
  test("normalizeSchema converts YAML with comments to canonical JSON", () => {
    const normalized = normalizeSchema(yamlSchema);
    expect(normalized).toContain('"type"');
    expect(normalized).toContain('"name"');
  });

  test("compareSchemas treats YAML and JSON equivalents as equal", () => {
    const result = compareSchemas(jsonSchema, yamlSchema);
    expect(result.equal).toBe(true);
  });
});
