/**
 * Living AI — 살아있는 여자친구 시뮬레이션 설정
 */
export const LIVING_AI_CONFIG = {
  /** 일과 시간 랜덤 변동 (분) */
  ROUTINE_JITTER_MINUTES: { min: 30, max: 90 },

  /** 단기 기억 유지 시간 (시간) */
  SHORT_TERM_MEMORY_HOURS: 24,

  /** 감정 자연 감쇠 간격 (시간) */
  EMOTION_DECAY_HOURS: 4,

  /** 호감도 범위 */
  AFFECTION: { min: 0, max: 100, default: 50 },

  /** 일일 행동 확률 (0~1) — 매일 roll, 같은 패턴 방지 */
  DAILY_PROBABILITIES: {
    contactToday: 0.65,
    photoToday: 0.45,
    selfieToday: 0.22,
    poutyToday: 0.07,
    jealousToday: 0.05,
    drinkingToday: 0.08,
    lateNightSnackToday: 0.12,
    eventToday: 0.35,
  },

  /** 요일별 연락 가중치 (0=일) — 불규칙성 강화 */
  DAY_CONTACT_WEIGHTS: {
    0: 0.9,  // 일
    1: 0.7,  // 월
    2: 0.5,  // 화 — 연락 적음
    3: 0.75, // 수
    4: 0.85, // 목
    5: 0.65, // 금
    6: 0.55, // 토 — 가끔 0회
  } as Record<number, number>,

  /** 호감도별 행동 배율 */
  AFFECTION_BEHAVIOR: {
    low: { maxMessageLength: 40, nameFrequency: 0.1, initiativeBonus: -0.2, photoBonus: -0.15 },
    mid: { maxMessageLength: 80, nameFrequency: 0.3, initiativeBonus: 0, photoBonus: 0 },
    high: { maxMessageLength: 120, nameFrequency: 0.6, initiativeBonus: 0.25, photoBonus: 0.2 },
  },

  /** 기본 일과 템플릿 (시간은 HH:MM, jitter 적용) */
  BASE_ROUTINE_TEMPLATE: [
    { time: '07:30', activity: 'wake', label: '기상', categorySlug: 'morning' },
    { time: '08:10', activity: 'prepare', label: '출근 준비', categorySlug: 'selfie' },
    { time: '09:00', activity: 'commute', label: '출근', categorySlug: 'selfie' },
    { time: '12:20', activity: 'lunch', label: '점심', categorySlug: 'tteokbokki' },
    { time: '15:30', activity: 'coffee', label: '커피', categorySlug: 'coffee' },
    { time: '18:40', activity: 'leave_work', label: '퇴근', categorySlug: 'leave' },
    { time: '20:30', activity: 'exercise', label: '운동', categorySlug: 'exercise' },
    { time: '22:30', activity: 'bed', label: '침대', categorySlug: 'morning' },
    { time: '23:50', activity: 'sleep', label: '취침', categorySlug: 'home' },
  ],

  /** 이벤트 타입별 category slug + 기본 감정 */
  EVENT_DEFINITIONS: {
    HAIR: { categorySlug: 'hair', emotion: 'EMBARRASSED' as const, weight: 0.08 },
    NAIL: { categorySlug: 'nail', emotion: 'HAPPY' as const, weight: 0.07 },
    SHOPPING: { categorySlug: 'weekend', emotion: 'EXCITED' as const, weight: 0.06 },
    CAFE: { categorySlug: 'coffee', emotion: 'HAPPY' as const, weight: 0.1 },
    EXERCISE: { categorySlug: 'exercise', emotion: 'EXCITED' as const, weight: 0.08 },
    MOVIE: { categorySlug: 'weekend', emotion: 'HAPPY' as const, weight: 0.05 },
    DRIVE: { categorySlug: 'weekend', emotion: 'LOVE' as const, weight: 0.04 },
    WALK: { categorySlug: 'walk', emotion: 'HAPPY' as const, weight: 0.07 },
    LATE_NIGHT_SNACK: { categorySlug: 'tteokbokki', emotion: 'HUNGRY' as const, weight: 0.12 },
    DRINKING: { categorySlug: 'alcohol', emotion: 'TIRED' as const, weight: 0.08 },
    RAIN: { categorySlug: 'rain', emotion: 'LOVE' as const, weight: 0.06 },
    SICK: { categorySlug: 'sad', emotion: 'SAD' as const, weight: 0.03 },
    SELFIE: { categorySlug: 'selfie', emotion: 'HAPPY' as const, weight: 0.22 },
    NEW_OUTFIT: { categorySlug: 'happy', emotion: 'EXCITED' as const, weight: 0.05 },
  },

  /** 단기 기억 토픽 키워드 추출 */
  MEMORY_KEYWORDS: {
    감기: { topic: '감기', emotion: 'SAD' as const },
    시험: { topic: '시험', emotion: 'TIRED' as const },
    야근: { topic: '야근', emotion: 'TIRED' as const },
    회의: { topic: '회의', emotion: 'TIRED' as const },
    운동: { topic: '운동', emotion: 'HAPPY' as const },
    약속: { topic: '약속', emotion: 'EXCITED' as const },
    비: { topic: '비', emotion: 'NEUTRAL' as const },
    우산: { topic: '비', emotion: 'NEUTRAL' as const },
    늦잠: { topic: '늦잠', emotion: 'SLEEPY' as const },
  },

  /** 장기 기억 추출 패턴 */
  LONG_TERM_PATTERNS: [
    { pattern: /(.+?) 좋아해/, category: 'PREFERENCE' as const },
    { pattern: /(.+?) 싫어/, category: 'DISLIKE' as const },
    { pattern: /생일.*?(\d{1,2})월/, category: 'BIRTHDAY' as const },
    { pattern: /직업|일해|회사/, category: 'JOB' as const },
  ],
} as const;

export type LivingEmotionSlug =
  | 'happy' | 'sleepy' | 'sad' | 'excited' | 'angry'
  | 'embarrassed' | 'love' | 'bored' | 'hungry' | 'tired' | 'neutral';
