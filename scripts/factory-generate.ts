#!/usr/bin/env npx tsx
/**
 * Local RTX mass production
 * npm run factory:generate -- --character=yuna --count=150
 * FACTORY_ENGINE=comfyui npm run factory:generate -- --character=yuna --count=10
 */
import 'dotenv/config';
import { factoryGenerate } from '../src/lib/hybrid-factory/index.js';
import { bootstrapPhotoLibrary } from '../src/lib/midjourney-production/index.js';

const character =
  process.argv.find((a) => a.startsWith('--character='))?.split('=')[1] ?? 'yuna';
const count = Number(
  process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] ?? 10
);

bootstrapPhotoLibrary();
factoryGenerate(character, count).catch((e) => {
  console.error(e);
  process.exit(1);
});
