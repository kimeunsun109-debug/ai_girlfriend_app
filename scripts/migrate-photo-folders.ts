#!/usr/bin/env npx tsx
/**
 * 기존 UUID 폴더 → slug/category 구조로 마이그레이션
 *   npm run photos:migrate
 */
import 'dotenv/config';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { classifyFromPath } from '../src/lib/photo-catalog/category-mapper.js';
import { hashFileContent } from '../src/lib/photo-catalog/image-validator.js';
import {
  PHOTOS_ROOT,
  saveCharacterIndex,
  writePhotoMeta,
} from '../src/lib/photo-catalog/index-manager.js';
import {
  CHARACTER_SLUG_MAP,
  type CharacterPhotoIndex,
  type PhotoMeta,
} from '../src/lib/photo-catalog/types.js';
import { photoCatalogRepository } from '../src/lib/photo-catalog/photo-repository.js';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';

const UUID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.values(CHARACTER_SLUG_MAP).map((c) => [c.id, c.slug])
);

const prisma = new PrismaClient();

async function main() {
  if (!existsSync(PHOTOS_ROOT)) {
    console.log('No photos root found.');
    return;
  }

  let migrated = 0;

  for (const entry of readdirSync(PHOTOS_ROOT)) {
    const oldDir = join(PHOTOS_ROOT, entry);
    if (!statSync(oldDir).isDirectory()) continue;

    const slug = UUID_TO_SLUG[entry];
    if (!slug) continue;

    const charInfo = CHARACTER_SLUG_MAP[slug];
    const spec = CHARACTER_SPECS.find((s) => s.slug === slug);
    const existingIndex = photoCatalogRepository.getIndex(slug);
    const existing: PhotoMeta[] = existingIndex?.photos ?? [];
    const existingHashes = new Set(existing.map((p) => p.contentHash));
    const newPhotos: PhotoMeta[] = [];

    for (const file of readdirSync(oldDir)) {
      if (file === 'photos-index.json' || file.endsWith('.photo.json')) continue;
      const ext = extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

      const srcPath = join(oldDir, file);
      if (!statSync(srcPath).isFile()) continue;

      const hash = hashFileContent(srcPath);
      if (existingHashes.has(hash)) continue;

      const classified = classifyFromPath(`${slug}/${file}`);
      const destName = `${hash}${ext}`;
      const relativePath = `${slug}/${classified.categorySlug}/${destName}`;
      const destPath = join(PHOTOS_ROOT, relativePath);

      mkdirSync(join(PHOTOS_ROOT, slug, classified.categorySlug), { recursive: true });
      copyFileSync(srcPath, destPath);

      const meta: PhotoMeta = {
        id: randomUUID(),
        character: slug,
        category: classified.categorySlug,
        emotion: classified.emotion,
        tags: classified.tags,
        filename: destName,
        relativePath,
        contentHash: hash,
        importedAt: new Date().toISOString(),
      };
      writePhotoMeta(meta);
      newPhotos.push(meta);
      existingHashes.add(hash);
      migrated++;
    }

    if (newPhotos.length > 0) {
      const index: CharacterPhotoIndex = {
        character: slug,
        characterId: charInfo.id,
        updatedAt: new Date().toISOString(),
        totalCount: existing.length + newPhotos.length,
        photos: [...existing, ...newPhotos],
      };
      saveCharacterIndex(index);
      photoCatalogRepository.registerIndex(index);

      if (process.env.PHOTOS_SKIP_DB_SYNC === '1') continue;

      try {
        const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

        await prisma.character.upsert({
        where: { id: charInfo.id },
        create: {
          id: charInfo.id,
          name: spec?.name ?? slug,
          personality: spec?.personality ?? '',
          speechStyle: spec?.speechStyle ?? '',
          slug,
        },
        update: { slug },
      });

      for (const photo of newPhotos) {
        const classified = classifyFromPath(photo.relativePath);
        await prisma.characterPhoto.upsert({
          where: { id: photo.id },
          create: {
            id: photo.id,
            characterId: charInfo.id,
            url: `${baseUrl}/assets/photos/${photo.relativePath}`,
            thumbnailUrl: `${baseUrl}/assets/photos/${photo.relativePath}`,
            category: classified.prismaCategory,
            tags: photo.tags,
            expression: photo.emotion,
            emotion: photo.emotion,
            contentHash: photo.contentHash,
            categorySlug: photo.category,
            relativePath: photo.relativePath,
            status: 'ACTIVE',
          },
          update: {
            url: `${baseUrl}/assets/photos/${photo.relativePath}`,
            categorySlug: photo.category,
            relativePath: photo.relativePath,
            emotion: photo.emotion,
          },
        });
      }
      } catch (err) {
        console.warn(`  DB sync skipped for ${slug}:`, (err as Error).message);
      }
    }

    console.log(`Migrated ${slug}: ${newPhotos.length} photos`);
  }

  // UUID 레거시 폴더 정리 (slug 폴더로 이전 완료 후)
  for (const entry of readdirSync(PHOTOS_ROOT)) {
    if (UUID_TO_SLUG[entry]) {
      const legacyDir = join(PHOTOS_ROOT, entry);
      if (statSync(legacyDir).isDirectory()) {
        rmSync(legacyDir, { recursive: true, force: true });
        console.log(`Removed legacy folder: ${entry}`);
      }
    }
  }

  console.log(`\nTotal migrated: ${migrated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
