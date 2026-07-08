import { PrismaClient } from '@prisma/client';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';

const prisma = new PrismaClient();
const USER_ID = '00000000-0000-0000-0000-000000000010';

async function main() {
  console.log('Seeding characters (slug) + user...');
  console.log('Run "npm run photos:migrate" to build photo catalog from assets.\n');

  for (const spec of CHARACTER_SPECS) {
    await prisma.character.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        slug: spec.slug,
        name: spec.name,
        personality: spec.personality,
        speechStyle: spec.speechStyle,
      },
      update: { slug: spec.slug, name: spec.name },
    });
    console.log(`  ${spec.emoji} ${spec.name} (${spec.slug})`);
  }

  await prisma.user.upsert({
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

  console.log('\nSeed done. Next: npm run photos:migrate');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
