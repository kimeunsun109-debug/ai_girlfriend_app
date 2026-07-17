#!/usr/bin/env npx tsx
import 'dotenv/config';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';

async function main() {
  assertProductionRuntime('mj:queue');
  bootstrapPhotoLibrary();

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const charArg = process.argv.find((a) => a.startsWith('--character='));
  const count = countArg
    ? Number(countArg.split('=')[1])
    : Number(process.env.MJ_PHOTOS_PER_CHARACTER ?? 150);
  const character = charArg?.split('=')[1];
  const characterOrder = character ? [character] : undefined;

  const existing = productionQueue.getActiveRun();
  if (existing && !process.argv.includes('--new')) {
    console.log(`Active run exists: ${existing.id} (${existing.completedJobs}/${existing.totalJobs})`);
    console.log(productionDashboard.renderConsole());
    return;
  }

  console.log(
    character
      ? `Creating production queue: ${count} photos × ${character}\n`
      : `Creating production queue: ${count} photos × 5 characters\n`
  );
  const run = productionQueue.createRun({ photosPerCharacter: count, characterOrder });
  const first = productionQueue.activateNextJob(run.id);

  console.log(`Run ID: ${run.id}`);
  console.log(`Total jobs: ${run.totalJobs}\n`);
  console.log(productionDashboard.renderConsole());

  if (first?.midjourneyCommand) {
    console.log('\n─── Midjourney (copy to Discord) ───\n');
    console.log(first.midjourneyCommand);
    console.log(`\n─── Save download to ───\n${first.targetFolder}`);
    console.log('\nImport watch: npm run mj:pipeline');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeProductionDb());
