import { randomUUID } from 'crypto';
import { join } from 'path';
import {
  MJ_CHARACTER_ORDER,
  MJ_PHOTOS_PER_CHARACTER,
  MJ_PRODUCTION_MAX_RETRIES,
  MJ_PRODUCTION_AUTO_REGEN,
  MJ_DYNAMIC_CATALOG_CATEGORY,
  folderForPromptCategory,
} from '../../config/midjourney-production.config.js';
import { PHOTO_LIBRARY_ROOT } from '../../config/photo-universe.config.js';
import { MIDJOURNEY_IDENTITY_SUFFIX } from '../../config/photo-universe.config.js';
import { getCharacterSpecBySlug } from '../../data/character-specs.js';
import { getProductionDb, type ProductionQueueJob, type ProductionRun } from './production-db.js';
import { buildPromptId, promptSelector } from './prompt-selector.js';
import { logProduction } from './production-logger.js';

function buildMidjourneyCommand(
  character: string,
  prompt: string,
  negativePrompt: string
): string {
  const spec = getCharacterSpecBySlug(character);
  const identityNote = spec
    ? `Same person ${spec.name}: ${spec.identity.faceShape}, ${spec.identity.baseHairstyle}.`
    : '';
  const fullPrompt = `${prompt}. ${identityNote}`;
  return `/imagine prompt: ${fullPrompt} --no ${negativePrompt} ${MIDJOURNEY_IDENTITY_SUFFIX}`;
}

export class ProductionQueue {
  /** Create a new production run and populate queue jobs for all characters */
  createRun(options?: {
    photosPerCharacter?: number;
    characterOrder?: string[];
  }): ProductionRun {
    const db = getProductionDb();
    const photosPerCharacter = options?.photosPerCharacter ?? MJ_PHOTOS_PER_CHARACTER;
    const characterOrder = options?.characterOrder ?? [...MJ_CHARACTER_ORDER];

    const run = db.createRun(characterOrder, photosPerCharacter);
    let sequence = db.listJobsForRun(run.id).length;
    let totalJobs = sequence;

    for (const character of characterOrder) {
      const added = this.enqueueJobsForCharacter(run.id, character, photosPerCharacter, sequence);
      sequence += added;
      totalJobs += added;
    }

    db.setRunTotalJobs(run.id, totalJobs);
    db.updateRunStatus(run.id, 'running');
    logProduction({
      level: 'info',
      event: 'run_created',
      message: `Run ${run.id.slice(0, 8)} with ${totalJobs} jobs (${photosPerCharacter}/character)`,
      meta: { characterOrder, photosPerCharacter },
    });
    return db.getRun(run.id)!;
  }

  /** Top up queue when library growth target not yet met */
  topUpRun(runId: string, targetPerCharacter?: number): number {
    const db = getProductionDb();
    const run = db.getRun(runId);
    if (!run) return 0;

    const target = targetPerCharacter ?? run.photosPerCharacter;
    let added = 0;
    let sequence = db.listJobsForRun(runId).length;

    for (const character of run.characterOrder) {
      const counts = db.countCharacterJobs(runId, character);
      const need = Math.max(0, target - counts.completed - counts.active);
      if (need <= 0) continue;
      const n = this.enqueueJobsForCharacter(runId, character, need, sequence);
      sequence += n;
      added += n;
    }

    if (added > 0) {
      db.setRunTotalJobs(runId, run.totalJobs + added);
      logProduction({
        level: 'info',
        event: 'queue_topup',
        message: `Added ${added} jobs to run ${runId.slice(0, 8)}`,
      });
    }
    return added;
  }

  private enqueueJobsForCharacter(
    runId: string,
    character: string,
    count: number,
    startSequence: number
  ): number {
    const db = getProductionDb();
    let sequence = startSequence;
    let inserted = 0;

    for (let i = 0; i < count; i++) {
      const selected = promptSelector.pickUnusedOrGenerate(character);
      if (!selected) {
        logProduction({
          level: 'warn',
          event: 'prompt_exhausted',
          character,
          message: `No prompts available at slot ${i + 1}`,
        });
        continue;
      }

      const folderSlug =
        selected.catalogCategory === MJ_DYNAMIC_CATALOG_CATEGORY
          ? folderForPromptCategory(selected.entry.category)
          : folderForPromptCategory(selected.catalogCategory);
      const targetFolder = join(PHOTO_LIBRARY_ROOT, character, folderSlug).replace(/\\/g, '/');

      const jobId = randomUUID();
      const promptId = buildPromptId(character, selected.catalogCategory, selected.catalogIndex);
      const midjourneyCommand = buildMidjourneyCommand(
        character,
        selected.entry.prompt,
        selected.entry.negativePrompt
      );

      db.insertJob({
        id: jobId,
        runId,
        character,
        folderSlug,
        catalogCategory: selected.catalogCategory,
        catalogIndex: selected.catalogIndex,
        promptId,
        prompt: selected.entry.prompt,
        negativePrompt: selected.entry.negativePrompt,
        sequence: sequence++,
        status: 'pending',
        targetFolder,
        midjourneyCommand,
        promptSource: selected.source ?? 'catalog',
      });

      db.markPromptUsed(
        character,
        selected.catalogCategory,
        selected.catalogIndex,
        selected.promptHash,
        jobId
      );
      inserted++;
    }

    return inserted;
  }

