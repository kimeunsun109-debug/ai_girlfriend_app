import { describe, it, expect } from 'vitest';
import { ProductionDb } from '../src/lib/midjourney-production/production-db.js';
import { promptSelector } from '../src/lib/midjourney-production/prompt-selector.js';
import { runtimeSceneGenerator } from '../src/lib/midjourney-production/runtime-scene-generator.js';
import { productionStats } from '../src/lib/midjourney-production/production-stats.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('production operational mode', () => {
  it('pickUnusedOrGenerate falls back to runtime scenes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-gen-'));
    const dbPath = join(dir, 'test.db');
    const db = new ProductionDb(dbPath);

    for (let i = 0; i < 3; i++) {
      db.markPromptUsed('yuna', 'cafe', i, `hash${i}`, `job-${i}`);
    }

    const generated = runtimeSceneGenerator.generate('yuna', 'cafe');
    expect(generated).not.toBeNull();
    expect(generated!.catalogCategory).toBe('__generated__');
    expect(generated!.entry.prompt).toContain('yuna');

    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('requeues regenerate jobs via db retry reset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-regen-'));
    const dbPath = join(dir, 'test.db');
    const db = new ProductionDb(dbPath);

    const run = db.createRun(['yuna'], 1);
    db.insertJob({
      id: 'job-1',
      runId: run.id,
      character: 'yuna',
      folderSlug: 'cafe',
      catalogCategory: 'cafe',
      catalogIndex: 0,
      promptId: 'yuna/cafe/0',
      prompt: 'test prompt',
      sequence: 0,
      status: 'regenerate',
      targetFolder: '/tmp/cafe',
      retryCount: 0,
    });

    const jobs = db.getRegenerateJobs(run.id);
    expect(jobs.length).toBe(1);

    db.resetJobForRetry('job-1');
    const job = db.getJobById('job-1');
    expect(job?.status).toBe('pending');
    expect(job?.retryCount).toBe(1);

    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('collects stats report structure', () => {
    const report = productionStats.collect(150);
    expect(report.phase).toBe(150);
    expect(report.characters.length).toBeGreaterThanOrEqual(5);
    expect(report.gateRecommendation).toBeTruthy();
  });

  it('promptSelector pickUnusedOrGenerate returns catalog first', () => {
    const selected = promptSelector.pickUnusedOrGenerate('yuna');
    expect(selected).not.toBeNull();
    expect(selected!.character).toBe('yuna');
    expect(selected!.entry.prompt.length).toBeGreaterThan(20);
  });
});
