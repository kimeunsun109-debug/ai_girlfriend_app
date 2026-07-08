import { PrismaClient, PhotoCategory, TimeOfDay } from '@prisma/client';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';

const prisma = new PrismaClient();

const USER_ID = '00000000-0000-0000-0000-000000000010';
const BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

type PhotoDef = {
  file: string;
  category: PhotoCategory;
  tags: string[];
  timeOfDay?: TimeOfDay;
  expression?: string;
  background?: string;
};

/** 캐릭터별 샘플 사진 매핑 */
const CHARACTER_PHOTOS: Record<string, PhotoDef[]> = {
  '00000000-0000-0000-0000-000000000001': [
    { file: 'yuna_campus_selfie.jpg', category: PhotoCategory.SELFIE_GENERAL, tags: ['캠퍼스', '셀카'], expression: '은은한 미소', background: '캠퍼스' },
    { file: 'coffee_cafe.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['카페', '공부'], timeOfDay: TimeOfDay.MORNING, expression: '착함', background: '카페' },
    { file: 'selfie_bed_morning.jpg', category: PhotoCategory.SELFIE_BED, tags: ['아침', '침대'], timeOfDay: TimeOfDay.MORNING, expression: '졸림', background: '침대' },
    { file: 'food_tteokbokki.jpg', category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이'], expression: '행복', background: '거리' },
  ],
  '00000000-0000-0000-0000-000000000002': [
    { file: 'narin_mirror_selfie.jpg', category: PhotoCategory.SELFIE_MIRROR, tags: ['거울', '셀카'], expression: '새침', background: '카페' },
    { file: 'narin_happy_blush.jpg', category: PhotoCategory.HAPPY, tags: ['기쁨', '보조개'], expression: '활짝 웃음', background: '집' },
    { file: 'hair_salon_mirror.jpg', category: PhotoCategory.HAIR_SALON, tags: ['머리', '미용실'], expression: '쑥스러움', background: '미용실' },
  ],
  '00000000-0000-0000-0000-000000000003': [
    { file: 'yoonseo_rainy_window.jpg', category: PhotoCategory.RAIN, tags: ['비', '창가'], expression: '차분', background: '창가' },
    { file: 'home_rainy_day.jpg', category: PhotoCategory.HOME_LOUNGE, tags: ['집', '비'], timeOfDay: TimeOfDay.AFTERNOON, expression: '단아', background: '집' },
    { file: 'work_overtime_desk.jpg', category: PhotoCategory.WORK_OVERTIME, tags: ['야근'], timeOfDay: TimeOfDay.NIGHT, expression: '차분', background: '사무실' },
  ],
  '00000000-0000-0000-0000-000000000004': [
    { file: 'eunha_cafe_peace.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['카페', 'V'], expression: '밝음', background: '감성카페' },
    { file: 'coffee_cafe.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['커피'], timeOfDay: TimeOfDay.AFTERNOON, expression: '엉뚱', background: '카페' },
    { file: 'weekend_out_sunny.jpg', category: PhotoCategory.WEEKEND_OUT, tags: ['주말'], expression: '웃음', background: '야외' },
    { file: 'nail_art_hand.jpg', category: PhotoCategory.NAIL_ART, tags: ['네일'], expression: '기쁨', background: '집' },
  ],
  '00000000-0000-0000-0000-000000000005': [
    { file: 'jiyu_gaming_selfie.jpg', category: PhotoCategory.GAME, tags: ['게임', 'PC방'], timeOfDay: TimeOfDay.EVENING, expression: '편함', background: 'PC방' },
    { file: 'selfie_bed_morning.jpg', category: PhotoCategory.SELFIE_BED, tags: ['후드', '집'], expression: '졸림', background: '집' },
    { file: 'food_tteokbokki.jpg', category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이', '야식'], expression: '배고픔', background: '포장마차' },
  ],
};

async function main() {
  console.log('Seeding 5 characters...');

  for (const spec of CHARACTER_SPECS) {
    await prisma.character.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        name: spec.name,
        personality: spec.personality,
        speechStyle: spec.speechStyle,
      },
      update: {
        name: spec.name,
        personality: spec.personality,
        speechStyle: spec.speechStyle,
      },
    });

    await prisma.characterPhoto.deleteMany({ where: { characterId: spec.id } });

    const photos = CHARACTER_PHOTOS[spec.id] ?? [];
    for (const photo of photos) {
      const url = `${BASE_URL}/assets/photos/${spec.id}/${photo.file}`;
      await prisma.characterPhoto.create({
        data: {
          characterId: spec.id,
          url,
          thumbnailUrl: url,
          category: photo.category,
          tags: photo.tags,
          timeOfDay: photo.timeOfDay,
          expression: photo.expression,
          background: photo.background,
          contentHash: `${spec.name}_${photo.file.replace('.jpg', '')}`,
          status: 'ACTIVE',
        },
      });
    }
    console.log(`  ${spec.emoji} ${spec.name}: ${photos.length} photos`);
  }

  const user = await prisma.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      name: '은선',
      age: 28,
      timezone: 'Asia/Seoul',
      country: 'KR',
      birthday: new Date('1998-03-15'),
      pushEnabled: true,
    },
    update: {},
  });

  // 기본 연결: 유나
  const yunaId = CHARACTER_SPECS[0].id;
  const relationshipStart = new Date();
  relationshipStart.setDate(relationshipStart.getDate() - 50);
  const day100 = new Date(relationshipStart);
  day100.setDate(day100.getDate() + 100);

  await prisma.userCharacter.upsert({
    where: { userId_characterId: { userId: USER_ID, characterId: yunaId } },
    create: {
      userId: USER_ID,
      characterId: yunaId,
      relationshipStartAt: relationshipStart,
      day100Date: day100,
    },
    update: {},
  });

  console.log('Seed completed:', { user: user.name, defaultCharacter: '유나' });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
