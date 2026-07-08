import { describe, it, expect } from 'vitest';
import { dailyRoutineGenerator } from '../src/lib/living-ai/daily-routine-generator.js';
import { randomEventGenerator } from '../src/lib/living-ai/random-event-generator.js';
import { emotionStateManager } from '../src/lib/living-ai/emotion-state-manager.js';
import { relationshipEventEngine } from '../src/lib/living-ai/relationship-event-engine.js';
import { messageVariation } from '../src/lib/living-ai/message-variation.js';
import { LIVING_AI_CONFIG } from '../src/config/living-ai.config.js';

describe('DailyRoutineGenerator', () => {
  it('generates routine with jittered times', () => {
    const date = new Date('2026-07-08T00:00:00Z');
    const routine = dailyRoutineGenerator.generate('uc-1', date, 'Asia/Seoul', 'test-seed');

    expect(routine.activities.length).toBe(LIVING_AI_CONFIG.BASE_ROUTINE_TEMPLATE.length);
    expect(routine.daySeed).toBe('test-seed');

    const times = routine.activities.map((a) => a.time);
    const uniqueTimes = new Set(times);
    expect(uniqueTimes.size).toBe(times.length);
  });

  it('returns current activity based on time', () => {
    const date = new Date('2026-07-08T00:00:00Z');
    const routine = dailyRoutineGenerator.generate('uc-1', date, 'Asia/Seoul', 'seed-2');
    const noon = new Date(routine.activities[3]?.scheduledAt ?? Date.now());
    const current = dailyRoutineGenerator.getCurrentActivity(routine, noon, 'Asia/Seoul');
    expect(current).not.toBeNull();
  });
});

describe('RandomEventGenerator', () => {
  it('rolls daily probabilities deterministically per seed', () => {
    const a = randomEventGenerator.rollDailyProbabilities('uc-1', '2026-07-08');
    const b = randomEventGenerator.rollDailyProbabilities('uc-1', '2026-07-08');
    expect(a).toEqual(b);
  });

  it('generates events when eventToday is true', () => {
    const rolls = {
      contactToday: true,
      photoToday: true,
      selfieToday: true,
      poutyToday: false,
      jealousToday: false,
      drinkingToday: false,
      lateNightSnackToday: false,
      eventToday: true,
      seed: 'abc',
    };
    const events = randomEventGenerator.generateEvents('uc-1', '2026-07-08', rolls, [
      new Date('2026-07-08T12:00:00Z'),
    ]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].categorySlug).toBeTruthy();
  });
});

describe('EmotionStateManager', () => {
  it('infers emotion from activity category', () => {
    expect(emotionStateManager.inferFromActivity('hair', 14)).toBe('embarrassed');
    expect(emotionStateManager.inferFromActivity('coffee', 10)).toBe('happy');
    expect(emotionStateManager.inferFromActivity('unknown', 23)).toBe('sleepy');
  });

  it('maps to photo emotion', () => {
    expect(emotionStateManager.toPhotoEmotion('love')).toBe('loving');
    expect(emotionStateManager.toPhotoEmotion('embarrassed')).toBe('shy');
  });
});

describe('RelationshipEventEngine', () => {
  it('tiers affection correctly', () => {
    expect(relationshipEventEngine.getAffectionTier(20)).toBe('low');
    expect(relationshipEventEngine.getAffectionTier(50)).toBe('mid');
    expect(relationshipEventEngine.getAffectionTier(80)).toBe('high');
  });

  it('styles high affection messages with extras', () => {
    const msg = relationshipEventEngine.styleMessage('오늘 머리했어', '은선', 'high', true);
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('MessageVariation', () => {
  it('removes robotic greetings', () => {
    const result = messageVariation.avoidGreeting('안녕하세요 오늘 뭐해?');
    expect(result).not.toContain('안녕하세요');
  });
});
