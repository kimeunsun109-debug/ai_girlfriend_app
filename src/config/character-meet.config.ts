/**
 * Character Meet Screen — visual DNA & UX metadata
 * Goal: "누군가와 만나러 들어온 느낌"
 */
import type { CharacterVisualSpec } from '../data/character-specs.js';

export interface CharacterMeetTheme {
  /** CSS gradient for card overlay */
  gradient: string;
  /** Accent color for glow / border */
  accent: string;
  /** Mood keywords for UI copy */
  mood: string;
  /** Hero cover photo (relative to /assets/photos/) */
  heroPhoto: string;
  /** Optional secondary for parallax layer */
  ambientPhoto?: string;
}

export const CHARACTER_MEET_THEMES: Record<string, CharacterMeetTheme> = {
  yuna: {
    gradient: 'linear-gradient(180deg, transparent 30%, rgba(255, 236, 220, 0.92) 100%)',
    accent: '#E8B4A0',
    mood: '따뜻한 조명 · 웃는 얼굴',
    heroPhoto: 'yuna/hair/6ad876ce59fc0862.jpg',
    ambientPhoto: 'yuna/coffee/91444de42876e6a3.jpg',
  },
  narin: {
    gradient: 'linear-gradient(180deg, transparent 25%, rgba(30, 35, 48, 0.88) 100%)',
    accent: '#8B9DC3',
    mood: '무표정 · 고양이상 · 차가운 색감',
    heroPhoto: 'narin/hair/6ad876ce59fc0862.jpg',
    ambientPhoto: 'narin/coffee/b172da8bd0450e04.jpg',
  },
  yunseo: {
    gradient: 'linear-gradient(180deg, transparent 30%, rgba(45, 52, 64, 0.85) 100%)',
    accent: '#6B7B8C',
    mood: '도시적인 느낌',
    heroPhoto: 'yunseo/rain/577982c7db09f47c.jpg',
    ambientPhoto: 'yunseo/overtime/15fc4612a7c520d2.jpg',
  },
  eunha: {
    gradient: 'linear-gradient(180deg, transparent 35%, rgba(240, 228, 248, 0.9) 100%)',
    accent: '#C9A8E0',
    mood: '잔잔한 감성',
    heroPhoto: 'eunha/coffee/8ce147c3d14e35fc.jpg',
    ambientPhoto: 'eunha/coffee/7e94472dc622c87e.jpg',
  },
  jiyu: {
    gradient: 'linear-gradient(180deg, transparent 28%, rgba(255, 214, 196, 0.9) 100%)',
    accent: '#FF9B7A',
    mood: '활발한 느낌',
    heroPhoto: 'jiyu/coffee/cf066809ed2fd1b6.jpg',
    ambientPhoto: 'jiyu/tteokbokki/393a407e27fe9d42.jpg',
  },
};

/** 현재 활동 → 상태 표시 */
export const ACTIVITY_STATUS_MAP: Record<string, { emoji: string; label: string }> = {
  wake: { emoji: '🌅', label: '막 일어났어' },
  prepare: { emoji: '💄', label: '출근 준비 중' },
  commute: { emoji: '🚗', label: '이동 중' },
  lunch: { emoji: '🍜', label: '밥 먹는 중' },
  coffee: { emoji: '☕', label: '카페에서 쉬는 중' },
  leave_work: { emoji: '🏠', label: '퇴근했어' },
  exercise: { emoji: '🏃', label: '운동 중' },
  bed: { emoji: '🌙', label: '잠들 준비 중' },
  sleep: { emoji: '😴', label: '자는 중' },
  study: { emoji: '📚', label: '공부 중' },
  drive: { emoji: '🚗', label: '운전 중' },
  walk: { emoji: '🚶', label: '산책 중' },
  default: { emoji: '💭', label: '뭔가 하고 있어' },
};

/** 감정 상태 (호감도 숫자 대신) */
export const EMOTIONAL_STATE_MAP: Record<
  string,
  { emoji: string; label: string }
> = {
  love: { emoji: '❤️', label: '보고 싶어함' },
  happy: { emoji: '😊', label: '기분 좋음' },
  waiting: { emoji: '🥺', label: '기다리는 중' },
  sleepy: { emoji: '😴', label: '자는 중' },
  sad: { emoji: '🥺', label: '조금 서운함' },
  excited: { emoji: '😊', label: '신나 있음' },
  bored: { emoji: '😑', label: '심심해' },
  neutral: { emoji: '🙂', label: '평온함' },
  tired: { emoji: '😴', label: '피곤함' },
  hungry: { emoji: '🍜', label: '배고파' },
};

export const GREETING_BY_HOUR: Record<'morning' | 'afternoon' | 'evening' | 'night', string> = {
  morning: 'Good Morning.',
  afternoon: 'Good Afternoon.',
  evening: 'Good Evening.',
  night: 'Good Night.',
};

export const GREETING_SUB_BY_HOUR: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: ['오늘도 기다리고 있었어.', '일어났어? 나도 막 일어났어.', '좋은 아침이야.'],
  afternoon: ['오늘 하루 어때?', '심심해서 네 생각했어.', '갑자기 보고 싶더라.'],
  evening: ['오늘도 기다리고 있었어.', '퇴근했어? 나도 이제 쉬려고.', '저녁인데 뭐 해?'],
  night: ['아직 안 자?', '나 잠들기 전에 인사하려고.', '오늘 하루 고생했어.'],
};

export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function pickTodaysHero(slugs: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return slugs[hash % slugs.length]!;
}

export function getMeetTheme(slug: string): CharacterMeetTheme {
  return CHARACTER_MEET_THEMES[slug] ?? CHARACTER_MEET_THEMES.yuna;
}

export function specTagline(spec: CharacterVisualSpec): string {
  return spec.characterDNA;
}
