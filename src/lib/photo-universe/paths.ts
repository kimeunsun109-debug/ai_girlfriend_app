import { existsSync, mkdirSync } from 'fs';
import { join, normalize, resolve } from 'path';
import {
  PHOTO_LIBRARY_ROOT,
  PHOTO_UNIVERSE_DATA_ROOT,
  PHOTO_UNIVERSE_PATHS,
} from '../../config/photo-universe.config.js';

export function ensureUniverseDirs(): void {
  for (const dir of [
    PHOTO_UNIVERSE_DATA_ROOT,
    PHOTO_UNIVERSE_PATHS.thumbnails,
    PHOTO_UNIVERSE_PATHS.indexes,
    PHOTO_UNIVERSE_PATHS.rejected,
  ]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

/** Resolve absolute path inside photo library (prevents path traversal) */
export function resolveLibraryPath(relativePath: string): string | null {
  const libRoot = resolve(PHOTO_LIBRARY_ROOT);
  const target = resolve(libRoot, relativePath.replace(/\\/g, '/'));
  const normalized = normalize(target);
  if (!normalized.startsWith(libRoot)) return null;
  return normalized;
}

export function libraryRelativePath(absolutePath: string): string {
  const libRoot = resolve(PHOTO_LIBRARY_ROOT);
  return absolutePath.slice(libRoot.length + 1).replace(/\\/g, '/');
}

export function buildLibraryUrl(relativePath: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${base}/library/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

export function buildThumbnailUrl(relativePath: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${base}/universe/thumbnails/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

export function thumbnailCachePath(relativeThumbPath: string): string {
  return join(PHOTO_UNIVERSE_PATHS.thumbnails, relativeThumbPath);
}

export function characterIndexPath(characterSlug: string): string {
  return join(PHOTO_UNIVERSE_PATHS.indexes, characterSlug, 'photos-index.json');
}

export function sidecarMetaPath(imageAbsolutePath: string): string {
  return imageAbsolutePath.replace(/\.[^.]+$/, '.meta.json');
}

export function isLibraryAvailable(): boolean {
  return existsSync(PHOTO_LIBRARY_ROOT);
}
