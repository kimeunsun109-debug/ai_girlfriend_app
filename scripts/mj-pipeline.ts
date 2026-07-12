#!/usr/bin/env npx tsx
/**
 * Full Midjourney Production Pipeline — bootstrap + queue + import watch + dashboard
 * npm run mj:pipeline -- --count 20
 */
import 'dotenv/config';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  startImportWatcher,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { startUniverseWatcher, stopUniverseWatcher } from '../src/lib/photo-universe/index.js';

async function main() {
  bootstrapPhotoLibrary();

  if (!productionQueue.getActiveRun()) {
    const countArg = process.argv.find((a) => a.startsWith('--count='));
    const count = countArg ? Number(countArg.split('=')[1]) : 20;
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
