#!/usr/bin/env npx tsx
/**
 * Photo Universe — watch USB library for new Midjourney downloads
 *
 * PHOTO_LIBRARY_ROOT=D:/PickMeTalk_PhotoLibrary npm run universe:watch
 */
import 'dotenv/config';
import { PHOTO_LIBRARY_ROOT } from '../src/config/photo-universe.config.js';
import {
  runInitialScan,
  startUniverseWatcher,
  closeUniverseCatalog,
} from '../src/lib/photo-universe/index.js';

async function main() {
  console.log(`Photo Universe Watcher`);
  console.log(`Library: ${PHOTO_LIBRARY_ROOT}\n`);

  if (!process.argv.includes('--skip-initial-scan')) {
    await runInitialScan();
  }

  startUniverseWatcher();
  console.log('Watching for new images... (Ctrl+C to stop)\n');

  process.on('SIGINT', async () => {
    const { stopUniverseWatcher } = await import('../src/lib/photo-universe/index.js');
    await stopUniverseWatcher();
    closeUniverseCatalog();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
