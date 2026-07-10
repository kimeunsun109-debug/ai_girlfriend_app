import { describe, it, expect } from 'vitest';
import {
  getTimeOfDay,
  pickTodaysHero,
  CHARACTER_MEET_THEMES,
  EMOTIONAL_STATE_MAP,
} from '../src/config/character-meet.config.js';

describe('character-meet.config', () => {
  it('maps hours to time of day', () => {
    expect(getTimeOfDay(8)).toBe('morning');
    expect(getTimeOfDay(14)).toBe('afternoon');
    expect(getTimeOfDay(19)).toBe('evening');
    expect(getTimeOfDay(23)).toBe('night');
  });

  it('picks deterministic hero for the day', () => {
    const slugs = ['yuna', 'narin', 'yunseo', 'eunha', 'jiyu'];
    const a = pickTodaysHero(slugs, 'user:2026-07-10');
    const b = pickTodaysHero(slugs, 'user:2026-07-10');
    expect(a).toBe(b);
    expect(slugs).toContain(a);
  });

  it('defines themes for all five characters', () => {
    for (const slug of ['yuna', 'narin', 'yunseo', 'eunha', 'jiyu']) {
      expect(CHARACTER_MEET_THEMES[slug]?.heroPhoto).toBeTruthy();
    }
  });

  it('uses emotional labels instead of numeric affection', () => {
    expect(EMOTIONAL_STATE_MAP.love?.label).toContain('보고');
    expect(EMOTIONAL_STATE_MAP.waiting?.label).toContain('기다리');
  });
});
