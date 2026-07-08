import { createHash } from 'crypto';
import { LivingEmotion, LifeEventType } from '@prisma/client';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import type { DailyProbabilityRoll, LivingEvent } from './types.js';
import { randomInt, randomPick } from '../../utils/push.utils.js';

/**
 * RandomEventGenerator — 확률 기반 일일 이벤트 생성
 */
export class RandomEventGenerator {
  /** 하루 확률 roll (재현 가능한 seed) */
  rollDailyProbabilities(userCharacterId: string, dateStr: string): DailyProbabilityRoll {
    const seed = createHash('sha256')
      .update(`${userCharacterId}:${dateStr}:prob`)
      .digest('hex');

    const roll = (offset: number, threshold: number) => {
      const byte = parseInt(seed.slice(offset, offset + 2), 16);
      return byte / 255 < threshold;
    };

    const probs = LIVING_AI_CONFIG.DAILY_PROBABILITIES;

    return {
      contactToday: roll(0, probs.contactToday),
      photoToday: roll(2, probs.photoToday),
      selfieToday: roll(4, probs.selfieToday),
      poutyToday: roll(6, probs.poutyToday),
      jealousToday: roll(8, probs.jealousToday),
      drinkingToday: roll(10, probs.drinkingToday),
      lateNightSnackToday: roll(12, probs.lateNightSnackToday),
      eventToday: roll(14, probs.eventToday),
      seed,
    };
  }

  /** 이벤트 0~2개 생성 */
  generateEvents(
    userCharacterId: string,
    dateStr: string,
    rolls: DailyProbabilityRoll,
    scheduledTimes: Date[]
  ): LivingEvent[] {
    if (!rolls.eventToday) return [];

    const events: LivingEvent[] = [];
    const defs = Object.entries(LIVING_AI_CONFIG.EVENT_DEFINITIONS) as Array<
      [string, { categorySlug: string; emotion: LivingEmotion; weight: number }]
    >;

    const eventCount = rolls.selfieToday && rolls.photoToday ? randomInt(1, 2) : 1;

    for (let i = 0; i < eventCount; i++) {
      const type = this.weightedEventPick(defs, `${rolls.seed}:${i}`);
      if (!type) continue;

      const def = LIVING_AI_CONFIG.EVENT_DEFINITIONS[type as keyof typeof LIVING_AI_CONFIG.EVENT_DEFINITIONS];
      if (!def) continue;

      // 조건부 이벤트 필터
      if (type === 'DRINKING' && !rolls.drinkingToday) continue;
      if (type === 'LATE_NIGHT_SNACK' && !rolls.lateNightSnackToday) continue;
      if (type === 'SELFIE' && !rolls.selfieToday) continue;

      const scheduledAt = scheduledTimes[i] ?? scheduledTimes[0];
      if (!scheduledAt) continue;

      events.push({
        eventType: type as LifeEventType,
        categorySlug: def.categorySlug,
        emotion: def.emotion,
        scheduledAt,
        probability: def.weight,
        message: this.eventMessage(type, rolls),
      });
    }

    return events;
  }

  private weightedEventPick(
    defs: Array<[string, { weight: number }]>,
    seed: string
  ): string | null {
    const hash = createHash('md5').update(seed).digest();
    const total = defs.reduce((s, [, d]) => s + d.weight, 0);
    let r = (hash[0] / 255) * total;

    for (const [type, def] of defs) {
      r -= def.weight;
      if (r <= 0) return type;
    }
    return defs.length > 0 ? defs[0][0] : null;
  }

  private eventMessage(eventType: string, rolls: DailyProbabilityRoll): string | undefined {
    const templates: Record<string, string[]> = {
      HAIR: ['오늘 머리했는데 어때? 💇‍♀️', '미용실 다녀왔어~'],
      NAIL: ['네일 했어! 어때? 💅', '손톱 예쁘지?'],
      CAFE: ['카페 왔어 ☕', '라떼 마시는 중~'],
      SELFIE: ['지금 셀카 찍었어 📸', '오늘 기분 좋아~'],
      DRINKING: ['어제 한잔했음ㅋㅋ', '해장 중이야...'],
      LATE_NIGHT_SNACK: ['야식 먹고 싶다...', '떡볶이 땡겨 🍢'],
      RAIN: ['비 와서 우산 썼어 ☔', '비 오는 날 기분 이상해'],
      EXERCISE: ['운동 다녀왔어!', '땀 흘렸어 ㅎㅎ'],
    };

    if (rolls.poutyToday && Math.random() < 0.5) {
      return randomPick(['별론가… 😥', '왜 답장 안 해...']);
    }
    if (rolls.jealousToday && Math.random() < 0.4) {
      return randomPick(['누구랑 얘기해? 😤', '나만 봐...']);
    }

    const msgs = templates[eventType];
    return msgs ? randomPick(msgs) : undefined;
  }
}

export const randomEventGenerator = new RandomEventGenerator();
