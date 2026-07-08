/**
 * 로컬 폴더의 이미지를 CharacterPhoto DB에 등록
 *
 * 사용법 (Windows PC에서):
 *   set LOCAL_PHOTOS_DIR=C:\Users\user\OneDrive\Desktop\픽미톡 ai
 *   set CHARACTER_ID=00000000-0000-0000-0000-000000000001
 *   npx tsx scripts/import-local-photos.ts
 *
 * 폴더 구조:
 *   픽미톡 ai/
 *     수아/           ← 캐릭터 서브폴더 (선택)
 *       아침_01.jpg
 *       커피_02.jpg
 *     머리_03.jpg     ← 또는 루트에 직접
 */
import { PrismaClient, PhotoCategory, TimeOfDay } from '@prisma/client';
import { createHash } from 'crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, extname, join } from 'path';

const prisma = new PrismaClient();

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: PhotoCategory; timeOfDay?: TimeOfDay }> = [
  { keywords: ['아침', '침대', '기상', 'bed', 'morning'], category: PhotoCategory.SELFIE_BED, timeOfDay: TimeOfDay.MORNING },
  { keywords: ['커피', '카페', 'coffee', 'cafe'], category: PhotoCategory.COFFEE_CAFE, timeOfDay: TimeOfDay.MORNING },
  { keywords: ['야근', '책상', 'overtime', 'desk'], category: PhotoCategory.WORK_OVERTIME, timeOfDay: TimeOfDay.NIGHT },
  { keywords: ['퇴근', 'leave', 'offwork'], category: PhotoCategory.WORK_LEAVE, timeOfDay: TimeOfDay.EVENING },
  { keywords: ['머리', '미용실', 'hair', 'salon'], category: PhotoCategory.HAIR_SALON },
  { keywords: ['네일', '손톱', 'nail'], category: PhotoCategory.NAIL_ART },
  { keywords: ['술', 'drink', 'beer'], category: PhotoCategory.DRINKING, timeOfDay: TimeOfDay.NIGHT },
  { keywords: ['떡볶이', 'tteok'], category: PhotoCategory.FOOD_TTEOKBOKKI },
  { keywords: ['운동', '헬스', 'gym', 'workout'], category: PhotoCategory.EXERCISE_GYM },
  { keywords: ['주말', '놀러', 'weekend', 'out'], category: PhotoCategory.WEEKEND_OUT },
  { keywords: ['게임', 'game'], category: PhotoCategory.GAME },
  { keywords: ['산책', 'walk'], category: PhotoCategory.WALK },
  { keywords: ['비', 'rain', '우산'], category: PhotoCategory.RAIN },
  { keywords: ['눈', 'snow'], category: PhotoCategory.SNOW },
  { keywords: ['벚꽃', 'cherry'], category: PhotoCategory.CHERRY_BLOSSOM },
  { keywords: ['브런치', 'brunch'], category: PhotoCategory.BRUNCH },
  { keywords: ['집', 'home', 'lounge'], category: PhotoCategory.HOME_LOUNGE },
  { keywords: ['거울', 'mirror'], category: PhotoCategory.SELFIE_MIRROR },
  { keywords: ['셀카', 'selfie'], category: PhotoCategory.SELFIE_GENERAL },
];

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function detectCategory(filename: string): { category: PhotoCategory; timeOfDay?: TimeOfDay } {
  const lower = filename.toLowerCase();
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { category: rule.category, timeOfDay: rule.timeOfDay };
    }
  }
  return { category: PhotoCategory.SELFIE_GENERAL };
}

function hashFileAsync(path: string): string {
  const { readFileSync } = require('fs') as typeof import('fs');
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

function collectImages(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectImages(full));
    } else if (IMAGE_EXTS.has(extname(entry).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const sourceDir = process.env.LOCAL_PHOTOS_DIR;
  const characterId = process.env.CHARACTER_ID ?? '00000000-0000-0000-0000-000000000001';
  const assetsDir = join(process.cwd(), 'assets', 'photos', characterId);

  if (!sourceDir) {
    console.error('LOCAL_PHOTOS_DIR 환경 변수를 설정하세요.');
    console.error('예: LOCAL_PHOTOS_DIR="C:/Users/user/OneDrive/Desktop/픽미톡 ai"');
    process.exit(1);
  }

  if (!existsSync(sourceDir)) {
    console.error(`경로를 찾을 수 없습니다: ${sourceDir}`);
    console.error('로컬 PC에서 실행하거나, assets/photos/에 이미지를 직접 넣으세요.');
    process.exit(1);
  }

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) {
    console.error(`캐릭터를 찾을 수 없습니다: ${characterId}. 먼저 npm run db:seed 실행`);
    process.exit(1);
  }

  mkdirSync(assetsDir, { recursive: true });
  const images = collectImages(sourceDir);
  console.log(`발견된 이미지: ${images.length}장`);

  let imported = 0;
  let skipped = 0;

  for (const srcPath of images) {
    const filename = basename(srcPath);
    const { category, timeOfDay } = detectCategory(filename);
    const contentHash = hashFileAsync(srcPath);

    const existing = await prisma.characterPhoto.findFirst({
      where: { characterId, contentHash },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const destName = `${category.toLowerCase()}_${contentHash}${extname(filename)}`;
    const destPath = join(assetsDir, destName);
    copyFileSync(srcPath, destPath);

    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/assets/photos/${characterId}/${destName}`;
    const thumbName = destName.replace(extname(destName), '_thumb.webp');

    await prisma.characterPhoto.create({
      data: {
        characterId,
        url,
        thumbnailUrl: url,
        category,
        tags: [basename(filename, extname(filename))],
        timeOfDay,
        contentHash,
        status: 'ACTIVE',
      },
    });
    imported++;
    console.log(`  ✓ ${filename} → ${category}`);
  }

  console.log(`\n완료: ${imported}장 등록, ${skipped}장 스킵 (중복)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
