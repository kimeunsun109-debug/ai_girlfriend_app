/**
 * Hybrid Photo Factory v2 — config
 * Midjourney = Master only (10–20/char)
 * RTX Local AI = mass production (150 → 10_000)
 */
import { join } from 'path';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_DATA_ROOT } from './photo-universe.config.js';
import { MJ_CHARACTER_ORDER } from './midjourney-production.config.js';

/** Scale tiers for local mass production */
export const FACTORY_SCALE_TIERS = [150, 500, 1000, 2000, 5000, 10000] as const;

export const FACTORY_PHASE = Number(
  process.env.FACTORY_PHASE ?? process.env.MJ_PRODUCTION_PHASE ?? 150
);

/** Active generation engine id */
export type GenerationEngineId = 'stub' | 'comfyui' | 'a1111' | 'flux' | 'sdxl';

export const FACTORY_ENGINE: GenerationEngineId =
  (process.env.FACTORY_ENGINE as GenerationEngineId) ||
  (process.env.FACTORY_ENGINE_DEFAULT as GenerationEngineId) ||
  'stub';

export const FACTORY_PATHS = {
  masterRoot: join(PHOTO_LIBRARY_ROOT, 'master'),
  profiles: join(PHOTO_UNIVERSE_DATA_ROOT, 'character-profiles'),
  factoryState: join(PHOTO_UNIVERSE_DATA_ROOT, 'factory-state.json'),
  uiMockups: join(PHOTO_UNIVERSE_DATA_ROOT, 'ui-mockups'),
  styleGuides: join(PHOTO_UNIVERSE_DATA_ROOT, 'style-guides'),
  thumbnailCache: join(PHOTO_UNIVERSE_DATA_ROOT, 'thumbnail-cache'),
  generatedInbox: join(PHOTO_UNIVERSE_DATA_ROOT, 'factory-generated'),
} as const;

export const FACTORY_CHARACTERS = [...MJ_CHARACTER_ORDER] as string[];

/** Face verification vs Master Dataset (stricter than MJ-only pipeline) */
export const FACTORY_FACE = {
  autoApprove: Number(process.env.FACTORY_FACE_AUTO_APPROVE ?? 0.95),
  reviewMin: Number(process.env.FACTORY_FACE_REVIEW_MIN ?? 0.9),
  rejectBelow: Number(process.env.FACTORY_FACE_REJECT_BELOW ?? 0.9),
} as const;

/** Local ComfyUI / A1111 endpoints (Windows RTX) */
export const FACTORY_LOCAL_API = {
  comfyui: process.env.COMFYUI_URL?.trim() || 'http://127.0.0.1:8188',
  a1111: process.env.A1111_URL?.trim() || 'http://127.0.0.1:7860',
} as const;

export const FACTORY_THUMB_SIZES = [48, 64, 96, 128, 256, 512] as const;

export const UI_MOCKUP_SCREENS = [
  'splash',
  'login',
  'character-select',
  'home',
  'chat-list',
  'chat-room',
  'album',
  'memory-timeline',
  'push-notification',
  'relationship-journey',
  'settings',
  'premium',
  'profile',
] as const;
