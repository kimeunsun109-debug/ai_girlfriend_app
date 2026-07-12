/**
 * Photo Universe — extended metadata schema
 */
import type { PhotoEmotion, PhotoMeta } from '../photo-catalog/types.js';

export type UniverseTime =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'late_night';

export type UniverseWeather =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'overcast'
  | 'indoor';

export type UniverseSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export type UniverseCamera =
  | 'iphone selfie'
  | 'iphone portrait'
  | 'mirror selfie'
  | 'friend took photo'
  | 'candid';

export type GeneratedBy = 'Midjourney' | 'import' | 'manual';

export interface QualityReport {
  width: number;
  height: number;
  shortEdge: number;
  blurVariance: number;
  qualityScore: number;
  passed: boolean;
  rejectReasons: string[];
  perceptualHash: string;
  duplicateOf?: string;
  similarTo?: string[];
}

export interface UniversePhotoMeta extends PhotoMeta {
  /** Human-readable id e.g. yuna_000245 */
  universeId: string;
  location: string;
  time: UniverseTime;
  weather: UniverseWeather;
  season: UniverseSeason;
  pose: string;
  camera: UniverseCamera;
  lighting: string;
  outfit: string;
  generatedBy: GeneratedBy;
  prompt?: string;
  negativePrompt?: string;
  createdAt: string;
  favorite: boolean;
  usedCount: number;
  qualityScore: number;
  perceptualHash: string;
  /** Absolute path on USB (not served to clients) */
  absolutePath?: string;
  thumbnailPath?: string;
}

export interface UniverseSearchQuery {
  character: string;
  location?: string;
  category?: string;
  time?: UniverseTime;
  weather?: UniverseWeather;
  emotion?: PhotoEmotion;
  outfit?: string;
  camera?: string;
  season?: UniverseSeason;
  tags?: string[];
  minQuality?: number;
  excludeHashes?: string[];
  limit?: number;
}

export interface UniverseSearchResult {
  photo: UniversePhotoMeta;
  url: string;
  thumbnailUrl: string;
  cacheHit: boolean;
}

export interface UniverseScanStats {
  scanned: number;
  registered: number;
  updated: number;
  duplicate: number;
  rejected: number;
  skipped: number;
  byCharacter: Record<string, number>;
}

export interface MidjourneyWorkflowPrompt {
  character: string;
  slug: string;
  category: string;
  targetFolder: string;
  prompt: string;
  negativePrompt: string;
  midjourneyCommand: string;
  identityNote: string;
  catalogPromptId?: string;
}

export interface CacheLookupResult {
  hit: boolean;
  photo?: UniverseSearchResult;
  /** When miss — suggested prompt for Midjourney generation */
  suggestedPrompt?: MidjourneyWorkflowPrompt;
}
