import { PrismaClient, PushType, ScheduleStatus } from '@prisma/client';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import { PUSH_CONFIG } from '../../config/push.config.js';
import { engagementService } from '../../services/engagement.service.js';
import { dailyLifeGenerator } from './daily-life-generator.js';
import { dailyRoutineGenerator } from './daily-routine-generator.js';
import { randomEventGenerator } from './random-event-generator.js';
import { emotionStateManager } from './emotion-state-manager.js';
import { relationshipEventEngine } from './relationship-event-engine.js';
import { adaptivePersonalityEngine } from '../adaptive-personality/index.js';
import { memoryReminderEngine } from './memory-reminder-engine.js';
import { notificationQueue } from './notification-queue.js';
import {
  formatInTimeZone,
  generateRandomPushTime,
  getUserTodayStart,
  getInactivityDays,
} from '../../utils/push.utils.js';

const prisma = new PrismaClient();

export interface LivingPlanResult {
  pushCount: number;
  queued: number;
  skippedReason?: string;
}

/**
 * LivingAIScheduler — AI가 먼저 행동하는 일일 계획
 */
export class LivingAIScheduler {
  /** 사용자+캐릭터 하루 계획 (루틴 + 이벤트 + 푸시 큐) */
  async planDayForUserCharacter(
    userId: string,
    userCharacterId: string,
    characterId: string,
    timezone: string,
    targetDate: Date,
    options: { hasSpecialDay?: boolean; skipDay?: boolean } = {}
  ): Promise<LivingPlanResult> {
    if (options.skipDay) {
      return { pushCount: 0, queued: 0, skippedReason: 'skip_day' };
    }

    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    if (!uc) return { pushCount: 0, queued: 0, skippedReason: 'no_character' };

    const dateStr = formatInTimeZone(targetDate, timezone, 'yyyy-MM-dd');
    const dayEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const existingQueue = await notificationQueue.countPendingForDay(
      userId,
      targetDate,
      dayEnd
    );
    if (existingQueue > 0) {
      return { pushCount: 0, queued: existingQueue, skippedReason: 'already_planned' };
    }

    // 1. 하루 일상 생성
    const { routine } = await dailyLifeGenerator.generateForUserCharacter(
      userCharacterId,
      characterId,
      targetDate,
      timezone
    );

    // 2. 확률 roll
    const rolls = randomEventGenerator.rollDailyProbabilities(userCharacterId, dateStr);
    const dayOfWeek = parseInt(formatInTimeZone(targetDate, timezone, 'i'), 10) % 7;
    const dayWeight = LIVING_AI_CONFIG.DAY_CONTACT_WEIGHTS[dayOfWeek] ?? 0.7;
    const affectionBonus = relationshipEventEngine.getContactProbabilityBonus(uc.affectionScore);

    const dnaMap = await adaptivePersonalityEngine.getDnaMap(userCharacterId);
    const dnaContactBonus = adaptivePersonalityEngine.pushBonus(dnaMap);

    const contactRoll =
      rolls.contactToday &&
      Math.random() < dayWeight + affectionBonus + dnaContactBonus;

    if (!contactRoll && !options.hasSpecialDay) {
      return { pushCount: 0, queued: 0, skippedReason: 'probability_skip' };
    }

    // 3. 발송 횟수 (0~2, 불규칙)
    let pushCount = await this.decidePushCount(
      userId,
      uc.affectionScore,
      rolls,
      options.hasSpecialDay ?? false,
      dayOfWeek,
      dnaMap
    );

    if (pushCount === 0) {
      return { pushCount: 0, queued: 0, skippedReason: 'zero_push_day' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const inactiveDays = getInactivityDays(user?.lastActiveAt ?? null);
    const contentStyle = engagementService.getContentStyle(
      user?.engagementScore ?? 0.5,
      inactiveDays
    );

    const tier = relationshipEventEngine.getAffectionTier(uc.affectionScore);
    const usedHours: number[] = [];
    let queued = 0;

    // 4. 이벤트 기반 푸시 우선
    const events = await prisma.dailyLifeEvent.findMany({
      where: {
        userCharacterId,
        date: targetDate,
        pushed: false,
      },
      orderBy: { scheduledAt: 'asc' },
      take: pushCount,
    });

    for (const event of events) {
      if (queued >= pushCount) break;

      const emotionSlug = await emotionStateManager.getEmotionSlug(userCharacterId);
      const memoryReminder = await memoryReminderEngine.getReminderMessage(userCharacterId);

      await notificationQueue.enqueuePhotoPush({
        userId,
        userCharacterId,
        characterId,
        scheduledAt: event.scheduledAt,
        priority: 2,
        eventId: event.id,
        context: {
          categorySlug: event.categorySlug,
          emotion: emotionSlug,
          eventType: event.eventType,
          memoryReminder: memoryReminder ?? undefined,
          affectionLevel: tier,
          useName: tier !== 'low',
          contentStyle,
          activityLabel: event.message ?? event.eventType,
          eventMessage: event.message ?? undefined,
        },
      });
      queued++;
    }

    // 5. 루틴 기반 푸시로 부족분 채우기
    while (queued < pushCount) {
      const scheduledAt = generateRandomPushTime(timezone, usedHours, targetDate);
      const hour = parseInt(formatInTimeZone(scheduledAt, timezone, 'H'), 10);
      usedHours.push(hour);

      const activity =
        dailyRoutineGenerator.getCurrentActivity(routine, scheduledAt, timezone) ??
        routine.activities[Math.floor(routine.activities.length / 2)];

      const emotionSlug = emotionStateManager.inferFromActivity(activity.categorySlug, hour);
      await emotionStateManager.applyTransition({
        userCharacterId,
        hour,
      });

      const memoryReminder =
        queued === 0 ? await memoryReminderEngine.getReminderMessage(userCharacterId) : undefined;

      await notificationQueue.enqueuePhotoPush({
        userId,
        userCharacterId,
        characterId,
        scheduledAt,
        priority: rolls.photoToday ? 1 : 0,
        context: {
          categorySlug: activity.categorySlug,
          emotion: emotionSlug,
          activityLabel: activity.label,
          memoryReminder: memoryReminder ?? undefined,
          affectionLevel: tier,
          useName: tier !== 'low',
          contentStyle,
        },
      });
      queued++;
    }

    // 6. PushSchedule 동기화 (기존 워커 호환)
    const queueItems = await prisma.notificationQueueItem.findMany({
      where: {
        userId,
        userCharacterId,
        scheduledAt: { gte: targetDate, lt: dayEnd },
        status: ScheduleStatus.PENDING,
        pushScheduleId: null,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    for (const item of queueItems) {
      const schedule = await prisma.pushSchedule.create({
        data: {
          userId,
          characterId,
          scheduledAt: item.scheduledAt,
          status: ScheduleStatus.PENDING,
          pushType: PushType.LIVING_EVENT,
          timezone,
        },
      });

      await prisma.notificationQueueItem.update({
        where: { id: item.id },
        data: { pushScheduleId: schedule.id },
      });
    }

    await prisma.dailyPushQuota.upsert({
      where: { userId_date: { userId, date: targetDate } },
      create: {
        userId,
        date: targetDate,
        sentCount: 0,
        maxCount: PUSH_CONFIG.MAX_DAILY_PUSHES,
        bonusCount: options.hasSpecialDay ? PUSH_CONFIG.SPECIAL_DAY_BONUS : 0,
      },
      update: {
        bonusCount: options.hasSpecialDay ? PUSH_CONFIG.SPECIAL_DAY_BONUS : 0,
      },
    });

    return { pushCount, queued };
  }

  /** 모든 활성 유저 일일 계획 */
  async planAllDaily(timezone?: string): Promise<void> {
    const users = await prisma.user.findMany({
      where: { pushEnabled: true, ...(timezone ? { timezone } : {}) },
      include: {
        characters: { where: { isActive: true } },
        skipDays: true,
      },
    });

    for (const user of users) {
      const tomorrow = getUserTodayStart(user.timezone);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatInTimeZone(tomorrow, user.timezone, 'yyyy-MM-dd');

      const isSkipDay = user.skipDays.some(
        (s) => formatInTimeZone(s.skipDate, user.timezone, 'yyyy-MM-dd') === tomorrowStr
      );

      const uc = user.characters[0];
      if (!uc) continue;

      try {
        await this.planDayForUserCharacter(
          user.id,
          uc.id,
          uc.characterId,
          user.timezone,
          tomorrow,
          { skipDay: isSkipDay }
        );
      } catch (err) {
        console.error(`LivingAI plan failed for ${user.id}:`, err);
      }
    }

    await memoryReminderEngine.purgeExpired();
  }

  private async decidePushCount(
    userId: string,
    affectionScore: number,
    rolls: ReturnType<typeof randomEventGenerator.rollDailyProbabilities>,
    hasSpecialDay: boolean,
    dayOfWeek: number,
    dnaMap: Partial<Record<import('@prisma/client').PersonalityTrait, number>>
  ): Promise<number> {
    if (await engagementService.shouldTakeCooldown(userId)) return 0;

    const tier = relationshipEventEngine.getAffectionTier(affectionScore);
    const behavior = relationshipEventEngine.getBehavior(tier);

    let baseCount = await engagementService.getDailyPushCount(userId, hasSpecialDay);

    // 금요일·화요일 불규칙성
    if (dayOfWeek === 5 && Math.random() < 0.35) baseCount = Math.max(0, baseCount - 1);
    if (dayOfWeek === 6 && Math.random() < 0.4) baseCount = 0;
    if (dayOfWeek === 2 && Math.random() < 0.45) baseCount = 0;

    if (!rolls.photoToday && baseCount > 0 && Math.random() < 0.3) {
      baseCount = Math.max(0, baseCount - 1);
    }

    if (behavior.photoBonus > 0 && Math.random() < behavior.photoBonus) {
      baseCount = Math.min(PUSH_CONFIG.MAX_DAILY_PUSHES, baseCount + 1);
    }

    const bonus = adaptivePersonalityEngine.pushBonus(dnaMap);
    if (Math.random() < bonus) baseCount = Math.min(PUSH_CONFIG.MAX_DAILY_PUSHES, baseCount + 1);

    return Math.min(baseCount, PUSH_CONFIG.MAX_DAILY_PUSHES + (hasSpecialDay ? 1 : 0));
  }
}

export const livingAIScheduler = new LivingAIScheduler();
