import { Prisma, PrismaClient } from '@prisma/client';
import { dailyRoutineGenerator } from './daily-routine-generator.js';
import { randomEventGenerator } from './random-event-generator.js';
import { emotionStateManager } from './emotion-state-manager.js';
import type { DailyRoutine, RoutineActivity } from './types.js';
import { formatInTimeZone } from '../../utils/push.utils.js';

const prisma = new PrismaClient();

/**
 * DailyLifeGenerator — 하루 일상 + 이벤트 DB 저장
 */
export class DailyLifeGenerator {
  async generateForUserCharacter(
    userCharacterId: string,
    characterId: string,
    date: Date,
    timezone: string
  ): Promise<{ routine: DailyRoutine; eventCount: number }> {
    const dateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
    const dayStart = date;

    const existing = await prisma.characterDailyRoutine.findUnique({
      where: { userCharacterId_date: { userCharacterId, date: dayStart } },
    });

    if (existing) {
      return {
        routine: {
          userCharacterId,
          date: dateStr,
          timezone,
          activities: existing.activities as unknown as RoutineActivity[],
          daySeed: existing.daySeed,
        },
        eventCount: await prisma.dailyLifeEvent.count({
          where: { userCharacterId, date: dayStart },
        }),
      };
    }

    const routine = dailyRoutineGenerator.generate(userCharacterId, date, timezone);
    const rolls = randomEventGenerator.rollDailyProbabilities(userCharacterId, dateStr);

    await prisma.characterDailyRoutine.create({
      data: {
        userCharacterId,
        date: dayStart,
        timezone,
        activities: routine.activities as unknown as Prisma.InputJsonValue,
        daySeed: routine.daySeed,
      },
    });

    const pushTimes = routine.activities
      .filter((a) => ['coffee', 'lunch', 'bed', 'exercise', 'hair'].some((k) => a.activity.includes(k) || a.categorySlug.includes(k)))
      .map((a) => new Date(a.scheduledAt))
      .slice(0, 3);

    const events = randomEventGenerator.generateEvents(
      userCharacterId,
      dateStr,
      rolls,
      pushTimes.length > 0 ? pushTimes : [new Date(date.getTime() + 12 * 60 * 60 * 1000)]
    );

    for (const ev of events) {
      await prisma.dailyLifeEvent.create({
        data: {
          userCharacterId,
          characterId,
          date: dayStart,
          eventType: ev.eventType,
          categorySlug: ev.categorySlug,
          emotion: ev.emotion,
          scheduledAt: ev.scheduledAt,
          message: ev.message,
          probability: ev.probability,
        },
      });

      await emotionStateManager.applyTransition({
        userCharacterId,
        eventEmotion: ev.emotion,
      });
    }

    return { routine, eventCount: events.length };
  }

  async getTodayRoutine(
    userCharacterId: string,
    timezone: string
  ): Promise<DailyRoutine | null> {
    const dateStr = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    const dayStart = new Date(`${dateStr}T00:00:00`);

    const row = await prisma.characterDailyRoutine.findUnique({
      where: { userCharacterId_date: { userCharacterId, date: dayStart } },
    });

    if (!row) return null;

    return {
      userCharacterId,
      date: dateStr,
      timezone: row.timezone,
      activities: row.activities as unknown as RoutineActivity[],
      daySeed: row.daySeed,
    };
  }
}

export const dailyLifeGenerator = new DailyLifeGenerator();
