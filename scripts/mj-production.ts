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
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import {
  bootstrapPhotoLibrary,
  productionOrchestrator,
  startImportWatcher,
  stopImportWatcher,
  closeProductionDb,
  runProductionReadyCheck,
  renderProductionReadyReport,
} from '../src/lib/midjourney-production/index.js';
import { startUniverseWatcher, stopUniverseWatcher } from '../src/lib/photo-universe/index.js';
import { MJ_PRODUCTION_PHASE } from '../src/config/midjourney-production.config.js';

async function main() {
  assertProductionRuntime('mj:production');

  const phaseArg = process.argv.find((a) => a.startsWith('--phase='));
  const phase = phaseArg ? Number(phaseArg.split('=')[1]) : MJ_PRODUCTION_PHASE;
  const statsOnly = process.argv.includes('--stats');
  const once = process.argv.includes('--once');
  const readyCheck = process.argv.includes('--ready');

  bootstrapPhotoLibrary();

  if (readyCheck) {
    const report = runProductionReadyCheck(false);
    console.log(renderProductionReadyReport(report));
    closeProductionDb();
    process.exit(report.ready ? 0 : 1);
  }

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

  console.log('\n[mj-production] Import watch: Downloads\\PickMeTalk_MJ (상시 감시)');
  console.log('[mj-production] Ingest: Metadata → Thumbnail → Catalog → Face → Quality\n');

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
