import { PrismaClient } from '@prisma/client';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';
import { RELATIONSHIP_STAGES } from '../src/config/relationship-journey.config.js';
import { memoryEventEngine } from '../src/lib/relationship-journey/memory-event-engine.js';

const prisma = new PrismaClient();
const USER_ID = '00000000-0000-0000-0000-000000000010';
const DEMO_USER_CHARACTER_ID = '00000000-0000-0000-0000-000000000020';

async function main() {
  console.log('Seeding characters (slug) + user + relationship stages...');
  console.log('Run "npm run photos:migrate" to build photo catalog from assets.\n');

  for (const stage of RELATIONSHIP_STAGES) {
    await prisma.relationshipStage.upsert({
      where: { id: stage.level },
      create: {
        id: stage.level,
        name: stage.name,
        nameKo: stage.nameKo,
        description: stage.description,
        minAffection: stage.minAffection,
        maxAffection: stage.maxAffection,
        speechStyle: stage.speechStyle,
        rewards: [...stage.rewards],
      },
      update: {
        nameKo: stage.nameKo,
        description: stage.description,
        minAffection: stage.minAffection,
        maxAffection: stage.maxAffection,
      },
    });
  }

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

  const existing = await prisma.userCharacter.findUnique({
    where: { userId_characterId: { userId: USER_ID, characterId: yunaId } },
  });

  const uc = await prisma.userCharacter.upsert({
    where: { userId_characterId: { userId: USER_ID, characterId: yunaId } },
    create: {
      id: DEMO_USER_CHARACTER_ID,
      userId: USER_ID,
      characterId: yunaId,
      relationshipStartAt: relationshipStart,
      day100Date: day100,
      affectionScore: 45,
      relationshipLevel: 4,
    },
    update: { affectionScore: 45, relationshipLevel: 4 },
  });

  if (!existing) {
    await memoryEventEngine.onUserCharacterCreated(uc.id, CHARACTER_SPECS[0].name);
  }

  console.log('\nSeed done. Next: npm run photos:migrate');
  console.log(`Demo userCharacterId: ${uc.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
