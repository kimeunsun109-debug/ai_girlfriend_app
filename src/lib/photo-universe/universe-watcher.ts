import chokidar, { type FSWatcher } from 'chokidar';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PHOTO_LIBRARY_ROOT, UNIVERSE_WATCH_DEBOUNCE_MS } from '../../config/photo-universe.config.js';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import { ensureUniverseDirs, isLibraryAvailable } from './paths.js';
import { printScanReport, universeScanner } from './universe-scanner.js';

interface WatchState {
  lastScanAt?: string;
  watchedPaths: string[];
}

let watcher: FSWatcher | null = null;
const pending = new Map<string, NodeJS.Timeout>();

export async function runInitialScan(): Promise<void> {
  const stats = await universeScanner.scanLibrary();
  printScanReport(stats);
  saveWatchState({ lastScanAt: new Date().toISOString(), watchedPaths: [PHOTO_LIBRARY_ROOT] });
}

export function startUniverseWatcher(): FSWatcher | null {
  if (!isLibraryAvailable()) {
    console.warn(`Cannot watch — library missing: ${PHOTO_LIBRARY_ROOT}`);
    return null;
  }

  ensureUniverseDirs();
  if (watcher) return watcher;

  watcher = chokidar.watch(PHOTO_LIBRARY_ROOT, {
    ignored: [
      /(^|[/\\])\../,
      /\.meta\.json$/,
      /\.photo\.json$/,
      /photos-index\.json$/,
      /[\\/]cache[\\/]/,
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 200 },
    depth: 99,
  });

  const schedule = (path: string) => {
    const ext = extname(path).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    const prev = pending.get(path);
    if (prev) clearTimeout(prev);

    pending.set(
      path,
      setTimeout(async () => {
        pending.delete(path);
        try {
          const result = await universeScanner.ingestFile(path);
          if (result === 'registered') {
            console.log(`[universe] registered: ${path}`);
          } else if (result === 'rejected') {
            console.log(`[universe] rejected: ${path}`);
          }
        } catch (err) {
          console.error('[universe] ingest error:', path, err);
        }
      }, UNIVERSE_WATCH_DEBOUNCE_MS)
    );
  };

  watcher.on('add', schedule);
  watcher.on('change', schedule);

  console.log(`[universe] watching ${PHOTO_LIBRARY_ROOT}`);
  saveWatchState({ lastScanAt: loadWatchState().lastScanAt, watchedPaths: [PHOTO_LIBRARY_ROOT] });
  return watcher;
}

export async function stopUniverseWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  for (const t of pending.values()) clearTimeout(t);
  pending.clear();
}

function loadWatchState(): WatchState {
  if (!existsSync(PHOTO_UNIVERSE_PATHS.watchState)) {
    return { watchedPaths: [] };
  }
  try {
    return JSON.parse(readFileSync(PHOTO_UNIVERSE_PATHS.watchState, 'utf-8'));
  } catch {
    return { watchedPaths: [] };
  }
}

function saveWatchState(state: WatchState): void {
  writeFileSync(PHOTO_UNIVERSE_PATHS.watchState, JSON.stringify(state, null, 2), 'utf-8');
}
