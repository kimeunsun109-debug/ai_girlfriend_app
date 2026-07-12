import { randomUUID } from 'crypto';
import { join } from 'path';
import {
  MJ_CHARACTER_ORDER,
  MJ_PHOTOS_PER_CHARACTER,
  folderForPromptCategory,
} from '../../config/midjourney-production.config.js';
import { PHOTO_LIBRARY_ROOT } from '../../config/photo-universe.config.js';
import { MIDJOURNEY_IDENTITY_SUFFIX } from '../../config/photo-universe.config.js';
import { getCharacterSpecBySlug } from '../../data/character-specs.js';
import { prepareMidjourneyPrompt } from '../photo-universe/midjourney-workflow.js';
import { getProductionDb, type ProductionQueueJob, type ProductionRun } from './production-db.js';
import { buildPromptId, promptSelector } from './prompt-selector.js';

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
    let sequence = 0;
    let totalJobs = 0;

    for (const character of characterOrder) {
      for (let i = 0; i < photosPerCharacter; i++) {
        const selected = promptSelector.pickUnused(character);
        if (!selected) {
          console.warn(`No unused prompts left for ${character} at slot ${i + 1}`);
          continue;
        }

        const folderSlug = folderForPromptCategory(selected.catalogCategory);
        const targetFolder = join(PHOTO_LIBRARY_ROOT, character, folderSlug).replace(/\\/g, '/');
        const mj = prepareMidjourneyPrompt({
          characterSlug: character,
          category: folderSlug,
          useCatalog: false,
          seed: selected.catalogIndex + sequence,
        });

        const spec = getCharacterSpecBySlug(character);
        const identityNote = spec
          ? `Same person ${spec.name}: ${spec.identity.faceShape}, ${spec.identity.baseHairstyle}.`
          : '';
        const fullPrompt = `${selected.entry.prompt}. ${identityNote}`;
        const midjourneyCommand = `/imagine prompt: ${fullPrompt} --no ${selected.entry.negativePrompt} ${MIDJOURNEY_IDENTITY_SUFFIX}`;

        const jobId = randomUUID();
        const promptId = buildPromptId(character, selected.catalogCategory, selected.catalogIndex);

        db.insertJob({
          id: jobId,
          runId: run.id,
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
        });

        db.markPromptUsed(
          character,
          selected.catalogCategory,
          selected.catalogIndex,
          selected.promptHash,
          jobId
        );
        totalJobs++;
      }
    }

    db.setRunTotalJobs(run.id, totalJobs);
    db.updateRunStatus(run.id, 'running');
    return db.getRun(run.id)!;
  }

  /** Advance queue — mark next job as awaiting Midjourney import */
  activateNextJob(runId: string): ProductionQueueJob | null {
    const db = getProductionDb();
    const job = db.getNextPendingJob(runId);
    if (!job) return null;

    db.updateJobStatus(job.id, 'prompt_ready');
    db.updateJobStatus(job.id, 'awaiting_import');
    return db.getJobById(job.id);
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
  }

  failJob(jobId: string, message: string, regenerate = false): void {
    getProductionDb().updateJobStatus(jobId, regenerate ? 'regenerate' : 'failed', {
      errorMessage: message,
    });
  }
}

export const productionQueue = new ProductionQueue();
