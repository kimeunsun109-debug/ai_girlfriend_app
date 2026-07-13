#!/usr/bin/env npx tsx
import 'dotenv/config';
import { assertProductionRuntime } from '../src/config/runtime-environment.config.js';
import { bootstrapPhotoLibrary, printBootstrapReport } from '../src/lib/midjourney-production/index.js';

assertProductionRuntime('mj:init');
const result = bootstrapPhotoLibrary(process.argv.includes('--force'));
printBootstrapReport(result);
