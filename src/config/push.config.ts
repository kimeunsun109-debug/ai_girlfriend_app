export const PUSH_CONFIG = {
  /** 하루 기본 최대 발송 횟수 */
  MAX_DAILY_PUSHES: 2,
  /** 특별한 날 추가 발송 횟수 */
  SPECIAL_DAY_BONUS: 1,
  /** 월간 일부러 안 보내는 날 (min, max) */
  SKIP_DAYS_PER_MONTH: { min: 1, max: 2 },
  /** 기본 일일 발송 목표 (0~2, 평균 1~2) */
  TARGET_DAILY_PUSHES: { min: 0, max: 2, average: 1.5 },
  /** 참여도 기반 빈도 조절 범위 */
  FREQUENCY_MULTIPLIER: { min: 0.5, max: 1.5 },
  /** 무반응 시 쉬는 기간 (일) */
  INACTIVE_COOLDOWN_DAYS: { min: 2, max: 5 },
  /** 같은 사진 재사용 최소 간격 (일) */
  PHOTO_REUSE_COOLDOWN_DAYS: 90,
  /** 같은 메시지 재사용 최소 간격 (일) */
  MESSAGE_REUSE_COOLDOWN_DAYS: 30,
  /** 참여도 점수 가중치 */
  ENGAGEMENT_WEIGHTS: {
    pushClick: 0.15,
    photoView: 0.1,
    reply: 0.25,
    replySpeed: 0.15,
    conversationLength: 0.15,
    like: 0.1,
    emoji: 0.1,
  },
  /** 후속 반응 지연 시간 (분) */
  FOLLOW_UP_DELAYS: {
    AFTER_30_MIN: 30,
    AFTER_2_HOURS: 120,
    NEXT_DAY: 1440,
  },
  /** 스케줄러 실행 간격 (분) */
  SCHEDULER_INTERVAL_MINUTES: 5,
  /** 앱 미사용 기간별 전략 */
  INACTIVITY_STRATEGIES: {
    DAYS_1_3: { frequencyMultiplier: 1.0, contentStyle: 'normal' },
    DAYS_4_7: { frequencyMultiplier: 0.8, contentStyle: 'gentle' },
    DAYS_8_14: { frequencyMultiplier: 0.5, contentStyle: 'soft' },
    DAYS_15_PLUS: { frequencyMultiplier: 0.3, contentStyle: 'miss_you' },
  },
} as const;

export type ContentStyle = 'normal' | 'gentle' | 'soft' | 'miss_you';
