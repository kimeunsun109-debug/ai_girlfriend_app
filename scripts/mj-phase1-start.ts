#!/usr/bin/env npx tsx
/**
 * Phase 1 Production Start — Yuna 150 first (recommended)
 *
 * npm run mj:phase1
 * npm run mj:phase1 -- --all     # all 5 characters × 150 (=750)
 * npm run mj:phase1 -- --count=150 --character=narin
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import {
  bootstrapPhotoLibrary,
  runProductionReadyCheck,
  renderProductionReadyReport,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../src/config/photo-universe.config.js';

function parseArgs() {
  const all = process.argv.includes('--all');
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const count = countArg ? Number(countArg.split('=')[1]) : 150;
  const character = all ? undefined : charArg?.split('=')[1] ?? 'yuna';
  return { count, character, all, skipWatch: process.argv.includes('--no-watch') };
}

function runNodeScript(scriptRel: string, extraArgs: string[]): number {
  const result = spawnSync('npx', ['tsx', scriptRel, ...extraArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, PICKMETALK_RUNTIME: 'production' },
    shell: true,
  });
  return result.status ?? 1;
}

async function main() {
  assertProductionRuntime('mj:phase1');

  const { count, character, all, skipWatch } = parseArgs();

  console.log('\n══════════════════════════════════════════════════');
  console.log('  PickMeTalk Photo Production — Phase 1 Start');
  console.log('══════════════════════════════════════════════════\n');
  console.log(
    all
      ? `Mode: ALL characters × ${count} (total ${count * 5})`
      : `Mode: ${character} × ${count} (Yuna-first recommended)`
  );
  console.log('');

  // 1) Bootstrap + Ready
  bootstrapPhotoLibrary();
  const report = runProductionReadyCheck(false);
  console.log(renderProductionReadyReport(report));

  if (!report.ready) {
    console.error('NOT READY — fix ✗ items above, then re-run npm run mj:phase1');
    closeProductionDb();
    process.exit(1);
  }

  console.log('Production Ready\n');
  closeProductionDb();

  // 2) Queue + Manifest
  const manifestArgs = [
    `--count=${count}`,
    '--new',
    ...(all ? [] : [`--character=${character}`]),
  ];
  const manifestScript = join('scripts', 'mj-characters-manifest.ts');
  const code = runNodeScript(manifestScript, manifestArgs);
  if (code !== 0) process.exit(code);

  const slug = all ? 'all' : character!;
  const discordDir = all
    ? join(PHOTO_UNIVERSE_DATA_ROOT, 'characters-manifest')
    : join(PHOTO_UNIVERSE_DATA_ROOT, 'characters-manifest', slug, 'discord');

  console.log('\n══════════════════════════════════════════════════');
  console.log('  Phase 1 Queue + Manifest READY');
  console.log('══════════════════════════════════════════════════');
  console.log(`Manifest: ${existsSync(discordDir) ? discordDir : PHOTO_UNIVERSE_DATA_ROOT + '/characters-manifest'}`);
  console.log('');
  console.log('Next (human):');
  console.log('  1. Open discord/*.md files (YUNA_001.md …)');
  console.log('  2. Paste /imagine into Discord Midjourney');
  console.log('  3. Save downloads to Downloads\\PickMeTalk_MJ');
  console.log('');

  if (skipWatch) {
    console.log('Watch skipped (--no-watch). Start later: npm run mj:production');
    return;
  }

  console.log('Starting Watch Folder (mj:production)…\n');
  const prod = spawnSync(
    'npm',
    ['run', 'mj:production'],
    { stdio: 'inherit', cwd: process.cwd(), env: process.env, shell: true }
  );
  process.exit(prod.status ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
