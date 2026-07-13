/**
 * 유나(Yuna) 얼굴 기준 — Midjourney Identity Lock
 * @deprecated Use character-face-reference.config.ts — kept for backward compatibility
 */
import {
  getCharacterFaceIdentity,
  getMjSuffix,
  buildCharacterMjCommand,
} from './character-face-reference.config.js';

export const YUNA_FACE_IDENTITY = getCharacterFaceIdentity('yuna')!;
export const YUNA_MJ_SUFFIX = getMjSuffix('yuna');

export { buildCharacterMjCommand };
