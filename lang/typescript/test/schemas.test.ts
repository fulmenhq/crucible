import { describe, expect, test } from 'vitest';
import { schemas } from '../src/schemas';

const catalog = schemas.terminal().catalog();

describe('schemas registry', () => {
  test('terminal catalog exposes known terminals', () => {
    expect(catalog.size).toBeGreaterThan(0);
    expect(catalog.has('iTerm2')).toBe(true);
  });

  test('pathfinder schema normalization returns objects', () => {
    const finderConfig = schemas.pathfinder().v1_0_0().finderConfig();
    expect(finderConfig).toHaveProperty('$id');
    expect(finderConfig).toHaveProperty('properties');
  });
});
