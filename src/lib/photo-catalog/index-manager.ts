import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { PHOTO_UNIVERSE_ENABLED, PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import type { CharacterPhotoIndex, PhotoMeta } from './types.js';

/** Legacy in-repo photos (dev / migration) */
export const PHOTOS_ROOT = join(process.cwd(), 'assets', 'photos');

export function getPhotosRoot(): string {
  return PHOTOS_ROOT;
}

export function getCharacterIndexPath(characterSlug: string): string {
  if (PHOTO_UNIVERSE_ENABLED) {
    return join(PHOTO_UNIVERSE_PATHS.indexes, characterSlug, 'photos-index.json');
  }
  return join(PHOTOS_ROOT, characterSlug, 'photos-index.json');
}

export function loadCharacterIndex(characterSlug: string): CharacterPhotoIndex | null {
  const indexPath = getCharacterIndexPath(characterSlug);
  if (!existsSync(indexPath)) return null;
  try {
    return JSON.parse(readFileSync(indexPath, 'utf-8')) as CharacterPhotoIndex;
  } catch {
    return null;
  }
}

export function saveCharacterIndex(index: CharacterPhotoIndex): void {
  const indexPath = getCharacterIndexPath(index.character);
  mkdirSync(dirname(indexPath), { recursive: true });
  index.updatedAt = new Date().toISOString();
  index.totalCount = index.photos.length;
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

export function writePhotoMeta(meta: PhotoMeta): void {
  const metaPath = join(PHOTOS_ROOT, meta.relativePath.replace(/\.[^.]+$/, '.photo.json'));
  mkdirSync(dirname(metaPath), { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

export function loadAllIndexes(): CharacterPhotoIndex[] {
  const root = PHOTO_UNIVERSE_ENABLED ? PHOTO_UNIVERSE_PATHS.indexes : PHOTOS_ROOT;
  if (!existsSync(root)) return [];

  const indexes: CharacterPhotoIndex[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (!statSync(full).isDirectory()) continue;
    const index = loadCharacterIndex(entry);
    if (index) indexes.push(index);
  }
  return indexes;
}

export function buildPhotoUrl(relativePath: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  if (PHOTO_UNIVERSE_ENABLED) {
    return `${base}/library/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `${base}/assets/photos/${relativePath}`;
}