  /** Re-queue jobs marked regenerate (within retry limit) */
  processRegenerationQueue(runId: string): number {
    if (!MJ_PRODUCTION_AUTO_REGEN) return 0;
    const db = getProductionDb();
    const jobs = db.getRegenerateJobs(runId);
    let requeued = 0;

    for (const job of jobs) {
      if ((job.retryCount ?? 0) >= MJ_PRODUCTION_MAX_RETRIES) {
        db.updateJobStatus(job.id, 'failed', {
          errorMessage: `max_retries_exceeded: ${job.errorMessage ?? ''}`,
        });
        logProduction({
          level: 'error',
          event: 'regen_max_retries',
          character: job.character,
          jobId: job.id,
          message: job.errorMessage ?? 'max retries',
        });
        continue;
      }
      db.resetJobForRetry(job.id);
      requeued++;
      logProduction({
        level: 'info',
        event: 'regen_requeued',
        character: job.character,
        jobId: job.id,
        message: `Retry ${(job.retryCount ?? 0) + 1}/${MJ_PRODUCTION_MAX_RETRIES}`,
      });
    }
    return requeued;
  }

  recoverStuckJobs(runId: string): number {
    const db = getProductionDb();
    const stuck = db.resetStuckIngestingJobs(runId);
    if (stuck > 0) {
      logProduction({
        level: 'warn',
        event: 'stuck_recovered',
        message: `Reset ${stuck} ingesting jobs to awaiting_import`,
        meta: { runId },
      });
    }
    return stuck;
  }

  /** Advance queue — mark next job as awaiting Midjourney import */
  activateNextJob(runId: string): ProductionQueueJob | null {
    const db = getProductionDb();
    this.processRegenerationQueue(runId);

    const awaiting = db.getAwaitingImportJob(runId);
    if (awaiting) return awaiting;

    const job = db.getNextPendingJob(runId);
    if (!job) return null;

    if (job.status === 'regenerate') {
      db.resetJobForRetry(job.id);
    }

    const fresh = db.getJobById(job.id);
    if (!fresh) return null;

    db.updateJobStatus(fresh.id, 'prompt_ready');
    db.updateJobStatus(fresh.id, 'awaiting_import');
    return db.getJobById(fresh.id);
  }

  getActiveRun(): ProductionRun | null {
    return getProductionDb().getActiveRun();
  }

  getRun(runId: string): ProductionRun | null {
    return getProductionDb().getRun(runId);
  }

  completeJob(jobId: string, photoId: string): void {
    const db = getProductionDb();
    const job = db.getJobById(jobId);
    if (!job) return;
    db.updateJobStatus(jobId, 'completed', { ingestedPhotoId: photoId });
    db.incrementCompletedJobs(job.runId);
    logProduction({
      level: 'info',
      event: 'job_completed',
      character: job.character,
      jobId,
      message: photoId,
    });
  }

  failJob(jobId: string, message: string, regenerate = false): void {
    const db = getProductionDb();
    const job = db.getJobById(jobId);
    if (!job) return;

    if (regenerate && (job.retryCount ?? 0) < MJ_PRODUCTION_MAX_RETRIES) {
      db.updateJobStatus(jobId, 'regenerate', { errorMessage: message });
      logProduction({
        level: 'warn',
        event: 'job_regenerate',
        character: job.character,
        jobId,
        message,
      });
    } else {
      db.updateJobStatus(jobId, 'failed', { errorMessage: message });
      logProduction({
        level: regenerate ? 'error' : 'warn',
        event: 'job_failed',
        character: job.character,
        jobId,
        message,
      });
    }
  }

  advanceAfterFailure(runId: string): void {
    this.activateNextJob(runId);
  }
}

export const productionQueue = new ProductionQueue();
