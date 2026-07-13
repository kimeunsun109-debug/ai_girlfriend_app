#!/usr/bin/env npx tsx
/**
 * PickMeTalk Production Mode — long-term Photo Library growth
 *
 * npm run mj:production
 * npm run mj:production -- --phase=150
 * npm run mj:production -- --stats
 * npm run mj:production -- --once
 */
import 'dotenv/config';
import {
  bootstrapPhotoLibrary,
  productionOrchestrator,
  startImportWatcher,
  stopImportWatcher,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { startUniverseWatcher, stopUniverseWatcher } from '../src/lib/photo-universe/index.js';
import { MJ_PRODUCTION_PHASE } from '../src/config/midjourney-production.config.js';

async function main() {
  const phaseArg = process.argv.find((a) => a.startsWith('--phase='));
  const phase = phaseArg ? Number(phaseArg.split('=')[1]) : MJ_PRODUCTION_PHASE;
  const statsOnly = process.argv.includes('--stats');
  const once = process.argv.includes('--once');

  bootstrapPhotoLibrary();

  if (statsOnly) {
    const tick = productionOrchestrator.tick(phase);
    console.log(productionOrchestrator.renderStatus());
    console.log(`Recommended next phase: ${productionOrchestrator.recommendNextPhase()}`);
    closeProductionDb();
    return;
  }

  const tick = productionOrchestrator.tick(phase);
  console.log(productionOrchestrator.renderStatus());
  console.log(`Tick: +${tick.topUpAdded} jobs, ${tick.regenProcessed} regen, ${tick.stuckRecovered} recovered`);
  console.log(`Recommended next phase: ${productionOrchestrator.recommendNextPhase()}`);

  if (once) {
    closeProductionDb();
    return;
  }

  startImportWatcher();
  startUniverseWatcher();

  const interval = setInterval(() => {
    const result = productionOrchestrator.tick(phase);
    console.log(productionOrchestrator.renderStatus());
    if (result.topUpAdded > 0 || result.regenProcessed > 0) {
      console.log(`Tick: +${result.topUpAdded} jobs, ${result.regenProcessed} regen`);
    }
  }, 60_000);

  process.on('SIGINT', async () => {
    clearInterval(interval);
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
