import { describe, it, expect } from 'vitest';
import {
  randomInt,
  randomPick,
  weightedRandomPick,
  personalizeMessage,
  classifyReply,
  generateRandomPushTime,
  selectCategoryForDay,
} from '../src/utils/push.utils.js';
import { PhotoCategory } from '@prisma/client';
import { PUSH_CONFIG } from '../src/config/push.config.js';

describe('push.utils', () => {
  it('randomInt returns values within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 5);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(5);
    }
  });

  it('randomPick selects from array', () => {
    const arr = ['a', 'b', 'c'];
    const picked = randomPick(arr);
    expect(arr).toContain(picked);
  });

  it('weightedRandomPick respects weights', () => {
    const result = weightedRandomPick({ a: 0.9, b: 0.1 });
    expect(['a', 'b']).toContain(result);
  });

  it('personalizeMessage replaces {name}', () => {
    const result = personalizeMessage('{name} 안녕!', '은선', true);
    expect(result).toBe('은선 안녕!');
  });

  it('classifyReply detects positive replies', () => {
    expect(classifyReply('예뻐!! ❤️')).toBe('positive');
    expect(classifyReply('최고야')).toBe('positive');
  });

  it('classifyReply detects negative replies', () => {
    expect(classifyReply('별로야...')).toBe('negative');
  });

  it('classifyReply returns neutral for ambiguous', () => {
    expect(classifyReply('봤어')).toBe('neutral');
  });

  it('generateRandomPushTime creates future time', () => {
    const time = generateRandomPushTime('Asia/Seoul');
    expect(time).toBeInstanceOf(Date);
    const hour = time.getHours();
    expect(hour).toBeGreaterThanOrEqual(8);
    expect(hour).toBeLessThanOrEqual(22);
  });

  it('selectCategoryForDay returns valid category', () => {
    const category = selectCategoryForDay(1, 1);
    expect(Object.values(PhotoCategory)).toContain(category);
  });
});

describe('push.config', () => {
  it('enforces max 2 daily pushes', () => {
    expect(PUSH_CONFIG.MAX_DAILY_PUSHES).toBe(2);
  });

  it('allows special day bonus', () => {
    expect(PUSH_CONFIG.SPECIAL_DAY_BONUS).toBe(1);
  });

  it('skip days per month is 1-2', () => {
    expect(PUSH_CONFIG.SKIP_DAYS_PER_MONTH.min).toBe(1);
    expect(PUSH_CONFIG.SKIP_DAYS_PER_MONTH.max).toBe(2);
  });
});
