import { PrismaClient } from '@prisma/client';

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
    // Note: Do NOT evolve DNA from passive signals (view/click/like) here.
    // DNA evolution should be driven by explicit user messages (reply) or explicit API signals,
    // otherwise photo_view/photo_click can inflate traits like CONFIDENCE without actual compliments.
  }

  async getPreferences(userCharacterId: string) {
    return prisma.userPreference.findMany({ where: { userCharacterId }, orderBy: [{ likesScore: 'desc' }, { updatedAt: 'desc' }] });
  }
}

export const preferenceLearningEngine = new PreferenceLearningEngine();
