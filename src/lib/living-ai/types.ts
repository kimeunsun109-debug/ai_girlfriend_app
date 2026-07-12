import type { LivingEmotion, LifeEventType, MemoryCategory } from '@prisma/client';

export interface RoutineActivity {
  time: string;       // HH:mm
  activity: string;
  label: string;
  categorySlug: string;
  emotion?: LivingEmotionSlug;
  scheduledAt: string; // ISO
}

export interface DailyRoutine {
  userCharacterId: string;
  date: string;
  timezone: string;
  activities: RoutineActivity[];
  daySeed: string;
}

export interface LivingEvent {
  eventType: LifeEventType;
  categorySlug: string;
  emotion: LivingEmotion;
  scheduledAt: Date;
  message?: string;
  probability: number;
}

export interface LivingPushContext {
  categorySlug: string;
  emotion: LivingEmotionSlug;
  eventMessage?: string;
  activityLabel?: string;
  eventType?: LifeEventType;
  memoryReminder?: string;
  affectionLevel: 'low' | 'mid' | 'high';
  useName: boolean;
  contentStyle: string;
}

export interface DailyProbabilityRoll {
  contactToday: boolean;
  photoToday: boolean;
  selfieToday: boolean;
  poutyToday: boolean;
  jealousToday: boolean;
  drinkingToday: boolean;
  lateNightSnackToday: boolean;
  eventToday: boolean;
  seed: string;
}

export type LivingEmotionSlug =
  | 'happy' | 'sleepy' | 'sad' | 'excited' | 'angry'
  | 'embarrassed' | 'love' | 'bored' | 'hungry' | 'tired' | 'neutral';

export const LIVING_EMOTION_TO_SLUG: Record<LivingEmotion, LivingEmotionSlug> = {
  HAPPY: 'happy',
  SLEEPY: 'sleepy',
  SAD: 'sad',
  EXCITED: 'excited',
  ANGRY: 'angry',
  EMBARRASSED: 'embarrassed',
  LOVE: 'love',
  BORED: 'bored',
  HUNGRY: 'hungry',
  TIRED: 'tired',
  NEUTRAL: 'neutral',
};

export const SLUG_TO_LIVING_EMOTION: Record<LivingEmotionSlug, LivingEmotion> = {
  happy: 'HAPPY',
  sleepy: 'SLEEPY',
  sad: 'SAD',
  excited: 'EXCITED',
  angry: 'ANGRY',
  embarrassed: 'EMBARRASSED',
  love: 'LOVE',
  bored: 'BORED',
  hungry: 'HUNGRY',
  tired: 'TIRED',
  neutral: 'NEUTRAL',
};

export type { MemoryCategory };
