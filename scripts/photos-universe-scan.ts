#!/usr/bin/env npx tsx
/**
 * Photo Universe — scan external USB library
 *
 * PHOTO_LIBRARY_ROOT=D:/PickMeTalk_PhotoLibrary npm run universe:scan
 */
import 'dotenv/config';
import { PHOTO_LIBRARY_ROOT } from '../src/config/photo-universe.config.js';
import { universeScanner, printScanReport, closeUniverseCatalog } from '../src/lib/photo-universe/index.js';

async function main() {
  const full = process.argv.includes('--full');
  console.log(`Scanning Photo Universe: ${PHOTO_LIBRARY_ROOT}${full ? ' (full rescan)' : ''}\n`);
  const stats = await universeScanner.scanLibrary({ full });
  printScanReport(stats);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeUniverseCatalog());
