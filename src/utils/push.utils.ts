import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addMinutes, addDays, startOfDay, differenceInDays } from 'date-fns';
import { PhotoCategory } from '@prisma/client';
import { DAY_CATEGORY_WEIGHTS, PUSH_TIME_WINDOWS } from '../data/photo-message-templates.js';

/** 랜덤 정수 (min ~ max 포함) */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 배열에서 랜덤 선택 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 가중치 기반 랜덤 선택 */
export function weightedRandomPick<T extends string | number>(
  weights: Partial<Record<T, number>>
): T | null {
  const entries = Object.entries(weights).filter(([, w]) => (w as number) > 0);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, w]) => sum + (w as number), 0);
  let rand = Math.random() * total;

  for (const [key, weight] of entries) {
    rand -= weight as number;
    if (rand <= 0) return key as T;
  }

  return entries[entries.length - 1][0] as T;
}

/** 사용자 timezone 기준 현재 시간 */
export function getUserNow(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

/** 사용자 timezone 기준 오늘 시작 */
export function getUserTodayStart(timezone: string): Date {
  const now = getUserNow(timezone);
  const todayStr = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  return fromZonedTime(`${todayStr}T00:00:00`, timezone);
}

/** 랜덤 발송 시간 생성 (같은 시간 반복 방지) */
export function generateRandomPushTime(
  timezone: string,
  usedHours: number[] = []
): Date {
  const today = getUserTodayStart(timezone);
  const availableWindows = PUSH_TIME_WINDOWS.filter(
    (w) => !usedHours.includes(w.startHour)
  );
  const window = randomPick(availableWindows.length > 0 ? availableWindows : PUSH_TIME_WINDOWS);

  const hour = randomInt(window.startHour, window.endHour - 1);
  const minute = randomInt(0, 59);

  const dateStr = formatInTimeZone(today, timezone, 'yyyy-MM-dd');
  return fromZonedTime(
    `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    timezone
  );
}

/** 요일별 카테고리 선택 (매주 동일 패턴 방지를 위해 랜덤 요소 추가) */
export function selectCategoryForDay(
  dayOfWeek: number,
  weekNumber: number,
  excludeCategories: PhotoCategory[] = []
): PhotoCategory {
  const baseWeights = { ...DAY_CATEGORY_WEIGHTS[dayOfWeek] };

  // 주차별 변동으로 패턴 반복 방지
  const jitter = (weekNumber % 4) * 0.05;
  for (const key of Object.keys(baseWeights)) {
    const cat = key as PhotoCategory;
    if (excludeCategories.includes(cat)) {
      delete baseWeights[cat];
    } else {
      baseWeights[cat] = (baseWeights[cat] ?? 0) + (Math.random() - 0.5) * jitter;
    }
  }

  const selected = weightedRandomPick(baseWeights);
  return selected ?? PhotoCategory.SELFIE_GENERAL;
}

/** 이름 자연스럽게 삽입 */
export function personalizeMessage(
  message: string,
  userName: string,
  useName: boolean
): string {
  if (message.includes('{name}')) {
    return message.replace(/\{name\}/g, userName);
  }
  if (useName && Math.random() < 0.5) {
    const patterns = [
      `${userName}~ ${message}`,
      `${userName}, ${message}`,
      `${userName} ${message}`,
    ];
    return randomPick(patterns);
  }
  return message;
}

/** 긍정/부정/중립 답장 분류 */
export function classifyReply(content: string): 'positive' | 'negative' | 'neutral' {
  const lower = content.toLowerCase();
  // Dynamic import avoided for sync usage; keywords inlined via module import at call sites
  const positive = ['예뻐', '이쁘', '좋아', '멋져', '최고', '사랑', '귀여', '완벽', '대박', '짱', '❤️', '😍', '👍', '💕', '😊'];
  const negative = ['별로', '안 예뻐', '싫어', '그냥', '음...', '글쎄', '모르겠', '😐'];

  if (positive.some((k) => lower.includes(k))) return 'positive';
  if (negative.some((k) => lower.includes(k))) return 'negative';
  return 'neutral';
}

/** 이모지 포함 여부 */
export function hasEmoji(text: string): boolean {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
}

/** 앱 미사용 일수 계산 */
export function getInactivityDays(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0;
  return differenceInDays(new Date(), lastActiveAt);
}

/** 월간 skip day 날짜 생성 */
export function generateMonthlySkipDays(
  year: number,
  month: number,
  count: number,
  timezone: string
): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const available = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selected: number[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randomInt(0, available.length - 1);
    selected.push(available.splice(idx, 1)[0]);
  }

  return selected.map((day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return fromZonedTime(`${dateStr}T12:00:00`, timezone);
  });
}

export { addMinutes, addDays, startOfDay, formatInTimeZone, fromZonedTime, toZonedTime };
