#!/usr/bin/env npx tsx
/**
 * Production readiness checklist
 * npm run mj:ready
 * npm run mj:ready -- --bootstrap   # run mj:init first (Windows only)
 */
import 'dotenv/config';
import {
  runProductionReadyCheck,
  renderProductionReadyReport,
  closeProductionDb,
} from '../src/lib/midjourney-production/index.js';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';

async function main() {
  const bootstrap = process.argv.includes('--bootstrap');

  if (bootstrap) {
    try {
      assertProductionRuntime('mj:ready --bootstrap');
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }

  const report = runProductionReadyCheck(bootstrap);
  console.log(renderProductionReadyReport(report));
  closeProductionDb();
  process.exit(report.ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
