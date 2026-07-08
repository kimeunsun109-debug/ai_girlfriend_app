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

/** UI 플로우 상황별 캐릭터 사진 — docs/캐릭터예시_사진.md */
const CHARACTER_PHOTOS: Record<string, PhotoDef[]> = {
  // 😊 유나
  '00000000-0000-0000-0000-000000000001': [
    { file: 'yuna_campus_selfie.jpg', category: PhotoCategory.SELFIE_GENERAL, tags: ['캠퍼스', '셀카'], expression: '은은한 미소', background: '캠퍼스' },
    { file: 'yuna_finger_heart.jpg', category: PhotoCategory.HAPPY, tags: ['하트', '애정'], expression: '다정', background: '실내' },
    { file: 'yuna_hair_salon.jpg', category: PhotoCategory.HAIR_SALON, tags: ['머리', '미용실'], expression: '쑥스러움', background: '미용실' },
    { file: 'yuna_sad_pouty.jpg', category: PhotoCategory.SAD, tags: ['슬픔', '후속'], expression: '삐짐', background: '집' },
    { file: 'yuna_nail_art.jpg', category: PhotoCategory.NAIL_ART, tags: ['네일'], expression: '기쁨', background: '집' },
    { file: 'yuna_rain_umbrella.jpg', category: PhotoCategory.RAIN, tags: ['비', '우산'], expression: '걱정', background: '창가' },
    { file: 'coffee_cafe.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['카페', '공부'], timeOfDay: TimeOfDay.MORNING, expression: '착함', background: '카페' },
    { file: 'selfie_bed_morning.jpg', category: PhotoCategory.SELFIE_BED, tags: ['아침', '침대'], timeOfDay: TimeOfDay.MORNING, expression: '졸림', background: '침대' },
    { file: 'food_tteokbokki.jpg', category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이'], expression: '행복', background: '거리' },
  ],
  // 😎 나린
  '00000000-0000-0000-0000-000000000002': [
    { file: 'narin_mirror_selfie.jpg', category: PhotoCategory.SELFIE_MIRROR, tags: ['거울', '셀카'], expression: '새침', background: '카페' },
    { file: 'hair_salon_mirror.jpg', category: PhotoCategory.HAIR_SALON, tags: ['머리', '미용실'], expression: '쑥스러움', background: '미용실' },
    { file: 'narin_sad_pouty.jpg', category: PhotoCategory.SAD, tags: ['별론가', '후속'], expression: '삐짐', background: '집' },
    { file: 'narin_happy_blush.jpg', category: PhotoCategory.HAPPY, tags: ['기쁨', '보조개'], expression: '활짝 웃음', background: '집' },
    { file: 'narin_nail_art.jpg', category: PhotoCategory.NAIL_ART, tags: ['네일'], expression: '새침한 기쁨', background: '카페' },
    { file: 'narin_coffee_choice.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['커피', '선택'], expression: '고민', background: '카페' },
    { file: 'narin_drinking_hangover.jpg', category: PhotoCategory.DRINKING, tags: ['술', '해장'], timeOfDay: TimeOfDay.MORNING, expression: '부끄러움', background: '집' },
  ],
  // 📚 윤서
  '00000000-0000-0000-0000-000000000003': [
    { file: 'yoonseo_rainy_window.jpg', category: PhotoCategory.RAIN, tags: ['비', '창가'], expression: '차분', background: '창가' },
    { file: 'yoonseo_waiting_sad.jpg', category: PhotoCategory.SAD, tags: ['답장대기', '후속'], expression: '아쉬움', background: '집' },
    { file: 'yoonseo_reading.jpg', category: PhotoCategory.READING, tags: ['독서'], expression: '차분한 미소', background: '창가' },
    { file: 'yoonseo_work_leave.jpg', category: PhotoCategory.WORK_LEAVE, tags: ['퇴근'], timeOfDay: TimeOfDay.EVENING, expression: '안도', background: '거리' },
    { file: 'home_rainy_day.jpg', category: PhotoCategory.HOME_LOUNGE, tags: ['집', '비'], timeOfDay: TimeOfDay.AFTERNOON, expression: '단아', background: '집' },
    { file: 'work_overtime_desk.jpg', category: PhotoCategory.WORK_OVERTIME, tags: ['야근'], timeOfDay: TimeOfDay.NIGHT, expression: '차분', background: '사무실' },
  ],
  // 🎨 은하
  '00000000-0000-0000-0000-000000000004': [
    { file: 'eunha_cafe_peace.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['카페', 'V'], expression: '밝음', background: '감성카페' },
    { file: 'eunha_dessert_cafe.jpg', category: PhotoCategory.FOOD_BAKERY, tags: ['디저트', '카페'], expression: '엉뚱', background: '카페' },
    { file: 'eunha_nail_art.jpg', category: PhotoCategory.NAIL_ART, tags: ['네일'], expression: '장난', background: '카페' },
    { file: 'eunha_tteokbokki.jpg', category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이'], expression: '배고픔', background: '포장마차' },
    { file: 'eunha_drinking_hangover.jpg', category: PhotoCategory.DRINKING, tags: ['술', '해장'], expression: '웃음', background: '집' },
    { file: 'weekend_out_sunny.jpg', category: PhotoCategory.WEEKEND_OUT, tags: ['주말'], expression: '웃음', background: '야외' },
    { file: 'nail_art_hand.jpg', category: PhotoCategory.NAIL_ART, tags: ['네일'], expression: '기쁨', background: '집' },
  ],
  // ⛳ 지유
  '00000000-0000-0000-0000-000000000005': [
    { file: 'jiyu_gaming_selfie.jpg', category: PhotoCategory.GAME, tags: ['게임', 'PC방'], timeOfDay: TimeOfDay.EVENING, expression: '편함', background: 'PC방' },
    { file: 'jiyu_escape_room.jpg', category: PhotoCategory.WEEKEND_OUT, tags: ['방탈출'], expression: '신남', background: '방탈출' },
    { file: 'jiyu_aesthetic_cafe.jpg', category: PhotoCategory.COFFEE_CAFE, tags: ['감성카페'], expression: '쿨', background: '카페' },
    { file: 'jiyu_tteokbokki.jpg', category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이', '야식'], timeOfDay: TimeOfDay.NIGHT, expression: '배고픔', background: '포장마차' },
    { file: 'jiyu_drinking_hangover.jpg', category: PhotoCategory.DRINKING, tags: ['술'], timeOfDay: TimeOfDay.MORNING, expression: '피곤', background: '집' },
    { file: 'selfie_bed_morning.jpg', category: PhotoCategory.SELFIE_BED, tags: ['후드', '집'], expression: '졸림', background: '집' },
  ],
};

async function main() {
  console.log('Seeding 5 characters with UI flow photos...');

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

  const total = Object.values(CHARACTER_PHOTOS).reduce((s, p) => s + p.length, 0);
  console.log('Seed completed:', { user: user.name, totalPhotos: total });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
