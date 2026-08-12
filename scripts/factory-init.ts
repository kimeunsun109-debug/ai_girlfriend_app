#!/usr/bin/env npx tsx
/**
 * Hybrid Factory init — library + master folders
 * npm run factory:init
 */
import 'dotenv/config';
import { factoryInit } from '../src/lib/hybrid-factory/index.js';

factoryInit().catch((e) => {
  console.error(e);
  process.exit(1);
});
