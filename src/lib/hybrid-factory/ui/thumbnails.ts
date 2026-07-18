import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import sharp from 'sharp';
import { FACTORY_PATHS, FACTORY_THUMB_SIZES } from '../../../config/hybrid-factory.config.js';

export async function generateUiThumbnails(
  absolutePath: string,
  character: string,
  contentHash: string
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  const base = join(FACTORY_PATHS.thumbnailCache, character, contentHash);
  mkdirSync(base, { recursive: true });

  for (const size of FACTORY_THUMB_SIZES) {
    const dest = join(base, `${size}.webp`);
    await sharp(absolutePath)
      .resize(size, size, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toFile(dest);
    out[size] = dest;
  }

  writeFileSync(join(base, 'index.json'), JSON.stringify({ sizes: out, createdAt: new Date().toISOString() }, null, 2));
  return out;
}
