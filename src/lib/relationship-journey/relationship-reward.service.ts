import { PrismaClient } from '@prisma/client';
import { RELATIONSHIP_STAGES, REWARD_LABELS } from '../../config/relationship-journey.config.js';

const prisma = new PrismaClient();

export class RelationshipRewardService {
  async unlockStageRewards(userCharacterId: string, stageLevel: number): Promise<void> {
    const stage = RELATIONSHIP_STAGES.find((s) => s.level === stageLevel);
    if (!stage) return;

    for (const rewardKey of stage.rewards) {
      await prisma.relationshipReward.upsert({
        where: { userCharacterId_rewardKey: { userCharacterId, rewardKey } },
        create: {
          userCharacterId,
          stageLevel,
          rewardKey,
          rewardLabel: REWARD_LABELS[rewardKey] ?? rewardKey,
        },
        update: {},
      });
    }
  }

  async getRewards(userCharacterId: string) {
    return prisma.relationshipReward.findMany({
      where: { userCharacterId },
      orderBy: { unlockedAt: 'asc' },
    });
  }

  async isUnlocked(userCharacterId: string, rewardKey: string): Promise<boolean> {
    const r = await prisma.relationshipReward.findUnique({
      where: { userCharacterId_rewardKey: { userCharacterId, rewardKey } },
    });
    return r != null;
  }
}

export const relationshipRewardService = new RelationshipRewardService();
