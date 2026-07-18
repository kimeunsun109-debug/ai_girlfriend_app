/**
 * Local mass production — RTX GenerationEngine → Library ingest path.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  FACTORY_FACE,
  FACTORY_PATHS,
  FACTORY_PHASE,
  FACTORY_SCALE_TIERS,
} from '../../config/hybrid-factory.config.js';
import { PHOTO_LIBRARY_ROOT } from '../../config/photo-universe.config.js';
import { folderForPromptCategory } from '../../config/midjourney-production.config.js';
import { getUniverseCatalog } from '../photo-universe/catalog-db.js';
import { inspectImageQuality } from '../photo-universe/quality-inspector.js';
import { generateThumbnail, writeSidecarMeta } from '../photo-universe/thumbnail-service.js';
import { libraryRelativePath } from '../photo-universe/paths.js';
import { hashFileContent } from '../photo-catalog/image-validator.js';
import type { UniversePhotoMeta } from '../photo-universe/types.js';
import { getGenerationEngine } from './engines/registry.js';
import { composeNextPrompt } from './prompt-composer.js';
import { listMasterImages } from './master-dataset.js';
import { loadCharacterProfile, verifyAgainstMaster } from './character-profile.js';
import { generateUiThumbnails } from './ui/thumbnails.js';
import {
  mapCamera,
  mapEmotion,
  mapGeneratedBy,
  mapSeason,
  mapWeather,
} from './meta-mappers.js';

export interface LocalProduceOptions {
  character: string;
  count: number;
  engineId?: string;
  dryRun?: boolean;
}

export interface LocalProduceResult {
  character: string;
  requested: number;
  generated: number;
  active: number;
  review: number;
  rejected: number;
  failed: number;
}

function classifyFaceStatus(
  similarity: number,
  qualityPassed: boolean
): 'ACTIVE' | 'REVIEW' | 'REJECTED' {
  if (similarity < FACTORY_FACE.rejectBelow) return 'REJECTED';
  if (!qualityPassed) return 'REJECTED';
  if (similarity < FACTORY_FACE.autoApprove) return 'REVIEW';
  return 'ACTIVE';
}

export async function produceLocalBatch(options: LocalProduceOptions): Promise<LocalProduceResult> {
  const { character, count } = options;
  const profile = loadCharacterProfile(character);
  if (!profile?.metadata.readyForMassProduction && listMasterImages(character).length < 10) {
    throw new Error(
      `${character}: Master Dataset < 10 images — finish Midjourney masters + factory:profile first`
    );
  }

  const engine = getGenerationEngine(options.engineId);
  const available = await engine.isAvailable();
  if (!available && engine.id !== 'stub') {
    throw new Error(`Engine ${engine.id} not available — start ComfyUI or use FACTORY_ENGINE=stub`);
  }

  const masters = listMasterImages(character);
  const ref = masters[0];

  const result: LocalProduceResult = {
    character,
    requested: count,
    generated: 0,
    active: 0,
    review: 0,
    rejected: 0,
    failed: 0,
  };

  mkdirSync(FACTORY_PATHS.generatedInbox, { recursive: true });
  const catalog = getUniverseCatalog();

  for (let i = 0; i < count; i++) {
    const composed = composeNextPrompt(character);
    if (!composed) {
      console.warn(`[factory] prompt exhausted for ${character} at ${i + 1}/${count}`);
      break;
    }

    if (options.dryRun) {
      result.generated += 1;
      continue;
    }

    const gen = await engine.generate({
      character,
      prompt: composed.prompt,
      negativePrompt: composed.negativePrompt,
      referenceImagePath: ref,
      width: 768,
      height: 1024,
    });

    if (!gen.ok || !gen.imagePath || !existsSync(gen.imagePath)) {
      result.failed += 1;
      console.error(`[factory] generate failed: ${gen.error}`);
      continue;
    }

    result.generated += 1;

    const face = await verifyAgainstMaster(character, gen.imagePath);
    const quality = await inspectImageQuality(gen.imagePath, catalog.getAllPerceptualHashes());
    const status = classifyFaceStatus(face.similarity, quality.passed);

    const folder = folderForPromptCategory(composed.category) || composed.location || 'daily';
    const contentHash = hashFileContent(gen.imagePath);
    const destDir =
      status === 'REJECTED'
        ? join(PHOTO_LIBRARY_ROOT, character, '_rejected')
        : status === 'REVIEW'
          ? join(PHOTO_LIBRARY_ROOT, character, '_review')
          : join(PHOTO_LIBRARY_ROOT, character, folder);
    mkdirSync(destDir, { recursive: true });
    const destFilename = `${contentHash}.png`;
    const destPath = join(destDir, destFilename);
    copyFileSync(gen.imagePath, destPath);

    if (status === 'ACTIVE') result.active += 1;
    else if (status === 'REVIEW') result.review += 1;
    else result.rejected += 1;

    const now = new Date().toISOString();
    const universeId = catalog.getNextUniverseId(character);
    const relativePath = libraryRelativePath(destPath);

    const meta: UniversePhotoMeta = {
      id: randomUUID(),
      universeId,
      character,
      category: folder,
      location: composed.location,
      emotion: mapEmotion(composed.emotion),
      tags: [composed.category, composed.season, composed.weather, composed.outfit],
      filename: destFilename,
      relativePath,
      contentHash,
      importedAt: now,
      time: 'afternoon',
      weather: mapWeather(composed.weather || composed.location),
      season: mapSeason(composed.season),
      pose: composed.action,
      camera: mapCamera(composed.camera),
      lighting: composed.lighting,
      outfit: composed.outfit,
      generatedBy: mapGeneratedBy(gen.engineId),
      prompt: composed.prompt,
      negativePrompt: composed.negativePrompt,
      createdAt: now,
      favorite: false,
      usedCount: 0,
      qualityScore: quality.qualityScore,
      perceptualHash: quality.perceptualHash,
      absolutePath: destPath,
    };

    meta.thumbnailPath = await generateThumbnail(destPath, relativePath);
    await generateUiThumbnails(destPath, character, contentHash);

    const sidecar = {
      photoId: universeId,
      character,
      camera: meta.camera,
      prompt: composed.prompt,
      negativePrompt: composed.negativePrompt,
      weather: meta.weather,
      season: meta.season,
      emotion: meta.emotion,
      outfit: composed.outfit,
      lighting: composed.lighting,
      qualityScore: quality.qualityScore,
      faceSimilarity: face.similarityPercent,
      createdAt: now,
      engine: gen.engineId,
      model: gen.model,
      seed: gen.seed,
      usedCount: 0,
      status,
      fingerprint: composed.fingerprint,
    };
    writeSidecarMeta(destPath, sidecar);

    if (status !== 'REJECTED') {
      catalog.upsertPhoto(meta);
    }
    catalog.syncJsonIndexes();

    console.log(
      `[factory] ${i + 1}/${count} ${status} face=${face.similarityPercent}% q=${quality.qualityScore} → ${folder}`
    );
  }

  return result;
}

export function nextScaleTier(current: number = FACTORY_PHASE): number | null {
  const next = FACTORY_SCALE_TIERS.find((t) => t > current);
  return next ?? null;
}
