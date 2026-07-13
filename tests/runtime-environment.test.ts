import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('production-ready (test runtime)', () => {
  it('collectProductionReadyChecks runs without error in test mode', async () => {
    process.env.PICKMETALK_RUNTIME = 'test';
    const { collectProductionReadyChecks } = await import(
      '../src/lib/midjourney-production/production-ready.js'
    );
    const report = collectProductionReadyChecks();
    expect(report.checks.length).toBeGreaterThan(5);
    expect(report.runtime).toBe('test');
    const pathCheck = report.checks.find((c) => c.id === 'library_path');
    expect(pathCheck?.detail).not.toContain('/D:/');
  });

  it('assertProductionRuntime throws on non-Windows production', async () => {
    if (process.platform === 'win32') return;
    const { assertProductionRuntime } = await import(
      '../src/config/runtime-environment.config.js'
    );
    process.env.PICKMETALK_RUNTIME = 'production';
    expect(() => assertProductionRuntime('test')).toThrow(/requires Windows/);
  });
});

describe('runtime path separation', () => {
  it('production path is D:\\PickMeTalk_PhotoLibrary string on any OS', async () => {
    const { WINDOWS_LIBRARY_ROOT } = await import(
      '../src/config/runtime-environment.config.js'
    );
    expect(WINDOWS_LIBRARY_ROOT).toBe('D:\\PickMeTalk_PhotoLibrary');
    expect(WINDOWS_LIBRARY_ROOT).not.toContain(process.cwd());
  });
});
