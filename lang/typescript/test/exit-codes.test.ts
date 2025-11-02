import { describe, expect, test } from "vitest";
import {
  EXIT_CODES_VERSION,
  exitCodeMetadata,
  exitCodes,
  getExitCodeInfo,
} from "../src/foundry/exitCodes";

describe("exit codes bindings", () => {
  test("constants stay aligned with catalog snapshot", () => {
    expect(exitCodes).toMatchSnapshot();
  });

  test("metadata stays aligned with catalog snapshot", () => {
    expect(exitCodeMetadata).toMatchSnapshot();
  });

  test("getExitCodeInfo returns consistent metadata", () => {
    const code = exitCodes.EXIT_SIGNAL_TERM;
    const info = getExitCodeInfo(code);

    expect(info).toBeDefined();
    expect(info).toMatchObject({
      name: "EXIT_SIGNAL_TERM",
      pythonNote: "Default signal for graceful shutdown",
      category: "signals",
    });
  });

  test("catalog version is embedded", () => {
    expect(EXIT_CODES_VERSION).toMatch(/^v?\d+\.\d+\.\d+$/);
  });
});
