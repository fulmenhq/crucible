import { describe, expect, test } from 'vitest';
import { loadTerminalCatalog, getTerminalConfig, validateTerminalConfig } from './terminal';

describe('terminal', () => {
  test('loadTerminalCatalog returns a map', () => {
    const catalog = loadTerminalCatalog();
    expect(catalog).toBeInstanceOf(Map);
  });

  test('getTerminalConfig returns config for known terminal', () => {
    const config = getTerminalConfig('Ghostty');
    expect(config).toBeDefined();
    expect(config?.name).toBe('Ghostty');
  });

  test('validateTerminalConfig validates correct config', () => {
    const config = {
      name: 'Test',
      detection: {},
      overrides: {}
    };
    expect(validateTerminalConfig(config)).toBe(true);
  });
});
