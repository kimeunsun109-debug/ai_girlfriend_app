#!/usr/bin/env npx tsx
/**
 * Auto Midjourney generate (no manual copy-paste)
 *
 * Prerequisites (Windows .env):
 *   MJ_PROXY_TOKEN, MJ_DISCORD_TOKEN, MJ_DISCORD_SERVER_ID, MJ_DISCORD_CHANNEL_ID
 *   MJ_CREF_YUNA=https://...  (face reference image URL — CRITICAL for same face)
 *   MJ_FORCE_RELAX=1 (default)
 *   MJ_AUTO_DELAY_MS=120000
 *
 * Run alongside watch:
 *   Terminal A: npm run mj:production
 *   Terminal B: npm run mj:auto -- --character=yuna --limit=150
 *
 * npm run mj:auto -- --dry-run
 * npm run mj:auto -- --character=yuna --limit=5
 */
import 'dotenv/config';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import {
  bootstrapPhotoLibrary,
  closeProductionDb,
  mjAutoGenerator,
} from '../src/lib/midjourney-production/index.js';

async function main() {
  assertProductionRuntime('mj:auto');
  bootstrapPhotoLibrary();

  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const delayArg = process.argv.find((a) => a.startsWith('--delay-ms='));
  const dryRun = process.argv.includes('--dry-run');

  const result = await mjAutoGenerator.run({
    character: charArg?.split('=')[1],
    limit: limitArg ? Number(limitArg.split('=')[1]) : undefined,
    delayMs: delayArg ? Number(delayArg.split('=')[1]) : undefined,
    dryRun,
  });

  console.log('\nResult:', result);
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeProductionDb());
