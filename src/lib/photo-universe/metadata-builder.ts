import { randomUUID } from 'crypto';
import { classifyFromPath } from '../photo-catalog/category-mapper.js';
import { hashFileContent } from '../photo-catalog/image-validator.js';
import { resolveCharacterSlug } from '../photo-catalog/types.js';
import { promptCatalogReader } from '../photo-catalog/prompt-catalog-reader.js';
import { characterImageFactory } from '../photo-catalog/image-factory.js';
import type { PhotoEmotion } from '../photo-catalog/types.js';
import { readSidecarMeta } from './thumbnail-service.js';
import type { QualityReport, UniversePhotoMeta, UniverseSeason, UniverseTime, UniverseWeather } from './types.js';
import { libraryRelativePath } from './paths.js';

const TIME_KEYWORDS: Record<string, UniverseTime> = {
  morning: 'morning', wake: 'morning', bed: 'morning', brunch: 'morning',
  afternoon: 'afternoon', lunch: 'afternoon', coffee: 'afternoon', cafe: 'afternoon',
  evening: 'evening', leave: 'evening', dinner: 'evening',
  night: 'night', alcohol: 'night', sleep: 'night', late: 'late_night',
};

const WEATHER_KEYWORDS: Record<string, UniverseWeather> = {
  rain: 'rainy', rainy: 'rainy', snow: 'snowy', sunny: 'sunny', cloudy: 'cloudy',
  indoor: 'indoor', home: 'indoor', cafe: 'indoor', office: 'indoor',
};

const SEASON_KEYWORDS: Record<string, UniverseSeason> = {
  cherry: 'spring', spring: 'spring', blossom: 'spring',
  summer: 'summer', beach: 'summer',
  autumn: 'autumn', fall: 'autumn', maple: 'autumn',
  winter: 'winter', snow: 'winter', christmas: 'winter',
};

function inferTime(parts: string[]): UniverseTime {
  for (const p of parts) {
    for (const [k, v] of Object.entries(TIME_KEYWORDS)) {
      if (p.includes(k)) return v;
    }
  }
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function inferWeather(parts: string[], classified: ReturnType<typeof classifyFromPath>): UniverseWeather {
  for (const p of parts) {
    for (const [k, v] of Object.entries(WEATHER_KEYWORDS)) {
      if (p.includes(k)) return v;
    }
  }
  if (['rain', 'snow'].includes(classified.categorySlug)) {
    return classified.categorySlug === 'rain' ? 'rainy' : 'snowy';
  }
  return 'indoor';
}

function inferSeason(parts: string[]): UniverseSeason {
  for (const p of parts) {
    for (const [k, v] of Object.entries(SEASON_KEYWORDS)) {
      if (p.includes(k)) return v;
    }
  }
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function resolveCharacterFromRelative(relativePath: string): string | null {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  for (const part of parts) {
    const slug = resolveCharacterSlug(part);
    if (slug) return slug;
  }
  return null;
}

function locationFromPath(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  if (parts.length >= 2) return parts[1]!.toLowerCase();
  return 'selfie';
}

export interface BuildMetaInput {
  absolutePath: string;
  universeId: string;
  quality: QualityReport;
  thumbnailPath?: string;
}

export function buildUniverseMetadata(input: BuildMetaInput): UniversePhotoMeta | null {
  const relativePath = libraryRelativePath(input.absolutePath);
  const character = resolveCharacterFromRelative(relativePath);
  if (!character) return null;

  const sidecar = readSidecarMeta(input.absolutePath);
  const classified = classifyFromPath(relativePath);
  const parts = relativePath.toLowerCase().split('/');
  const location = (sidecar?.location as string) ?? locationFromPath(relativePath);
  const category = (sidecar?.category as string) ?? classified.categorySlug ?? location;

  let prompt = sidecar?.prompt as string | undefined;
  let negativePrompt = sidecar?.negativePrompt as string | undefined;

  if (!prompt && sidecar?.catalogPromptId) {
    const catalogId = String(sidecar.catalogPromptId);
    const [slugPart, catPart] = catalogId.split('/');
    if (slugPart && catPart) {
      const file = promptCatalogReader.loadCategory(slugPart, catPart);
      const idx = Number(sidecar.promptIndex ?? 0);
      const entry = file?.prompts[idx];
      if (entry) {
        prompt = entry.prompt;
        negativePrompt = entry.negativePrompt;
      }
    }
  }

  if (!prompt) {
    const generated = characterImageFactory.generate(character, {
      scenario: characterImageFactory.scenarioFromCategory(category, classified.emotion),
      seed: hashFileContent(input.absolutePath).charCodeAt(0),
    });
    prompt = generated?.prompt;
    negativePrompt = generated?.negativePrompt;
  }

  const now = new Date().toISOString();
  const contentHash = hashFileContent(input.absolutePath);
  const filename = relativePath.split('/').pop() ?? `${contentHash}.jpg`;

  const meta: UniversePhotoMeta = {
    id: (sidecar?.id as string) ?? randomUUID(),
    universeId: input.universeId,
    character,
    category,
    location,
    emotion: (sidecar?.emotion as PhotoEmotion) ?? classified.emotion,
    tags: (sidecar?.tags as string[]) ?? classified.tags,
    filename,
    relativePath,
    contentHash,
    importedAt: now,
    time: (sidecar?.time as UniverseTime) ?? inferTime(parts),
    weather: (sidecar?.weather as UniverseWeather) ?? inferWeather(parts, classified),
    season: (sidecar?.season as UniverseSeason) ?? inferSeason(parts),
    pose: (sidecar?.pose as string) ?? 'natural',
    camera: (sidecar?.camera as UniversePhotoMeta['camera']) ?? 'iphone selfie',
    lighting: (sidecar?.lighting as string) ?? 'natural',
    outfit: (sidecar?.outfit as string) ?? '',
    generatedBy: (sidecar?.generatedBy as UniversePhotoMeta['generatedBy']) ?? 'Midjourney',
    prompt,
    negativePrompt,
    createdAt: (sidecar?.createdAt as string) ?? now,
    favorite: Boolean(sidecar?.favorite),
    usedCount: Number(sidecar?.usedCount ?? 0),
    qualityScore: input.quality.qualityScore,
    perceptualHash: input.quality.perceptualHash,
    absolutePath: input.absolutePath,
    thumbnailPath: input.thumbnailPath,
  };

  return meta;
}

export function metaToSidecarJson(meta: UniversePhotoMeta): Record<string, unknown> {
  return {
    id: meta.universeId,
    character: meta.character,
    location: meta.location,
    category: meta.category,
    time: meta.time,
    weather: meta.weather,
    emotion: meta.emotion,
    pose: meta.pose,
    camera: meta.camera,
    lighting: meta.lighting,
    season: meta.season,
    outfit: meta.outfit,
    generatedBy: meta.generatedBy,
    prompt: meta.prompt,
    negativePrompt: meta.negativePrompt,
    createdAt: meta.createdAt,
    favorite: meta.favorite,
    usedCount: meta.usedCount,
    qualityScore: meta.qualityScore,
    contentHash: meta.contentHash,
    perceptualHash: meta.perceptualHash,
  };
}
