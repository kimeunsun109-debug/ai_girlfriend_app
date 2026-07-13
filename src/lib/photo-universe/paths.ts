import { existsSync, mkdirSync } from 'fs';
import { join, relative, resolve } from 'path';
import {
  PHOTO_LIBRARY_ROOT,
  PHOTO_UNIVERSE_DATA_ROOT,
  PHOTO_UNIVERSE_PATHS,
} from '../../config/photo-universe.config.js';
import {
  PICKMETALK_RUNTIME,
  validateNoHybridPath,
} from '../../config/runtime-environment.config.js';

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
  if (!target.startsWith(libRoot)) return null;
  return target;
}

export function libraryRelativePath(absolutePath: string): string {
  validateNoHybridPath(absolutePath, 'libraryRelativePath input');
  const libRoot = resolve(PHOTO_LIBRARY_ROOT);
  const resolved = resolve(absolutePath);

  if (resolved === libRoot) return '';

  const rel = relative(libRoot, resolved);
  if (rel && !rel.startsWith('..') && !rel.startsWith('/')) {
    return rel.replace(/\\/g, '/');
  }

  const normalized = absolutePath.replace(/\\/g, '/');
  const rootNorm = PHOTO_LIBRARY_ROOT.replace(/\\/g, '/');
  if (normalized.startsWith(rootNorm + '/')) {
    return normalized.slice(rootNorm.length + 1);
  }

  return normalized.replace(/\\/g, '/');
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
  if (PICKMETALK_RUNTIME === 'production' && process.platform !== 'win32') {
    return false;
  }
  return existsSync(PHOTO_LIBRARY_ROOT);
}
