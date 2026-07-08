import { PrismaClient, PhotoCategory, TimeOfDay } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_PHOTO_CATEGORIES: Array<{
  category: PhotoCategory;
  tags: string[];
  timeOfDay?: TimeOfDay;
}> = [
  { category: PhotoCategory.SELFIE_BED, tags: ['셀카', '침대', '아침'], timeOfDay: TimeOfDay.MORNING },
  { category: PhotoCategory.COFFEE_CAFE, tags: ['커피', '카페'], timeOfDay: TimeOfDay.MORNING },
  { category: PhotoCategory.HAIR_SALON, tags: ['머리', '미용실', '거울'] },
  { category: PhotoCategory.WORK_OVERTIME, tags: ['야근', '책상'], timeOfDay: TimeOfDay.NIGHT },
  { category: PhotoCategory.WORK_LEAVE, tags: ['퇴근'], timeOfDay: TimeOfDay.EVENING },
  { category: PhotoCategory.FOOD_TTEOKBOKKI, tags: ['떡볶이', '음식'] },
  { category: PhotoCategory.WEEKEND_OUT, tags: ['주말', '놀러'] },
  { category: PhotoCategory.EXERCISE_GYM, tags: ['운동', '헬스'] },
  { category: PhotoCategory.RAIN, tags: ['비', '우산'] },
  { category: PhotoCategory.SELFIE_GENERAL, tags: ['셀카', '일반'] },
];

async function main() {
  console.log('Seeding database...');

  const character = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: '수아',
      personality: '다정하고 애교 많은 성격',
      speechStyle: '친근하고 다정한 말투, 이모티콘 자주 사용',
    },
    update: {},
  });

  // 캐릭터당 샘플 사진 50장 생성 (실제로는 ~1,000장)
  for (const sample of SAMPLE_PHOTO_CATEGORIES) {
    for (let i = 0; i < 5; i++) {
      await prisma.characterPhoto.create({
        data: {
          characterId: character.id,
          url: `https://cdn.pickmetalk.com/photos/${character.id}/${sample.category.toLowerCase()}_${i}.jpg`,
          thumbnailUrl: `https://cdn.pickmetalk.com/photos/${character.id}/${sample.category.toLowerCase()}_${i}_thumb.jpg`,
          category: sample.category,
          tags: sample.tags,
          timeOfDay: sample.timeOfDay,
          expression: ['기쁨', '졸림', '웃음', '쑥스러움'][i % 4],
          background: ['침대', '카페', '거리', '집'][i % 4],
        },
      });
    }
  }

  const user = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
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
    where: {
      userId_characterId: { userId: user.id, characterId: character.id },
    },
    create: {
      userId: user.id,
      characterId: character.id,
      relationshipStartAt: relationshipStart,
      day100Date: day100,
    },
    update: {},
  });

  console.log('Seed completed:', { character: character.name, user: user.name });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
