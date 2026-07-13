import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { hashFileContent } from '../photo-catalog/image-validator.js';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import {
  MJ_PRODUCTION_CONTINUE_ON_ERROR,
  MJ_PRODUCTION_PATHS,
} from '../../config/midjourney-production.config.js';
import { getUniverseCatalog } from '../photo-universe/catalog-db.js';
import { inspectImageQuality } from '../photo-universe/quality-inspector.js';
import { generateThumbnail, writeSidecarMeta } from '../photo-universe/thumbnail-service.js';
import { libraryRelativePath } from '../photo-universe/paths.js';
import type { UniversePhotoMeta } from '../photo-universe/types.js';
import { getProductionDb } from './production-db.js';
import { faceVerifier } from './face-verifier.js';
import { inspectExtendedQuality } from './quality-extended.js';
import { productionQueue } from './production-queue.js';
import { logProduction } from './production-logger.js';
import type { ProductionQueueJob } from './production-db.js';

export interface IngestResult {
  ok: boolean;
  action: 'registered' | 'review' | 'rejected' | 'duplicate' | 'skipped' | 'error';
  photoId?: string;
  relativePath?: string;
  faceSimilarity?: number;
  message: string;
}

export class IngestPipeline {
  async ingestFromImport(
    sourcePath: string,
    job?: ProductionQueueJob | null
  ): Promise<IngestResult> {
    if (!existsSync(sourcePath)) {
      return { ok: false, action: 'skipped', message: 'file_not_found' };
    }

    const ext = extname(sourcePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return { ok: false, action: 'skipped', message: 'unsupported_format' };
    }

    const activeRun = productionQueue.getActiveRun();
    const resolvedJob =
      job ??
      (activeRun ? getProductionDb().getAwaitingImportJob(activeRun.id) : null);

    if (!resolvedJob) {
      return { ok: false, action: 'skipped', message: 'no_active_job' };
    }

    try {
      return await this.processIngest(sourcePath, resolvedJob);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logProduction({
        level: 'error',
        event: 'ingest_exception',
        character: resolvedJob.character,
        jobId: resolvedJob.id,
        message,
      });
      if (MJ_PRODUCTION_CONTINUE_ON_ERROR) {
        productionQueue.failJob(resolvedJob.id, `ingest_error: ${message}`, true);
        productionQueue.advanceAfterFailure(resolvedJob.runId);
      }
      return { ok: false, action: 'error', message };
    }
  }

