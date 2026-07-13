import chokidar, { type FSWatcher } from 'chokidar';
import { extname } from 'path';
import { MJ_IMPORT_WATCH_FOLDER } from '../../config/midjourney-production.config.js';
import { UNIVERSE_WATCH_DEBOUNCE_MS } from '../../config/photo-universe.config.js';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { bootstrapPhotoLibrary } from './library-bootstrap.js';
import { ingestPipeline } from './ingest-pipeline.js';
import { productionQueue } from './production-queue.js';

let importWatcher: FSWatcher | null = null;
const pending = new Map<string, NodeJS.Timeout>();

export function startImportWatcher(): FSWatcher {
  bootstrapPhotoLibrary();

  if (importWatcher) return importWatcher;

  importWatcher = chokidar.watch(MJ_IMPORT_WATCH_FOLDER, {
    ignored: [/\.meta\.json$/, /\.reason\.txt$/, /(^|[/\\])\../],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 200 },
  });

  const schedule = (filePath: string) => {
    const ext = extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    const prev = pending.get(filePath);
    if (prev) clearTimeout(prev);

    pending.set(
      filePath,
      setTimeout(async () => {
        pending.delete(filePath);
        try {
          const result = await ingestPipeline.ingestFromImport(filePath);
          console.log(`[mj-import] ${result.action}: ${filePath} — ${result.message}`);
          if (result.photoId) {
            console.log(`  → ${result.photoId} (${result.faceSimilarity}% face)`);
          }
        } catch (err) {
          console.error('[mj-import] error:', filePath, err);
          const run = productionQueue.getActiveRun();
          if (run) {
            productionQueue.recoverStuckJobs(run.id);
            productionQueue.activateNextJob(run.id);
          }
        }
      }, UNIVERSE_WATCH_DEBOUNCE_MS)
    );
  };

  importWatcher.on('add', schedule);
  console.log(`[mj-import] watching ${MJ_IMPORT_WATCH_FOLDER}`);
  return importWatcher;
}

export async function stopImportWatcher(): Promise<void> {
  if (importWatcher) {
    await importWatcher.close();
    importWatcher = null;
  }
  for (const t of pending.values()) clearTimeout(t);
  pending.clear();
}
