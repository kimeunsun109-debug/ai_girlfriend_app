import { describe, it, expect } from 'vitest';
import {
  PHOTO_LIBRARY_ROOT,
  PHOTO_UNIVERSE_PATHS,
  UNIVERSE_QUALITY,
} from '../src/config/photo-universe.config.js';
import {
  resolvePromptCategory,
  prepareMidjourneyPrompt,
} from '../src/lib/photo-universe/midjourney-workflow.js';
import { hammingDistanceHex } from '../src/lib/photo-universe/quality-inspector.js';

describe('photo-universe.config', () => {
  it('defines external library root', () => {
    expect(PHOTO_LIBRARY_ROOT).toBeTruthy();
    expect(PHOTO_UNIVERSE_PATHS.catalogDb).toContain('catalog.db');
  });

  it('has quality thresholds', () => {
    expect(UNIVERSE_QUALITY.minShortEdge).toBeGreaterThanOrEqual(512);
    expect(UNIVERSE_QUALITY.minQualityScore).toBeGreaterThan(0);
  });
});

describe('midjourney-workflow', () => {
  it('maps folder slug to prompt catalog category', () => {
    expect(resolvePromptCategory('coffee')).toBe('cafe');
    expect(resolvePromptCategory('hair')).toBe('hair_salon');
    expect(resolvePromptCategory('gym')).toBe('gym');
  });

  it('builds Midjourney command with identity lock', () => {
    const p = prepareMidjourneyPrompt({
      characterSlug: 'yuna',
      category: 'cafe',
      emotion: 'shy',
      useCatalog: false,
      seed: 42,
    });
    expect(p.midjourneyCommand).toContain('/imagine prompt:');
    expect(p.identityNote).toContain('IDENTITY LOCK');
    expect(p.targetFolder).toContain('yuna');
    expect(p.targetFolder).toContain('cafe');
  });
});

describe('quality-inspector', () => {
  it('computes hamming distance between hashes', () => {
    expect(hammingDistanceHex('0000', '0000')).toBe(0);
    expect(hammingDistanceHex('0001', '0000')).toBe(1);
  });
});