  private async processIngest(
    sourcePath: string,
    resolvedJob: ProductionQueueJob
  ): Promise<IngestResult> {
    getProductionDb().updateJobStatus(resolvedJob.id, 'ingesting');

    const contentHash = hashFileContent(sourcePath);
    const catalog = getUniverseCatalog();
    if (catalog.findByContentHash(contentHash)) {
      productionQueue.failJob(resolvedJob.id, 'duplicate', false);
      productionQueue.advanceAfterFailure(resolvedJob.runId);
      return { ok: false, action: 'duplicate', message: 'duplicate_content_hash' };
    }

    const faceResult = await faceVerifier.verify(resolvedJob.character, sourcePath);
    const baseQuality = await inspectImageQuality(sourcePath, catalog.getAllPerceptualHashes());
    const quality = await inspectExtendedQuality(
      sourcePath,
      catalog.getAllPerceptualHashes(),
      faceResult.faceCount,
      baseQuality
    );

    if (!quality.passed && faceResult.reviewStatus === 'REJECTED') {
      await this.moveToRejected(sourcePath, resolvedJob, quality.rejectReasons.join(','));
      productionQueue.failJob(resolvedJob.id, faceResult.message, true);
      productionQueue.advanceAfterFailure(resolvedJob.runId);
      return {
        ok: false,
        action: 'rejected',
        faceSimilarity: faceResult.similarityPercent,
        message: faceResult.message,
      };
    }

    if (!quality.passed) {
      await this.moveToRejected(sourcePath, resolvedJob, quality.rejectReasons.join(','));
      productionQueue.failJob(resolvedJob.id, 'quality_failed', true);
      productionQueue.advanceAfterFailure(resolvedJob.runId);
      return { ok: false, action: 'rejected', message: quality.rejectReasons.join(',') };
    }

    const destDir = join(PHOTO_LIBRARY_ROOT, resolvedJob.character, resolvedJob.folderSlug);
    mkdirSync(destDir, { recursive: true });
    const destFilename = `${contentHash}${extname(sourcePath)}`;
    const destPath = join(destDir, destFilename);
    copyFileSync(sourcePath, destPath);

    const relativePath = libraryRelativePath(destPath);
    const universeId = catalog.getNextUniverseId(resolvedJob.character);
    const now = new Date().toISOString();

    const catalogStatus =
      faceResult.reviewStatus === 'APPROVED'
        ? 'ACTIVE'
        : faceResult.reviewStatus === 'REVIEW'
          ? 'REVIEW'
          : 'REJECTED';

    const meta: UniversePhotoMeta = {
      id: randomUUID(),
      universeId,
      character: resolvedJob.character,
      category: resolvedJob.folderSlug,
      location: resolvedJob.folderSlug,
      emotion: 'neutral',
      tags: [resolvedJob.catalogCategory, resolvedJob.folderSlug],
      filename: destFilename,
      relativePath,
      contentHash,
      importedAt: now,
      time: 'afternoon',
      weather: 'indoor',
      season: 'spring',
      pose: 'natural',
      camera: 'iphone selfie',
      lighting: 'natural',
      outfit: '',
      generatedBy: 'Midjourney',
      prompt: resolvedJob.prompt,
      negativePrompt: resolvedJob.negativePrompt,
      createdAt: now,
      favorite: false,
      usedCount: 0,
      qualityScore: quality.qualityScore,
      perceptualHash: quality.perceptualHash,
      absolutePath: destPath,
    };

    meta.thumbnailPath = await generateThumbnail(destPath, relativePath);

    const sidecar = {
      photoId: universeId,
      character: meta.character,
      category: meta.category,
      prompt: meta.prompt,
      negativePrompt: meta.negativePrompt,
      camera: meta.camera,
      weather: meta.weather,
      emotion: meta.emotion,
      outfit: meta.outfit,
      season: meta.season,
      createdAt: meta.createdAt,
      usedCount: 0,
      qualityScore: meta.qualityScore,
      faceVerified: faceResult.reviewStatus === 'APPROVED',
      faceSimilarity: faceResult.similarityPercent,
      promptId: resolvedJob.promptId,
      queueJobId: resolvedJob.id,
      catalogCategory: resolvedJob.catalogCategory,
    };
    writeSidecarMeta(destPath, sidecar);

    catalog.upsertPhoto(meta);
    getProductionDb().updatePhotoProductionFields(contentHash, {
      faceSimilarity: faceResult.similarity,
      faceVerified: faceResult.reviewStatus === 'APPROVED',
      reviewStatus: faceResult.reviewStatus,
      promptId: resolvedJob.promptId,
      queueJobId: resolvedJob.id,
      noiseScore: quality.noiseScore,
      faceCount: faceResult.faceCount,
      status: catalogStatus,
    });

    if (faceResult.reviewStatus === 'REVIEW') {
      getProductionDb().addReviewItem({
        photoId: universeId,
        jobId: resolvedJob.id,
        character: resolvedJob.character,
        faceSimilarity: faceResult.similarity,
        relativePath,
        reason: faceResult.message,
      });
      const reviewDest = join(
        PHOTO_LIBRARY_ROOT,
        resolvedJob.character,
        '_review',
        destFilename
      );
      mkdirSync(join(PHOTO_LIBRARY_ROOT, resolvedJob.character, '_review'), { recursive: true });
      copyFileSync(destPath, reviewDest);
    }

    catalog.syncJsonIndexes();
    productionQueue.completeJob(resolvedJob.id, universeId);

    mkdirSync(MJ_PRODUCTION_PATHS.importProcessed, { recursive: true });
    try {
      renameSync(sourcePath, join(MJ_PRODUCTION_PATHS.importProcessed, basename(sourcePath)));
    } catch {
      /* source may be on different volume */
    }

    productionQueue.activateNextJob(resolvedJob.runId);

    return {
      ok: true,
      action: faceResult.reviewStatus === 'REVIEW' ? 'review' : 'registered',
      photoId: universeId,
      relativePath,
      faceSimilarity: faceResult.similarityPercent,
      message: faceResult.message,
    };
  }

  private async moveToRejected(
    sourcePath: string,
    job: ProductionQueueJob,
    reason: string
  ): Promise<void> {
    const rejectedDir = join(PHOTO_LIBRARY_ROOT, job.character, '_rejected');
    mkdirSync(rejectedDir, { recursive: true });
    const dest = join(rejectedDir, `${Date.now()}_${basename(sourcePath)}`);
    try {
      copyFileSync(sourcePath, dest);
      writeFileSync(dest + '.reason.txt', reason);
    } catch {
      /* ignore */
    }
    mkdirSync(PHOTO_UNIVERSE_PATHS.rejected, { recursive: true });
  }
}

export const ingestPipeline = new IngestPipeline();
