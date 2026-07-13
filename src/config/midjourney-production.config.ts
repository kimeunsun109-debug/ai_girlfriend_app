/**
 * Midjourney Production Pipeline — operational configuration
 * Scales from 20 → 5000 photos per character without code changes.
 */
import { join } from 'path';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_DATA_ROOT } from './photo-universe.config.js';
import { CHARACTER_SLUG_MAP } from '../lib/photo-catalog/types.js';

export const MJ_PRODUCTION_PATHS = {
  state: join(PHOTO_UNIVERSE_DATA_ROOT, 'production-state.json'),
  faceRefs: join(PHOTO_UNIVERSE_DATA_ROOT, 'face-references'),
  importProcessed: join(PHOTO_UNIVERSE_DATA_ROOT, 'import-processed'),
  review: join(PHOTO_UNIVERSE_DATA_ROOT, 'review'),
  eventLog: join(PHOTO_UNIVERSE_DATA_ROOT, 'production-events.jsonl'),
  stats: join(PHOTO_UNIVERSE_DATA_ROOT, 'production-stats.json'),
} as const;

/** `production` = long-term ops; `test` = legacy 20-photo pilot defaults */
export type MjProductionMode = 'production' | 'test';

export const MJ_PRODUCTION_MODE: MjProductionMode =
  process.env.MJ_PRODUCTION_MODE === 'test' ? 'test' : 'production';

/** Scale tiers — increase MJ_PRODUCTION_PHASE when stats pass gates */
export const PRODUCTION_SCALE_TIERS = [20, 100, 200, 500, 1000, 2000, 5000] as const;

/** Target photos per character for current operational phase */
export const MJ_PRODUCTION_PHASE = Number(
  process.env.MJ_PRODUCTION_PHASE ??
    (MJ_PRODUCTION_MODE === 'production' ? 150 : 20)
);

/** Midjourney download / import watch folder (Windows Downloads default) */
export const MJ_IMPORT_WATCH_FOLDER =
  process.env.MJ_IMPORT_WATCH_FOLDER ??
  process.env.PICKMETALK_MJ_IMPORT ??
  join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads', 'PickMeTalk_MJ');

/** Photos per character per production run — override via env or CLI */
export const MJ_PHOTOS_PER_CHARACTER = Number(
  process.env.MJ_PHOTOS_PER_CHARACTER ?? MJ_PRODUCTION_PHASE
);

/** Character processing order */
export const MJ_CHARACTER_ORDER = Object.keys(CHARACTER_SLUG_MAP) as Array<
  keyof typeof CHARACTER_SLUG_MAP
>;

/** Continue pipeline on errors (log + next job) */
export const MJ_PRODUCTION_CONTINUE_ON_ERROR =
  process.env.MJ_CONTINUE_ON_ERROR !== '0' && process.env.MJ_CONTINUE_ON_ERROR !== 'false';

/** Auto-generate runtime scenes when Prompt Catalog is exhausted */
export const MJ_PRODUCTION_RUNTIME_SCENE_GEN =
  process.env.MJ_RUNTIME_SCENES !== '0' && process.env.MJ_RUNTIME_SCENES !== 'false';

/** Max regeneration attempts per job before marking failed */
export const MJ_PRODUCTION_MAX_RETRIES = Number(process.env.MJ_MAX_RETRIES ?? 3);

/** Auto-requeue regenerate jobs on orchestrator tick */
export const MJ_PRODUCTION_AUTO_REGEN = process.env.MJ_AUTO_REGEN !== '0';

/** Minimum catalog prompts remaining before warning */
export const MJ_CATALOG_LOW_WATERMARK = Number(process.env.MJ_CATALOG_LOW_WATERMARK ?? 500);

/** Dynamic prompt catalog bucket (runtime-generated scenes) */
export const MJ_DYNAMIC_CATALOG_CATEGORY = '__generated__';

/** Default folder structure created on bootstrap */
export const MJ_LIBRARY_FOLDERS = [
  'morning',
  'home',
  'cafe',
  'work',
  'travel',
  'rainy',
  'selfie',
  'mirror',
  'workout',
  'commute',
  'office',
  'lunch',
  'evening',
  'bed',
  'game',
  'reading',
  'shopping',
  'date',
  'snow',
  'cherry',
  '_review',
  '_rejected',
] as const;

/** Map prompt catalog category slug → library folder name */
export const PROMPT_TO_FOLDER: Record<string, string> = {
  hair_salon: 'mirror',
  cafe: 'cafe',
  coffee: 'cafe',
  food: 'cafe',
  gym: 'workout',
  exercise: 'workout',
  rain: 'rainy',
  walk: 'travel',
  bar: 'evening',
  late_night_snack: 'evening',
  commute: 'commute',
  subway: 'commute',
  office: 'office',
  work_overtime: 'work',
  lunch: 'lunch',
  home: 'home',
  bed: 'bed',
  sleep: 'bed',
  selfie: 'selfie',
  mirror_selfie: 'mirror',
  game_room: 'game',
  reading: 'reading',
  shopping: 'shopping',
  date: 'date',
  snow: 'snow',
  cherry_blossom: 'cherry',
  morning: 'morning',
  study: 'work',
};

export function folderForPromptCategory(catalogCategory: string): string {
  return PROMPT_TO_FOLDER[catalogCategory] ?? catalogCategory.replace(/_/g, '-').slice(0, 24);
}

/** Face verification thresholds (0–1 cosine similarity) */
export const FACE_VERIFICATION = {
  /** ≥ this → AUTO APPROVE (ACTIVE) */
  autoApprove: Number(process.env.FACE_AUTO_APPROVE ?? 0.95),
  /** ≥ this but < autoApprove → REVIEW queue */
  reviewMin: Number(process.env.FACE_REVIEW_MIN ?? 0.8),
  /** < reviewMin → REJECT (regenerate) */
  rejectBelow: Number(process.env.FACE_REJECT_BELOW ?? 0.8),
  /** Minimum face count (heuristic) */
  minFaceCount: 1,
  maxFaceCount: 2,
} as const;

export type ProductionJobStatus =
  | 'pending'
  | 'prompt_ready'
  | 'awaiting_import'
  | 'ingesting'
  | 'completed'
  | 'failed'
  | 'regenerate';

export type FaceReviewStatus = 'APPROVED' | 'REVIEW' | 'REJECTED' | 'PENDING';

export type ProductionRunStatus = 'created' | 'running' | 'paused' | 'completed';
