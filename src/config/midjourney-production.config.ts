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
} as const;

/** Midjourney download / import watch folder (Windows Downloads default) */
export const MJ_IMPORT_WATCH_FOLDER =
  process.env.MJ_IMPORT_WATCH_FOLDER ??
  process.env.PICKMETALK_MJ_IMPORT ??
  join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads', 'PickMeTalk_MJ');

/** Photos per character per production run — override via env or CLI */
export const MJ_PHOTOS_PER_CHARACTER = Number(process.env.MJ_PHOTOS_PER_CHARACTER ?? 20);

/** Character processing order */
export const MJ_CHARACTER_ORDER = Object.keys(CHARACTER_SLUG_MAP) as Array<
  keyof typeof CHARACTER_SLUG_MAP
>;

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
