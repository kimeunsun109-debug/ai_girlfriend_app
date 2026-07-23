#!/usr/bin/env npx tsx
/**
 * Yuna-first Hybrid Factory checkpoint
 *
 * npm run factory:yuna
 * npm run factory:yuna -- --count=10
 * npm run factory:yuna -- --skip-generate
 */
import 'dotenv/config';
import { factoryYunaPhase1 } from '../src/lib/hybrid-factory/index.js';

const countArg = process.argv.find((a) => a.startsWith('--count='));
const skipGenerate = process.argv.includes('--skip-generate');

factoryYunaPhase1({
  generateCount: countArg ? Number(countArg.split('=')[1]) : 5,
  skipGenerate,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
