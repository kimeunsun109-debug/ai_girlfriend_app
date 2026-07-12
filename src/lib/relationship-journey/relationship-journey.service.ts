import { PrismaClient } from '@prisma/client';
import {
  RELATIONSHIP_STAGES,
  REWARD_LABELS,
} from '../../config/relationship-journey.config.js';
import type { StageInfo } from './types.js';
import { memoryTimelineService } from './memory-timeline.service.js';
import { relationshipRewardService } from './relationship-reward.service.js';

const prisma = new PrismaClient();

/**
 * RelationshipJourneyService — 8단계 관계 성장
 */
export class RelationshipJourneyService {
  getStageByLevel(level: number): StageInfo {
    const stage = RELATIONSHIP_STAGES.find((s) => s.level === level);
    return stage ?? RELATIONSHIP_STAGES[0];
  }

  getStageByAffection(affectionScore: number): StageInfo {
    const stage = RELATIONSHIP_STAGES.find(
      (s) => affectionScore >= s.minAffection && affectionScore <= s.maxAffection
    );
    return stage ?? RELATIONSHIP_STAGES[RELATIONSHIP_STAGES.length - 1];
  }

  async getJourney(userCharacterId: string) {
    const uc = await prisma.userCharacter.findUnique({
      where: { id: userCharacterId },
      include: {
        character: true,
        stageHistory: { orderBy: { reachedAt: 'asc' } },
        relationshipRewards: { orderBy: { unlockedAt: 'asc' } },
      },
    });
    if (!uc) return null;

    const currentStage = this.getStageByLevel(uc.relationshipLevel);
    const daysTogether = Math.floor(
      (Date.now() - uc.relationshipStartAt.getTime()) / (86400000)
    );

    return {
      userCharacterId,
      characterName: uc.character.name,
      affectionScore: uc.affectionScore,
      currentStage: {
        level: currentStage.level,
        name: currentStage.nameKo,
        description: currentStage.description,
        speechStyle: currentStage.speechStyle,
      },
      daysTogether,
      relationshipStartAt: uc.relationshipStartAt,
      stageHistory: uc.stageHistory,
      unlockedRewards: uc.relationshipRewards,
      allStages: RELATIONSHIP_STAGES.map((s) => ({
        level: s.level,
        name: s.nameKo,
        minAffection: s.minAffection,
        maxAffection: s.maxAffection,
        rewards: s.rewards.map((r) => ({ key: r, label: REWARD_LABELS[r] ?? r })),
        isCurrent: s.level === uc.relationshipLevel,
        isUnlocked: s.level <= uc.relationshipLevel,
      })),
    };
  }

  async progressAffection(
    userCharacterId: string,
    delta: number,
    reason: string
  ): Promise<{ affectionScore: number; stageChanged: boolean; newStage?: StageInfo }> {
    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    if (!uc) return { affectionScore: 50, stageChanged: false };

    const nextAffection = Math.max(0, Math.min(100, uc.affectionScore + delta));
    const newStageInfo = this.getStageByAffection(nextAffection);
    const stageChanged = newStageInfo.level !== uc.relationshipLevel;

    await prisma.userCharacter.update({
      where: { id: userCharacterId },
      data: {
        affectionScore: nextAffection,
        relationshipLevel: newStageInfo.level,
        ...(stageChanged ? { relationshipStageAt: new Date() } : {}),
      },
    });

    if (stageChanged) {
      await prisma.relationshipStageHistory.create({
        data: {
          userCharacterId,
          stageLevel: newStageInfo.level,
          stageName: newStageInfo.nameKo,
        },
      });

      await memoryTimelineService.record({
        userCharacterId,
        eventType: 'STAGE_UP',
        title: `${newStageInfo.nameKo}이(가) 되었어요`,
        description: newStageInfo.description,
        emoji: '💕',
        emotionalIntensity: 0.9,
        metadata: { stageLevel: newStageInfo.level, reason },
      });

      await relationshipRewardService.unlockStageRewards(userCharacterId, newStageInfo.level);
    }

    return {
      affectionScore: nextAffection,
      stageChanged,
      newStage: stageChanged ? newStageInfo : undefined,
    };
  }

  async initializeJourney(userCharacterId: string, characterName: string): Promise<void> {
    const existing = await prisma.memoryTimeline.count({
      where: { userCharacterId, eventType: 'FIRST_MEET' },
    });
    if (existing > 0) return;

    await memoryTimelineService.record({
      userCharacterId,
      eventType: 'FIRST_MEET',
      title: `${characterName}와(과) 첫 만남`,
      description: '우리의 첫 시작',
      emoji: '😊',
      emotionalIntensity: 0.8,
    });

    await prisma.relationshipStageHistory.create({
      data: {
        userCharacterId,
        stageLevel: 1,
        stageName: '처음 만남',
      },
    });
  }

  hasReward(userCharacterId: string, rewardKey: string): Promise<boolean> {
    return prisma.relationshipReward
      .findUnique({
        where: { userCharacterId_rewardKey: { userCharacterId, rewardKey } },
      })
      .then((r) => r != null);
  }
}

export const relationshipJourneyService = new RelationshipJourneyService();
