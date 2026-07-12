import { createHash } from 'crypto';
import { addMinutes, parse } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import type { DailyRoutine, RoutineActivity } from './types.js';
import { randomInt } from '../../utils/push.utils.js';

/**
 * DailyRoutineGenerator — 캐릭터 하루 일과 생성 (±30~90분 랜덤 변동)
 */
export class DailyRoutineGenerator {
  generate(
    userCharacterId: string,
    date: Date,
    timezone: string,
    seedInput?: string
  ): DailyRoutine {
    const dateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
    const daySeed =
      seedInput ??
      createHash('sha256')
        .update(`${userCharacterId}:${dateStr}`)
        .digest('hex')
        .slice(0, 12);

    const activities: RoutineActivity[] = LIVING_AI_CONFIG.BASE_ROUTINE_TEMPLATE.map(
      (item, index) => {
        const jitter = this.jitterForSeed(daySeed, index);
        const base = parse(item.time, 'HH:mm', date);
        const adjusted = addMinutes(base, jitter);
        const timeStr = formatInTimeZone(adjusted, timezone, 'HH:mm');
        const scheduledAt = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);

        return {
          time: timeStr,
          activity: item.activity,
          label: item.label,
          categorySlug: item.categorySlug,
          scheduledAt: scheduledAt.toISOString(),
        };
      }
    );

    activities.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    return {
      userCharacterId,
      date: dateStr,
      timezone,
      activities,
      daySeed,
    };
  }

  /** 현재 시각 기준 진행 중인 활동 */
  getCurrentActivity(routine: DailyRoutine, now: Date, timezone: string): RoutineActivity | null {
    const nowIso = now.toISOString();
    let current: RoutineActivity | null = null;

    for (const act of routine.activities) {
      if (act.scheduledAt <= nowIso) current = act;
      else break;
    }
    return current;
  }

  /** 다음 활동 */
  getNextActivity(routine: DailyRoutine, now: Date): RoutineActivity | null {
    const nowIso = now.toISOString();
    return routine.activities.find((a) => a.scheduledAt > nowIso) ?? null;
  }

  private jitterForSeed(seed: string, index: number): number {
    const hash = createHash('md5').update(`${seed}:${index}`).digest();
    const { min, max } = LIVING_AI_CONFIG.ROUTINE_JITTER_MINUTES;
    const range = max - min + 1;
    const raw = (hash[0] + hash[1]) % range;
    const sign = hash[2] % 2 === 0 ? 1 : -1;
    return sign * (min + raw);
  }
}

export const dailyRoutineGenerator = new DailyRoutineGenerator();
