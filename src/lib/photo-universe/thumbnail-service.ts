import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import sharp from 'sharp';
import { thumbnailCachePath } from './paths.js';

const THUMB_WIDTH = 400;

export async function generateThumbnail(
  sourceAbsolutePath: string,
  relativePath: string
): Promise<string> {
  const ext = '.jpg';
  const thumbRel = relativePath.replace(/\.[^.]+$/, '_thumb.jpg');
  const dest = thumbnailCachePath(thumbRel);
  mkdirSync(dirname(dest), { recursive: true });

  await sharp(sourceAbsolutePath)
    .rotate()
    .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);

  return thumbRel;
}

export function readSidecarMeta(absolutePath: string): Record<string, unknown> | null {
  const sidecar = absolutePath.replace(/\.[^.]+$/, '.meta.json');
  if (!existsSync(sidecar)) return null;
  try {
    return JSON.parse(readFileSync(sidecar, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function writeSidecarMeta(absolutePath: string, meta: Record<string, unknown>): void {
  const sidecar = absolutePath.replace(/\.[^.]+$/, '.meta.json');
  mkdirSync(dirname(sidecar), { recursive: true });
  writeFileSync(sidecar, JSON.stringify(meta, null, 2), 'utf-8');
}
