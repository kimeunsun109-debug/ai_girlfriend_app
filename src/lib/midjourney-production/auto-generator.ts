/**
 * Auto Midjourney generator — queue → proxy imagine → download → watch folder.
 * Face consistency: identity lock + optional --cref; QA via ingest pipeline.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MJ_IMPORT_WATCH_FOLDER } from '../../config/midjourney-production.config.js';
import { PHOTO_UNIVERSE_DATA_ROOT } from '../../config/photo-universe.config.js';
import { getProductionDb } from './production-db.js';
import { productionQueue } from './production-queue.js';
import { productionDashboard } from './production-dashboard.js';
import { productionStats } from './production-stats.js';
import { logProduction } from './production-logger.js';
import {
  mjProxyClient,
  sleep,
  stripImaginePrefix,
  watchFolderPath,
} from './mj-proxy-client.js';

export interface AutoGenerateOptions {
  character?: string;
  limit?: number;
  /** Delay between job submissions (rate limit). Default 120s for --relax */
  delayMs?: number;
  dryRun?: boolean;
}

export interface AutoGenerateResult {
  submitted: number;
  downloaded: number;
  failed: number;
  skipped: number;
}

function ensureProxyConfigured(): void {
  const missing = [
    'MJ_PROXY_TOKEN',
    'MJ_DISCORD_TOKEN',
    'MJ_DISCORD_SERVER_ID',
    'MJ_DISCORD_CHANNEL_ID',
  ].filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `Midjourney auto-generate requires env: ${missing.join(', ')}\n` +
        `See docs/MJ_AUTO_GENERATE.md — Cloud Agent cannot log into Discord for you.`
    );
  }
}

function statePath(): string {
  return join(PHOTO_UNIVERSE_DATA_ROOT, 'auto-generate-state.json');
}

function loadDoneSet(): Set<string> {
  const p = statePath();
  if (!existsSync(p)) return new Set();
  try {
    const data = JSON.parse(readFileSync(p, 'utf-8')) as { doneJobIds?: string[] };
    return new Set(data.doneJobIds ?? []);
  } catch {
    return new Set();
  }
}

function saveDoneSet(done: Set<string>): void {
  mkdirSync(PHOTO_UNIVERSE_DATA_ROOT, { recursive: true });
  writeFileSync(
    statePath(),
    JSON.stringify({ doneJobIds: [...done], updatedAt: new Date().toISOString() }, null, 2)
  );
}

export class MjAutoGenerator {
  async run(options: AutoGenerateOptions = {}): Promise<AutoGenerateResult> {
    if (!options.dryRun) ensureProxyConfigured();

    const watchDir = watchFolderPath() || MJ_IMPORT_WATCH_FOLDER;
    mkdirSync(watchDir, { recursive: true });

    const run = productionQueue.getActiveRun();
    if (!run) {
      throw new Error('No active production run — create queue first (npm run mj:phase1 -- --no-watch)');
    }

    const db = getProductionDb();
    let jobs = db
      .listJobsForRun(run.id)
      .filter((j) => j.status === 'awaiting_import' || j.status === 'prompt_ready' || j.status === 'pending' || j.status === 'regenerate');

    if (options.character) {
      jobs = jobs.filter((j) => j.character === options.character);
    }
    if (options.limit && options.limit > 0) {
      jobs = jobs.slice(0, options.limit);
    }

    const delayMs =
      options.delayMs ??
      Number(process.env.MJ_AUTO_DELAY_MS ?? 120_000); /* 2 min default — relax + anti-spam */

    const done = loadDoneSet();
    const result: AutoGenerateResult = { submitted: 0, downloaded: 0, failed: 0, skipped: 0 };

    console.log(`\n[mj-auto] Run ${run.id.slice(0, 8)}… jobs=${jobs.length} delay=${delayMs}ms watch=${watchDir}`);
    console.log('[mj-auto] Mode: --relax preferred | Face lock: identity + MJ_CREF_*\n');
    console.log(productionDashboard.renderConsole());

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]!;
      if (done.has(job.id)) {
        result.skipped += 1;
        continue;
      }

      const command = job.midjourneyCommand || '';
      const prompt = stripImaginePrefix(command);
      if (!prompt) {
        console.warn(`[mj-auto] skip empty prompt job ${job.id}`);
        result.skipped += 1;
        continue;
      }

      console.log(
        `\n[${i + 1}/${jobs.length}] ${job.character} → ${job.folderSlug} (${job.id.slice(0, 8)}…)`
      );

      if (options.dryRun) {
        console.log(`[dry-run] ${command.slice(0, 120)}…`);
        result.submitted += 1;
        continue;
      }

      try {
        db.updateJobStatus(job.id, 'awaiting_import');
        const submitted = await mjProxyClient.imagine({
          prompt: command,
          rawPrompt: prompt,
          replyRef: job.id,
        });
        result.submitted += 1;
        logProduction({
          level: 'info',
          event: 'mj_auto_submitted',
          character: job.character,
          jobId: job.id,
          message: submitted.jobId,
        });

        console.log(`[mj-auto] waiting job ${submitted.jobId}…`);
        const finished = await mjProxyClient.waitForJob(submitted.jobId);
        if (finished.status !== 'completed' || !finished.imageUrls?.length) {
          throw new Error(finished.error || 'no image urls');
        }

        // Prefer first attachment (grid or upscale depending on proxy)
        const url = finished.imageUrls[0]!;
        const ext = url.includes('.webp') ? '.webp' : url.includes('.jpg') ? '.jpg' : '.png';
        const dest = join(watchDir, `${job.character}_${job.id.slice(0, 8)}_${Date.now()}${ext}`);
        await mjProxyClient.downloadToFile(url, dest);
        console.log(`[mj-auto] downloaded → ${dest}`);
        result.downloaded += 1;

        done.add(job.id);
        saveDoneSet(done);

        // Give import watcher / manual ingest time; production watch picks up file
        await sleep(Math.min(delayMs, 5000));
      } catch (err) {
        result.failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[mj-auto] FAILED: ${message}`);
        logProduction({
          level: 'error',
          event: 'mj_auto_failed',
          character: job.character,
          jobId: job.id,
          message,
        });
        productionQueue.failJob(job.id, `auto_generate: ${message}`, true);
      }

      if (i < jobs.length - 1 && !options.dryRun) {
        console.log(`[mj-auto] rate-limit sleep ${Math.round(delayMs / 1000)}s (relax / anti-spam)…`);
        await sleep(delayMs);
      }
    }

    console.log('\n' + productionDashboard.renderConsole());
    console.log(productionStats.renderConsole(productionStats.collect()));
    console.log(
      `[mj-auto] done submitted=${result.submitted} downloaded=${result.downloaded} failed=${result.failed} skipped=${result.skipped}`
    );
    return result;
  }

  /** Count discord manifest md files for reporting */
  countManifestFiles(character = 'yuna'): number {
    const dir = join(PHOTO_UNIVERSE_DATA_ROOT, 'characters-manifest', character, 'discord');
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter((f) => f.endsWith('.md')).length;
  }
}

export const mjAutoGenerator = new MjAutoGenerator();
