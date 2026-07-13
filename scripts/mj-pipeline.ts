#!/usr/bin/env npx tsx
import 'dotenv/config';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  startImportWatcher,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { startUniverseWatcher, stopUniverseWatcher } from '../src/lib/photo-universe/index.js';
import { MJ_PRODUCTION_PHASE } from '../src/config/midjourney-production.config.js';

async function main() {
  assertProductionRuntime('mj:pipeline');
  bootstrapPhotoLibrary();

  if (!productionQueue.getActiveRun()) {
    const countArg = process.argv.find((a) => a.startsWith('--count='));
    const count = countArg ? Number(countArg.split('=')[1]) : MJ_PRODUCTION_PHASE;
    const run = productionQueue.createRun({ photosPerCharacter: count });
    productionQueue.activateNextJob(run.id);
    console.log(`Created run ${run.id} (${run.totalJobs} jobs)\n`);
  }

  startImportWatcher();
  startUniverseWatcher();

  console.log(productionDashboard.renderConsole());

  const interval = setInterval(() => {
    console.log(productionDashboard.renderConsole());
  }, 30_000);

  process.on('SIGINT', async () => {
    clearInterval(interval);
    const { stopImportWatcher } = await import('../src/lib/midjourney-production/index.js');
    await stopImportWatcher();
    await stopUniverseWatcher();
    closeProductionDb();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
