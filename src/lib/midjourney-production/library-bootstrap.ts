import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  MJ_CHARACTER_ORDER,
  MJ_IMPORT_WATCH_FOLDER,
  MJ_LIBRARY_FOLDERS,
  MJ_PRODUCTION_PATHS,
} from '../../config/midjourney-production.config.js';
import { PHOTO_LIBRARY_ROOT, MIDJOURNEY_INBOX_FOLDER } from '../../config/photo-universe.config.js';
import {
  assertProductionRuntime,
  IS_WINDOWS,
  PICKMETALK_RUNTIME,
  validateNoHybridPath,
} from '../../config/runtime-environment.config.js';
import { ensureUniverseDirs } from '../photo-universe/paths.js';

export interface BootstrapResult {
  runtime: typeof PICKMETALK_RUNTIME;
  libraryRoot: string;
  importWatchFolder: string;
  charactersCreated: string[];
  foldersCreated: number;
  alreadyExisted: boolean;
}

/**
 * Bootstrap Photo Library folder structure.
 *
 * Production (Windows): D:\PickMeTalk_PhotoLibrary\{yuna|narin|yunseo|eunha|jiyu}\{categories}
 * Test (Cloud/Linux):   test-fixtures/photo-library\{character}\{categories}
 */
export function bootstrapPhotoLibrary(force = false): BootstrapResult {
  if (PICKMETALK_RUNTIME === 'production') {
    assertProductionRuntime('mj:init / bootstrapPhotoLibrary');
  }

  validateNoHybridPath(PHOTO_LIBRARY_ROOT, 'PHOTO_LIBRARY_ROOT');
  validateNoHybridPath(MJ_IMPORT_WATCH_FOLDER, 'MJ_IMPORT_WATCH_FOLDER');

  ensureUniverseDirs();
  mkdirSync(MJ_PRODUCTION_PATHS.faceRefs, { recursive: true });
  mkdirSync(MJ_PRODUCTION_PATHS.importProcessed, { recursive: true });
  mkdirSync(MJ_PRODUCTION_PATHS.review, { recursive: true });
  mkdirSync(MJ_IMPORT_WATCH_FOLDER, { recursive: true });

  const libraryExisted = existsSync(PHOTO_LIBRARY_ROOT);
  mkdirSync(PHOTO_LIBRARY_ROOT, { recursive: true });
  mkdirSync(join(PHOTO_LIBRARY_ROOT, MIDJOURNEY_INBOX_FOLDER), { recursive: true });

  let foldersCreated = 0;
  const charactersCreated: string[] = [];

  for (const slug of MJ_CHARACTER_ORDER) {
    charactersCreated.push(slug);
    mkdirSync(join(MJ_PRODUCTION_PATHS.faceRefs, slug), { recursive: true });

    for (const folder of MJ_LIBRARY_FOLDERS) {
      const path = join(PHOTO_LIBRARY_ROOT, slug, folder);
      if (!existsSync(path) || force) {
        mkdirSync(path, { recursive: true });
        foldersCreated++;
      }
    }
  }

  return {
    runtime: PICKMETALK_RUNTIME,
    libraryRoot: PHOTO_LIBRARY_ROOT,
    importWatchFolder: MJ_IMPORT_WATCH_FOLDER,
    charactersCreated,
    foldersCreated,
    alreadyExisted: libraryExisted,
  };
}

export function printBootstrapReport(result: BootstrapResult): void {
  console.log('\n====================================');
  console.log('PickMeTalk Photo Library Bootstrap');
  console.log('====================================\n');
  console.log(`Runtime      : ${result.runtime}${IS_WINDOWS ? ' (Windows)' : ` (${process.platform})`}`);
  console.log(`Library root : ${result.libraryRoot}`);
  console.log(`Import watch : ${result.importWatchFolder}`);
  console.log(`Characters   : ${result.charactersCreated.join(', ')}`);
  console.log(`Categories   : ${MJ_LIBRARY_FOLDERS.filter((f) => !f.startsWith('_')).join(', ')}`);
  console.log(`Folders      : ${result.foldersCreated} created`);
  console.log(result.alreadyExisted ? '(library existed — missing folders added)' : '(fresh install)');

  if (PICKMETALK_RUNTIME === 'production') {
    console.log('\n✓ Production paths active (Windows D:\\PickMeTalk_PhotoLibrary)');
  } else {
    console.log('\n✓ Test runtime — using test-fixtures (Cloud/Linux safe)');
  }
  console.log('====================================\n');
}
