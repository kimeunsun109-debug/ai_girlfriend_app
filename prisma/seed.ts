import { PrismaClient, PhotoCategory, TimeOfDay } from '@prisma/client';

const prisma = new PrismaClient();

const CHARACTER_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';
const BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

/** 샘플 에셋 — assets/photos/ 에 저장된 실제 이미지 */
const SAMPLE_PHOTOS: Array<{
  file: string;
  category: PhotoCategory;
  tags: string[];
  timeOfDay?: TimeOfDay;
  expression?: string;
  background?: string;
}> = [
  {
    file: 'selfie_bed_morning.jpg',
    category: PhotoCategory.SELFIE_BED,
    tags: ['셀카', '침대', '아침'],
    timeOfDay: TimeOfDay.MORNING,
    expression: '졸림',
    background: '침대',
  },
  {
    file: 'coffee_cafe.jpg',
    category: PhotoCategory.COFFEE_CAFE,
    tags: ['커피', '카페'],
    timeOfDay: TimeOfDay.MORNING,
    expression: '기쁨',
    background: '카페',
  },
  {
    file: 'hair_salon_mirror.jpg',
    category: PhotoCategory.HAIR_SALON,
    tags: ['머리', '미용실', '거울'],
    expression: '쑥스러움',
    background: '미용실',
  },
  {
    file: 'work_overtime_desk.jpg',
    category: PhotoCategory.WORK_OVERTIME,
    tags: ['야근', '책상'],
    timeOfDay: TimeOfDay.NIGHT,
    expression: '피곤',
    background: '사무실',
  },
  {
    file: 'weekend_out_sunny.jpg',
    category: PhotoCategory.WEEKEND_OUT,
    tags: ['주말', '놀러', '야외'],
    timeOfDay: TimeOfDay.AFTERNOON,
    expression: '웃음',
    background: '거리',
  },
  {
    file: 'nail_art_hand.jpg',
    category: PhotoCategory.NAIL_ART,
    tags: ['네일', '손톱'],
    expression: '기쁨',
    background: '집',
  },
  {
    file: 'food_tteokbokki.jpg',
    category: PhotoCategory.FOOD_TTEOKBOKKI,
    tags: ['떡볶이', '음식'],
    timeOfDay: TimeOfDay.EVENING,
    expression: '행복',
    background: '포장마차',
  },
  {
    file: 'home_rainy_day.jpg',
    category: PhotoCategory.HOME_LOUNGE,
    tags: ['집', '비', '창가'],
    timeOfDay: TimeOfDay.AFTERNOON,
    expression: '다정',
    background: '집',
  },
];

async function main() {
  console.log('Seeding database...');

  const character = await prisma.character.upsert({
    where: { id: CHARACTER_ID },
    create: {
      id: CHARACTER_ID,
      name: '수아',
      personality: '다정하고 애교 많은 성격',
      speechStyle: '친근하고 다정한 말투, 이모티콘 자주 사용',
    },
    update: {},
  });

  // 기존 샘플 사진 정리 후 재등록
  await prisma.characterPhoto.deleteMany({ where: { characterId: CHARACTER_ID } });

  for (const photo of SAMPLE_PHOTOS) {
    const url = `${BASE_URL}/assets/photos/${CHARACTER_ID}/${photo.file}`;
    await prisma.characterPhoto.create({
      data: {
        characterId: CHARACTER_ID,
        url,
        thumbnailUrl: url,
        category: photo.category,
        tags: photo.tags,
        timeOfDay: photo.timeOfDay,
        expression: photo.expression,
        background: photo.background,
        contentHash: photo.file.replace('.jpg', ''),
        status: 'ACTIVE',
      },
    });
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

  const relationshipStart = new Date();
  relationshipStart.setDate(relationshipStart.getDate() - 50);
  const day100 = new Date(relationshipStart);
  day100.setDate(day100.getDate() + 100);

  await prisma.userCharacter.upsert({
    where: { userId_characterId: { userId: USER_ID, characterId: CHARACTER_ID } },
    create: {
      userId: USER_ID,
      characterId: CHARACTER_ID,
      relationshipStartAt: relationshipStart,
      day100Date: day100,
    },
    update: {},
  });

  console.log('Seed completed:', {
    character: character.name,
    user: user.name,
    photos: SAMPLE_PHOTOS.length,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
