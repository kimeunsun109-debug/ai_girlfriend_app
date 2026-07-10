import { PrismaClient } from '@prisma/client';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import type { LivingPushContext } from './types.js';
import { randomPick } from '../../utils/push.utils.js';
import { polishCharacterMessage } from '../natural-conversation/index.js';
import { relationshipJourneyService } from '../relationship-journey/relationship-journey.service.js';

const prisma = new PrismaClient();

export type AffectionTier = 'low' | 'mid' | 'high';

/**
 * RelationshipEventEngine — 호감도에 따른 행동 변화
 */
export class RelationshipEventEngine {
  getAffectionTier(score: number): AffectionTier {
    if (score < 35) return 'low';
    if (score < 70) return 'mid';
    return 'high';
  }

  getBehavior(tier: AffectionTier) {
    const map = {
      low: LIVING_AI_CONFIG.AFFECTION_BEHAVIOR.low,
      mid: LIVING_AI_CONFIG.AFFECTION_BEHAVIOR.mid,
      high: LIVING_AI_CONFIG.AFFECTION_BEHAVIOR.high,
    };
    return map[tier];
  }

  /** 호감도 변화 적용 → Relationship Journey 연동 */
  async adjustAffection(
    userCharacterId: string,
    delta: number,
    reason: string
  ): Promise<number> {
    const result = await relationshipJourneyService.progressAffection(
      userCharacterId,
      delta,
      reason
    );
    return result.affectionScore;
  }

  /** 답장에 따른 호감도 */
  async onUserReply(
    userCharacterId: string,
    sentiment: 'positive' | 'negative' | 'neutral',
    hasEmoji: boolean
  ): Promise<number> {
    let delta = 0;
    if (sentiment === 'positive') delta = hasEmoji ? 3 : 2;
    else if (sentiment === 'negative') delta = -2;
    else delta = 0.5;

    return this.adjustAffection(userCharacterId, delta, `reply:${sentiment}`);
  }

  /** 호감도 기반 연락 확률 보정 */
  getContactProbabilityBonus(affectionScore: number): number {
    const tier = this.getAffectionTier(affectionScore);
    return this.getBehavior(tier).initiativeBonus;
  }

  /** 호감도 기반 메시지 스타일 */
  styleMessage(
    message: string,
    userName: string,
    tier: AffectionTier,
    useName: boolean,
    characterSlug?: string
  ): string {
    const behavior = this.getBehavior(tier);
    let result = message;

    if (tier === 'low') {
      result = message.length > behavior.maxMessageLength
        ? message.slice(0, behavior.maxMessageLength) + '...'
        : message;
    } else if (tier === 'high') {
      const highExtras = [
        '보고 싶어 💕',
        '심심해~',
        '뭐해?',
        '나 생각해?',
      ];
      if (Math.random() < 0.25) {
        result = `${result} ${randomPick(highExtras)}`;
      }
      if (Math.random() < behavior.nameFrequency && useName && !result.includes(userName)) {
        result = `${userName}~ ${result}`;
      }
      if (Math.random() < 0.15) {
        result = randomPick(['ㅋㅋ ', '헤헤 ', '']) + result;
      }
    }

    return polishCharacterMessage(result, { userName, useName, characterSlug });
  }

  buildPushContext(
    affectionScore: number,
    categorySlug: string,
    emotionSlug: string,
    contentStyle: string
  ): Pick<LivingPushContext, 'affectionLevel' | 'useName' | 'contentStyle'> {
    const tier = this.getAffectionTier(affectionScore);
    const behavior = this.getBehavior(tier);
    return {
      affectionLevel: tier,
      useName: Math.random() < behavior.nameFrequency,
      contentStyle,
    };
  }
}

export const relationshipEventEngine = new RelationshipEventEngine();
