#!/usr/bin/env npx tsx
/**
 * PickMeTalk 사진 일괄 Import
 *
 * 사용법:
 *   LOCAL_PHOTOS_DIR="C:/Users/user/OneDrive/Desktop/픽미톡 ai" npm run photos:import
 *
 * 폴더 구조 예시:
 *   픽미톡 ai/
 *     유나/
 *       hair/
 *         photo1.jpg
 *       coffee/
 *     나린/
 *       nail/
 *     hair_01.jpg   ← 파일명으로도 자동 분류
 */
import 'dotenv/config';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { PhotoImportService, printImportReport, photoCatalogRepository } from '../src/lib/photo-catalog/photo-repository.js';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';
import { CHARACTER_SLUG_MAP } from '../src/lib/photo-catalog/types.js';

const prisma = new PrismaClient();

async function ensureCharacters() {
  if (process.env.PHOTOS_SKIP_DB_SYNC === '1') return;

  const slugEntries = Object.values(CHARACTER_SLUG_MAP);
  for (const entry of slugEntries) {
    const spec = CHARACTER_SPECS.find((s) => s.id === entry.id);
    if (!spec) continue;
    await prisma.character.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        name: spec.name,
        personality: spec.personality,
        speechStyle: spec.speechStyle,
        slug: entry.slug,
      },
      update: { slug: entry.slug, name: spec.name },
    });
  }
}

async function main() {
  const sourceDir =
    process.env.LOCAL_PHOTOS_DIR ??
    process.env.PHOTOS_IMPORT_DIR ??
    process.argv[2];

  if (!sourceDir) {
    console.error('사진 소스 폴더를 지정하세요.\n');
    console.error('  LOCAL_PHOTOS_DIR="C:/Users/user/OneDrive/Desktop/픽미톡 ai" npm run photos:import');
    console.error('  npm run photos:import -- ./test-import');
    process.exit(1);
  }

  if (!existsSync(sourceDir)) {
    console.error(`경로를 찾을 수 없습니다: ${sourceDir}`);
    process.exit(1);
  }

  console.log(`Importing from: ${sourceDir}\n`);
  if (process.env.PHOTOS_SKIP_DB_SYNC === '1') {
    console.log('(PHOTOS_SKIP_DB_SYNC=1 — filesystem + index only)\n');
  }

  try {
    await ensureCharacters();
  } catch (err) {
    console.warn('Character DB seed failed:', (err as Error).message);
    if (process.env.PHOTOS_SKIP_DB_SYNC !== '1') throw err;
  }

  const importer = new PhotoImportService();
  const stats = await importer.importFromDirectory(sourceDir);
  printImportReport(stats);

  if (stats.totalImported === 0 && stats.duplicate === 0) {
    console.log('ℹ️  가져올 새 이미지가 없습니다. 이미 import 되었거나 폴더가 비어있을 수 있습니다.');
  }
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
