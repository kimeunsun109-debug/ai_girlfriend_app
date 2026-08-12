#!/usr/bin/env npx tsx
/** npm run factory:profile -- --character=yuna */
import 'dotenv/config';
import { factoryBuildProfile } from '../src/lib/hybrid-factory/index.js';
import { bootstrapPhotoLibrary } from '../src/lib/midjourney-production/index.js';

const character =
  process.argv.find((a) => a.startsWith('--character='))?.split('=')[1] ?? 'yuna';

bootstrapPhotoLibrary();
factoryBuildProfile(character).catch((e) => {
  console.error(e);
  process.exit(1);
});
