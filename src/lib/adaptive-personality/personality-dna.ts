import { PrismaClient, PersonalityTrait } from '@prisma/client';
import { PERSONALITY_TRAITS, CORE_PERSONALITY_BASELINES, TRAIT_LABELS } from '../../config/adaptive-personality.config.js';
import type { PersonalitySnapshot } from './types.js';

const prisma = new PrismaClient();

export class PersonalityDNA {
  async ensureInitialized(userCharacterId: string, characterSlug: string): Promise<void> {
    const count = await prisma.personalityDNA.count({ where: { userCharacterId } });
    if (count >= PERSONALITY_TRAITS.length) return;
    const baseline = CORE_PERSONALITY_BASELINES[characterSlug] ?? CORE_PERSONALITY_BASELINES.yuna;
    for (const trait of PERSONALITY_TRAITS) {
      const core = baseline[trait] ?? 50;
      await prisma.personalityDNA.upsert({
        where: { userCharacterId_traitKey: { userCharacterId, traitKey: trait } },
        create: { userCharacterId, traitKey: trait, coreValue: core, adaptiveValue: core, lastUpdatedReason: 'initialization' },
        update: {},
      });
    }
  }

  async getSnapshot(userCharacterId: string, characterSlug: string, stageLevel: number): Promise<PersonalitySnapshot> {
    await this.ensureInitialized(userCharacterId, characterSlug);
    const rows = await prisma.personalityDNA.findMany({ where: { userCharacterId }, orderBy: { traitKey: 'asc' } });
    return {
      userCharacterId,
      characterSlug,
      stageLevel,
      updatedAt: rows[0]?.updatedAt.toISOString() ?? new Date().toISOString(),
      dna: rows.map((r) => ({ traitKey: r.traitKey, label: TRAIT_LABELS[r.traitKey], coreValue: r.coreValue, adaptiveValue: r.adaptiveValue, delta: r.adaptiveValue - r.coreValue })),
    };
  }

  async getDnaMap(userCharacterId: string): Promise<Partial<Record<PersonalityTrait, number>>> {
    const rows = await prisma.personalityDNA.findMany({ where: { userCharacterId } });
    return rows.reduce((acc, row) => { acc[row.traitKey] = row.adaptiveValue; return acc; }, {} as Partial<Record<PersonalityTrait, number>>);
  }
}

export const personalityDNA = new PersonalityDNA();
