import { describe, it, expect } from 'vitest';
import { parseBoundedInt, parseOptionalSeed } from '../src/utils/query-parse.utils.js';

describe('query-parse utils', () => {
  it('parseBoundedInt uses fallback when empty', () => {
    expect(parseBoundedInt(undefined, { fallback: 1 })).toEqual({ ok: true, value: 1 });
  });

  it('parseBoundedInt rejects zero and negative', () => {
    expect(parseBoundedInt('0', { min: 1 }).ok).toBe(false);
    expect(parseBoundedInt('-3', { min: 1 }).ok).toBe(false);
  });

  it('parseBoundedInt rejects non-numeric', () => {
    expect(parseBoundedInt('abc', { min: 1 }).ok).toBe(false);
  });

  it('parseBoundedInt caps at max', () => {
    expect(parseBoundedInt('99', { min: 1, max: 20 })).toEqual({ ok: true, value: 20 });
  });

  it('parseOptionalSeed returns undefined for invalid', () => {
    expect(parseOptionalSeed('not-a-number')).toBeUndefined();
    expect(parseOptionalSeed('42')).toBe(42);
  });
});
