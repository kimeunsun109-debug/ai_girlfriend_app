import { PrismaClient } from '@prisma/client';
import { dnaEvolutionEngine } from './dna-evolution-engine.js';

const prisma = new PrismaClient();

export class PreferenceLearningEngine {
  async learnReaction(userCharacterId: string, preferenceKey: string, reaction: 'like' | 'dislike' | 'neutral'): Promise<void> {
    const data = reaction === 'like'
      ? { likesScore: { increment: 1 }, evidenceCount: { increment: 1 } }
      : reaction === 'dislike'
        ? { dislikesScore: { increment: 1 }, evidenceCount: { increment: 1 } }
        : { evidenceCount: { increment: 1 } };

    await prisma.userPreference.upsert({
      where: { userCharacterId_preferenceKey: { userCharacterId, preferenceKey } },
      create: { userCharacterId, preferenceKey, likesScore: reaction === 'like' ? 1 : 0, dislikesScore: reaction === 'dislike' ? 1 : 0, evidenceCount: 1 },
      update: data,
    });

    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId }, include: { character: true } });
    if (!uc) return;
    if (reaction === 'like' && preferenceKey.includes('photo')) {
      await dnaEvolutionEngine.applyRule(userCharacterId, uc.character.slug ?? 'yuna', 'photo_compliment', '사진 선호 학습');
    }
    if (reaction === 'like' && preferenceKey.includes('playful')) {
      await dnaEvolutionEngine.applyRule(userCharacterId, uc.character.slug ?? 'yuna', 'playful_user', '장난 선호 학습');
    }
  }

  async getPreferences(userCharacterId: string) {
    return prisma.userPreference.findMany({ where: { userCharacterId }, orderBy: [{ likesScore: 'desc' }, { updatedAt: 'desc' }] });
  }
}

export const preferenceLearningEngine = new PreferenceLearningEngine();
