#!/usr/bin/env npx tsx
import 'dotenv/config';
import { bootstrapPhotoLibrary, printBootstrapReport } from '../src/lib/midjourney-production/index.js';

const result = bootstrapPhotoLibrary(process.argv.includes('--force'));
printBootstrapReport(result);
