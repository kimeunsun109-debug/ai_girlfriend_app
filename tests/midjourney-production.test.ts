import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../src/lib/midjourney-production/face-verifier.js';
import { folderForPromptCategory, FACE_VERIFICATION, MJ_LIBRARY_FOLDERS } from '../src/config/midjourney-production.config.js';
import { ProductionDb } from '../src/lib/midjourney-production/production-db.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('midjourney-production.config', () => {
  it('defines library folder structure', () => {
    expect(MJ_LIBRARY_FOLDERS).toContain('cafe');
    expect(MJ_LIBRARY_FOLDERS).toContain('selfie');
    expect(MJ_LIBRARY_FOLDERS).toContain('_review');
  });

  it('maps prompt categories to folders', () => {
    expect(folderForPromptCategory('cafe')).toBe('cafe');
    expect(folderForPromptCategory('hair_salon')).toBe('mirror');
    expect(folderForPromptCategory('gym')).toBe('workout');
  });

  it('has face verification thresholds', () => {
    expect(FACE_VERIFICATION.autoApprove).toBeGreaterThanOrEqual(0.9);
    expect(FACE_VERIFICATION.reviewMin).toBeLessThan(FACE_VERIFICATION.autoApprove);
  });
});

describe('face-verifier', () => {
  it('cosine similarity identical vectors = 1', () => {
    const v = [0.1, 0.2, 0.3, 0.4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('cosine similarity orthogonal ≈ 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
});

describe('production-db', () => {
  it('tracks prompt usage without repeat', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-prod-'));
    const dbPath = join(dir, 'test.db');
    const db = new ProductionDb(dbPath);
    expect(db.isPromptUsed('yuna', 'cafe', 0)).toBe(false);
    db.markPromptUsed('yuna', 'cafe', 0, 'abc123', 'job-1');
    expect(db.isPromptUsed('yuna', 'cafe', 0)).toBe(true);
    expect(db.isPromptUsed('yuna', 'cafe', 1)).toBe(false);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates production run', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-run-'));
    const db = new ProductionDb(join(dir, 'test.db'));
    const run = db.createRun(['yuna', 'narin'], 20);
    expect(run.photosPerCharacter).toBe(20);
    expect(run.characterOrder).toEqual(['yuna', 'narin']);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('production-db hash', () => {
  it('hashes prompts consistently', () => {
    const h = ProductionDb.hashPrompt('test prompt');
    expect(h).toHaveLength(16);
    expect(ProductionDb.hashPrompt('test prompt')).toBe(h);
  });
});
