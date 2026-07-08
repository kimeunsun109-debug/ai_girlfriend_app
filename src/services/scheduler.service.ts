import { PrismaClient, PushType, ScheduleStatus, SpecialDayType } from '@prisma/client';
import { PUSH_CONFIG } from '../config/push.config.js';
import { engagementService } from './engagement.service.js';
import { photoSelectorService } from './photo-selector.service.js';
import { followUpService } from './followup.service.js';
import { pushDeliveryService } from './push-delivery.service.js';
import { analyticsService } from './analytics.service.js';
import { livingAIScheduler } from '../lib/living-ai/index.js';
import {
  memoryEventEngine,
  anniversaryEngine,
  memoryReplayService,
} from '../lib/relationship-journey/index.js';
import {
  getUserTodayStart,
  getUserNow,
  generateMonthlySkipDays,
  randomInt,
  formatInTimeZone,
} from '../utils/push.utils.js';

const prisma = new PrismaClient();

export class PushSchedulerService {
  /** 매일 자정: 다음 날 스케줄 생성 */
  async planDailySchedules(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { pushEnabled: true },
      include: {
        characters: { where: { isActive: true }, include: { character: true } },
        specialDays: true,
        skipDays: true,
      },
    });

    for (const user of users) {
      try {
        await this.planForUser(user);
      } catch (err) {
        console.error(`Failed to plan schedule for user ${user.id}:`, err);
      }
    }
  }

  private async planForUser(user: {
    id: string;
    timezone: string;
    birthday: Date | null;
    frequencyMultiplier: number;
    characters: Array<{ id: string; characterId: string; day100Date: Date | null; character: { id: string; name: string } }>;
    specialDays: Array<{ type: SpecialDayType; date: Date }>;
    skipDays: Array<{ skipDate: Date }>;
  }) {
    const timezone = user.timezone;
    const tomorrow = getUserTodayStart(timezone);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatInTimeZone(tomorrow, timezone, 'yyyy-MM-dd');

    // 이미 스케줄이 있으면 스킵
    const existing = await prisma.pushSchedule.count({
      where: {
        userId: user.id,
        scheduledAt: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    if (existing > 0) return;

    // Skip day 확인
    const isSkipDay = user.skipDays.some(
      (s) => formatInTimeZone(s.skipDate, timezone, 'yyyy-MM-dd') === tomorrowStr
    );
    if (isSkipDay) return;

    // 월간 skip day 자동 생성 (1~2회)
    await this.ensureMonthlySkipDays(user.id, timezone);

    // 무반응 쿨다운
    if (await engagementService.shouldTakeCooldown(user.id)) return;

    // 특별한 날 확인
    const specialDay = this.detectSpecialDay(
      user.birthday,
      user.specialDays,
      user.characters.map((c) => c.day100Date),
      tomorrow,
      timezone
    );
    const hasSpecialDay = specialDay != null;

    const activeCharacter = user.characters[0];
    if (!activeCharacter) return;

    // Living AI 일일 계획 (루틴 + 이벤트 + 확률 기반 푸시)
    await livingAIScheduler.planDayForUserCharacter(
      user.id,
      activeCharacter.id,
      activeCharacter.characterId,
      timezone,
      tomorrow,
      { hasSpecialDay, skipDay: false }
    );
  }

  private detectSpecialDay(
    birthday: Date | null,
    specialDays: Array<{ type: SpecialDayType; date: Date }>,
    day100Dates: Array<Date | null>,
    date: Date,
    timezone: string
  ): SpecialDayType | null {
    const monthDay = formatInTimeZone(date, timezone, 'MM-dd');
    const dateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd');

    if (birthday) {
      const bday = formatInTimeZone(birthday, 'UTC', 'MM-dd');
      if (bday === monthDay) return SpecialDayType.BIRTHDAY;
    }

    for (const sd of specialDays) {
      const sdMonthDay = formatInTimeZone(sd.date, 'UTC', 'MM-dd');
      if (sdMonthDay === monthDay) return sd.type;
    }

    for (const day100 of day100Dates) {
      if (day100 && formatInTimeZone(day100, timezone, 'yyyy-MM-dd') === dateStr) {
        return SpecialDayType.DAY_100;
      }
    }

    return null;
  }

  private async ensureMonthlySkipDays(userId: string, timezone: string) {
    const now = getUserNow(timezone);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const existing = await prisma.skipDay.count({
      where: {
        userId,
        skipDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    });

    const targetCount = randomInt(
      PUSH_CONFIG.SKIP_DAYS_PER_MONTH.min,
      PUSH_CONFIG.SKIP_DAYS_PER_MONTH.max
    );

    if (existing >= targetCount) return;

    const needed = targetCount - existing;
    const skipDates = generateMonthlySkipDays(year, month, needed, timezone);

    for (const skipDate of skipDates) {
      await prisma.skipDay.upsert({
        where: { userId_skipDate: { userId, skipDate } },
        create: { userId, skipDate },
        update: {},
      });
    }
  }

  /** 5분마다: 예정된 푸시 실행 */
  async executePendingPushes(): Promise<void> {
    const now = new Date();

    const pending = await prisma.pushSchedule.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: {
        user: {
          include: {
            characters: { where: { isActive: true } },
            specialDays: true,
            deviceTokens: true,
          },
        },
      },
      take: 50,
    });

    for (const schedule of pending) {
      try {
        await this.executePush(schedule);
      } catch (err) {
        console.error(`Failed to execute push ${schedule.id}:`, err);
      }
    }
  }

  private async executePush(schedule: {
    id: string;
    userId: string;
    characterId: string | null;
    pushType: PushType;
    timezone: string;
    scheduledAt: Date;
    user: {
      id: string;
      name: string;
      timezone: string;
      pushEnabled: boolean;
      birthday: Date | null;
      deviceTokens: Array<{ token: string; platform: string }>;
      characters: Array<{ id: string; characterId: string; day100Date: Date | null }>;
      specialDays: Array<{ type: SpecialDayType; date: Date }>;
    };
  }) {
    if (!schedule.user.pushEnabled) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    const hasPushTarget =
      schedule.user.deviceTokens.length > 0 ||
      (await prisma.webPushSubscription.count({ where: { userId: schedule.userId } })) > 0;

    if (!hasPushTarget) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    const characterId = schedule.characterId ?? schedule.user.characters[0]?.characterId;
    const userCharacter = schedule.user.characters.find((c) => c.characterId === characterId);
    if (!characterId || !userCharacter) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    // 일일 쿼터 확인
    const today = getUserTodayStart(schedule.timezone);
    const quota = await prisma.dailyPushQuota.findUnique({
      where: { userId_date: { userId: schedule.userId, date: today } },
    });

    const maxAllowed = (quota?.maxCount ?? 2) + (quota?.bonusCount ?? 0);
    if (quota && quota.sentCount >= maxAllowed) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.SKIPPED },
      });
      return;
    }

    const specialDayType =
      schedule.pushType === PushType.SPECIAL_DAY
        ? this.detectSpecialDay(
            schedule.user.birthday,
            schedule.user.specialDays,
            schedule.user.characters.map((c) => c.day100Date),
            schedule.scheduledAt,
            schedule.timezone
          )
        : null;

    // Living AI 컨텍스트 로드
    const queueItem = await prisma.notificationQueueItem.findFirst({
      where: { pushScheduleId: schedule.id, status: ScheduleStatus.PENDING },
    });
    const payload = queueItem?.payload as Record<string, unknown> | undefined;

    const userRecord = await prisma.user.findUnique({ where: { id: schedule.userId } });
    const inactiveDays = userRecord?.lastActiveAt
      ? Math.floor((Date.now() - userRecord.lastActiveAt.getTime()) / (86400000))
      : 0;
    const contentStyle = engagementService.getContentStyle(
      userRecord?.engagementScore ?? 0.5,
      inactiveDays
    );

    const content = await photoSelectorService.generatePushContent(
      schedule.userId,
      characterId,
      userCharacter.id,
      schedule.timezone,
      {
        scheduledAt: schedule.scheduledAt,
        contentStyle,
        ...(specialDayType ? { specialDayType } : {}),
        ...(payload?.categorySlug
          ? {
              categorySlug: payload.categorySlug as string,
              livingEmotion: payload.emotion as import('../lib/living-ai/types.js').LivingEmotionSlug,
              memoryReminder: payload.memoryReminder as string | undefined,
              affectionLevel: payload.affectionLevel as 'low' | 'mid' | 'high' | undefined,
              eventMessage: (payload.eventMessage ?? payload.memoryReminder) as string | undefined,
            }
          : {}),
      }
    );

    if (!content) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    const claimed = await prisma.pushSchedule.updateMany({
      where: { id: schedule.id, status: ScheduleStatus.PENDING },
      data: { status: ScheduleStatus.EXECUTED, executedAt: new Date() },
    });
    if (claimed.count === 0) return;

    try {
      const pushLog = await prisma.pushLog.create({
        data: {
          userId: schedule.userId,
          characterId,
          photoId: content.photoId,
          message: content.message,
          photoCategory: content.category,
          pushType: schedule.pushType,
        },
      });

      const pushResult = await pushDeliveryService.sendToUser({
        userId: schedule.userId,
        title: '',
        body: content.message,
        imageUrl: content.thumbnailUrl ?? content.photoUrl,
        data: {
          type: 'photo_push',
          pushLogId: pushLog.id,
          characterId,
          photoUrl: content.photoUrl,
          message: content.message,
          deepLink: `/chat/${characterId}?pushLogId=${pushLog.id}`,
        },
      });

      if (!pushResult.success) {
        await prisma.pushLog.delete({ where: { id: pushLog.id } });
        await prisma.pushSchedule.update({
          where: { id: schedule.id },
          data: { status: ScheduleStatus.PENDING, executedAt: null },
        });
        return;
      }

      await photoSelectorService.recordSent(
        userCharacter.id,
        content.photoId,
        schedule.userId,
        content.message
      );

      const character = await prisma.character.findUnique({ where: { id: characterId } });
      const categorySlug = (payload?.categorySlug as string) ?? 'selfie';

      await memoryEventEngine.onPhotoSent({
        userCharacterId: userCharacter.id,
        characterName: character?.name ?? '캐릭터',
        photoId: content.photoId,
        photoUrl: content.photoUrl,
        categorySlug,
        pushLogId: pushLog.id,
        message: content.message,
      });

      const anniversaryMsg = await anniversaryEngine.checkAndCelebrate(
        userCharacter.id,
        character?.name ?? '캐릭터'
      );
      if (anniversaryMsg) {
        console.log(`Anniversary message for ${userCharacter.id}: ${anniversaryMsg}`);
      }

      // 후속 시나리오 스케줄
      await followUpService.scheduleFollowUps(pushLog.id, content.category);

      // 쿼터 업데이트
      await prisma.dailyPushQuota.upsert({
        where: { userId_date: { userId: schedule.userId, date: today } },
        create: { userId: schedule.userId, date: today, sentCount: 1, maxCount: 2 },
        update: { sentCount: { increment: 1 } },
      });

      // 최적 시간 학습
      await analyticsService.recordPushTime(schedule.userId, new Date());

      if (queueItem) {
        await prisma.notificationQueueItem.update({
          where: { id: queueItem.id },
          data: { status: ScheduleStatus.EXECUTED, executedAt: new Date() },
        });
        const eventId = payload?.eventId as string | undefined;
        if (eventId) {
          await prisma.dailyLifeEvent.update({
            where: { id: eventId },
            data: { pushed: true, pushLogId: pushLog.id },
          });
        }
      }
    } catch (err) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.PENDING, executedAt: null },
      });
      throw err;
    }
  }
}

export const pushSchedulerService = new PushSchedulerService();
