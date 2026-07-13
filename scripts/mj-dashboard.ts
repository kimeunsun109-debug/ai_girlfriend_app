#!/usr/bin/env npx tsx
import 'dotenv/config';
import { productionDashboard, closeProductionDb } from '../src/lib/midjourney-production/index.js';

console.log(productionDashboard.renderConsole());

const snap = productionDashboard.getSnapshot();
if (snap.nextJob?.midjourneyCommand) {
  console.log('\n─── Next Midjourney ───\n');
  console.log(snap.nextJob.midjourneyCommand);
}

closeProductionDb();
