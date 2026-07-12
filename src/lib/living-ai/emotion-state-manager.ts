import { PrismaClient, LivingEmotion } from '@prisma/client';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import {
  LIVING_EMOTION_TO_SLUG,
  SLUG_TO_LIVING_EMOTION,
  type LivingEmotionSlug,
} from './types.js';
import { randomPick } from '../../utils/push.utils.js';

const prisma = new PrismaClient();

export interface EmotionTransitionInput {
  userCharacterId: string;
  /** 대화 긍정/부정 */
  replySentiment?: 'positive' | 'negative' | 'neutral';
  /** 시간대 (0-23) */
  hour?: number;
  /** 이벤트 감정 */
  eventEmotion?: LivingEmotion;
  /** 호감도 변화 */
  affectionDelta?: number;
  /** 날씨 */
  isRainy?: boolean;
}

/**
 * EmotionStateManager — 캐릭터 감정 상태 유지·변화
 */
export class EmotionStateManager {
  async getState(userCharacterId: string) {
    return prisma.characterEmotionState.findUnique({ where: { userCharacterId } });
  }

  async getEmotionSlug(userCharacterId: string): Promise<LivingEmotionSlug> {
    const state = await this.getState(userCharacterId);
    if (!state) return 'neutral';
    return LIVING_EMOTION_TO_SLUG[state.emotion];
  }

  async ensureState(userCharacterId: string): Promise<void> {
    await prisma.characterEmotionState.upsert({
      where: { userCharacterId },
      create: { userCharacterId, emotion: 'NEUTRAL', intensity: 0.5 },
      update: {},
    });
  }

  async applyTransition(input: EmotionTransitionInput): Promise<LivingEmotionSlug> {
    await this.ensureState(input.userCharacterId);
    const current = await this.getState(input.userCharacterId);
    if (!current) return 'neutral';

    let next: LivingEmotion = current.emotion;
    let intensity = current.intensity;
    const triggers: string[] = [];

    if (input.eventEmotion) {
      next = input.eventEmotion;
      intensity = 0.75;
      triggers.push('event');
    }

    if (input.replySentiment === 'positive') {
      next = intensity > 0.6 ? 'LOVE' : 'HAPPY';
      intensity = Math.min(1, intensity + 0.15);
      triggers.push('positive_reply');
    } else if (input.replySentiment === 'negative') {
      next = 'SAD';
      intensity = Math.min(1, intensity + 0.2);
      triggers.push('negative_reply');
    }

    if (input.hour != null) {
      if (input.hour >= 22 || input.hour < 7) {
        next = 'SLEEPY';
        triggers.push('late_night');
      } else if (input.hour >= 12 && input.hour < 14) {
        if (Math.random() < 0.3) next = 'HUNGRY';
      }
    }

    if (input.isRainy) {
      if (Math.random() < 0.4) {
        next = 'LOVE';
        triggers.push('rain');
      }
    }

    if (input.affectionDelta) {
      if (input.affectionDelta > 0 && next === 'NEUTRAL') next = 'HAPPY';
      if (input.affectionDelta < -2) next = 'SAD';
    }

    // 자연 감쇠 — 오래된 강한 감정 완화
    const hoursSince =
      (Date.now() - current.updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince > LIVING_AI_CONFIG.EMOTION_DECAY_HOURS) {
      intensity = Math.max(0.4, intensity - 0.1);
      if (['ANGRY', 'SAD'].includes(next) && Math.random() < 0.3) {
        next = 'NEUTRAL';
      }
    }

    await prisma.characterEmotionState.update({
      where: { userCharacterId: input.userCharacterId },
      data: {
        emotion: next,
        intensity,
        triggers: triggers.slice(-5),
      },
    });

    return LIVING_EMOTION_TO_SLUG[next];
  }

  /** 활동/상황 → 감정 추론 */
  inferFromActivity(categorySlug: string, hour: number): LivingEmotionSlug {
    const map: Record<string, LivingEmotionSlug> = {
      hair: 'embarrassed',
      coffee: 'happy',
      morning: 'sleepy',
      alcohol: 'tired',
      sad: 'sad',
      rain: 'love',
      exercise: 'excited',
      game: 'excited',
      tteokbokki: 'hungry',
      overtime: 'tired',
    };
    if (map[categorySlug]) return map[categorySlug];
    if (hour >= 22) return 'sleepy';
    return 'happy';
  }

  toPhotoEmotion(slug: LivingEmotionSlug): string {
    const photoMap: Record<LivingEmotionSlug, string> = {
      happy: 'happy',
      sleepy: 'sleepy',
      sad: 'sad',
      excited: 'excited',
      angry: 'sad',
      embarrassed: 'shy',
      love: 'loving',
      bored: 'neutral',
      hungry: 'happy',
      tired: 'tired',
      neutral: 'neutral',
    };
    return photoMap[slug];
  }

  fromSlug(slug: LivingEmotionSlug): LivingEmotion {
    return SLUG_TO_LIVING_EMOTION[slug] ?? 'NEUTRAL';
  }

  randomMoodVariation(base: LivingEmotionSlug): LivingEmotionSlug {
    const variations: Record<LivingEmotionSlug, LivingEmotionSlug[]> = {
      happy: ['happy', 'excited', 'love'],
      sleepy: ['sleepy', 'tired'],
      sad: ['sad', 'bored'],
      excited: ['excited', 'happy'],
      angry: ['angry', 'sad'],
      embarrassed: ['embarrassed', 'happy'],
      love: ['love', 'happy'],
      bored: ['bored', 'neutral'],
      hungry: ['hungry', 'happy'],
      tired: ['tired', 'sleepy'],
      neutral: ['neutral', 'happy', 'bored'],
    };
    return randomPick(variations[base] ?? ['neutral']);
  }
}

export const emotionStateManager = new EmotionStateManager();
