import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as crucible from "../src/index.js";

const packageVersion: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
).version;

describe("index exports", () => {
  it("should export VERSION constant", () => {
    expect(crucible.VERSION).toBeDefined();
    expect(typeof crucible.VERSION).toBe("string");
    expect(crucible.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(crucible.VERSION).toBe(packageVersion);
  });

  it("should export CRUCIBLE_VERSION constant", () => {
    expect(crucible.CRUCIBLE_VERSION).toBeDefined();
    expect(typeof crucible.CRUCIBLE_VERSION).toBe("string");
    expect(crucible.CRUCIBLE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(crucible.CRUCIBLE_VERSION).toBe(packageVersion);
  });

  it("should export schema utility functions", () => {
    expect(crucible.normalizeSchema).toBeDefined();
    expect(typeof crucible.normalizeSchema).toBe("function");
    expect(crucible.compareSchemas).toBeDefined();
    expect(typeof crucible.compareSchemas).toBe("function");
  });

  it("should export terminal functions", () => {
    expect(crucible.loadTerminalCatalog).toBeDefined();
    expect(typeof crucible.loadTerminalCatalog).toBe("function");
    expect(crucible.getTerminalConfig).toBeDefined();
    expect(typeof crucible.getTerminalConfig).toBe("function");
  });

  it("should export schemas object", () => {
    expect(crucible.schemas).toBeDefined();
    expect(typeof crucible.schemas).toBe("object");
  });
});
