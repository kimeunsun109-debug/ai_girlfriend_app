import { PrismaClient, PushType, ScheduleStatus, SpecialDayType } from '@prisma/client';
import { PUSH_CONFIG } from '../config/push.config.js';
import { engagementService } from './engagement.service.js';
import { photoSelectorService } from './photo-selector.service.js';
import { followUpService } from './followup.service.js';
import { pushNotificationService } from './push-notification.service.js';
import { analyticsService } from './analytics.service.js';
import {
  generateRandomPushTime,
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
    characters: Array<{ id: string; characterId: string; character: { id: string; name: string } }>;
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
    const specialDay = this.detectSpecialDay(user.birthday, user.specialDays, tomorrow, timezone);
    const hasSpecialDay = specialDay != null;

    // 발송 횟수 결정
    const pushCount = await engagementService.getDailyPushCount(user.id, hasSpecialDay);
    if (pushCount === 0) return;

    const activeCharacter = user.characters[0];
    if (!activeCharacter) return;

    const usedHours: number[] = [];

    for (let i = 0; i < pushCount; i++) {
      const scheduledAt = generateRandomPushTime(timezone, usedHours);
      usedHours.push(scheduledAt.getHours());

      const isSpecial = i === pushCount - 1 && hasSpecialDay;

      await prisma.pushSchedule.create({
        data: {
          userId: user.id,
          characterId: activeCharacter.characterId,
          scheduledAt,
          status: ScheduleStatus.PENDING,
          pushType: isSpecial ? PushType.SPECIAL_DAY : PushType.REGULAR,
          timezone,
        },
      });
    }

    // 일일 쿼터 설정
    await prisma.dailyPushQuota.upsert({
      where: {
        userId_date: { userId: user.id, date: tomorrow },
      },
      create: {
        userId: user.id,
        date: tomorrow,
        sentCount: 0,
        maxCount: PUSH_CONFIG.MAX_DAILY_PUSHES,
        bonusCount: hasSpecialDay ? PUSH_CONFIG.SPECIAL_DAY_BONUS : 0,
      },
      update: {
        bonusCount: hasSpecialDay ? PUSH_CONFIG.SPECIAL_DAY_BONUS : 0,
      },
    });
  }

  private detectSpecialDay(
    birthday: Date | null,
    specialDays: Array<{ type: SpecialDayType; date: Date }>,
    date: Date,
    timezone: string
  ): SpecialDayType | null {
    const monthDay = formatInTimeZone(date, timezone, 'MM-dd');

    if (birthday) {
      const bday = formatInTimeZone(birthday, 'UTC', 'MM-dd');
      if (bday === monthDay) return SpecialDayType.BIRTHDAY;
    }

    for (const sd of specialDays) {
      const sdMonthDay = formatInTimeZone(sd.date, 'UTC', 'MM-dd');
      if (sdMonthDay === monthDay) return sd.type;
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
    user: {
      id: string;
      name: string;
      timezone: string;
      pushEnabled: boolean;
      deviceTokens: Array<{ token: string; platform: string }>;
      characters: Array<{ id: string; characterId: string }>;
    };
  }) {
    if (!schedule.user.pushEnabled || schedule.user.deviceTokens.length === 0) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    const characterId = schedule.characterId ?? schedule.user.characters[0]?.characterId;
    const userCharacter = schedule.user.characters.find((c) => c.characterId === characterId);
    if (!characterId || !userCharacter) return;

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

    const content = await photoSelectorService.generatePushContent(
      schedule.userId,
      characterId,
      userCharacter.id,
      schedule.timezone,
      schedule.pushType === PushType.SPECIAL_DAY ? { specialDayType: SpecialDayType.BIRTHDAY } : {}
    );

    if (!content) {
      await prisma.pushSchedule.update({
        where: { id: schedule.id },
        data: { status: ScheduleStatus.CANCELLED },
      });
      return;
    }

    // 푸시 발송
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

    await pushNotificationService.sendPhotoPush({
      userId: schedule.userId,
      deviceTokens: schedule.user.deviceTokens.map((t) => t.token),
      title: '', // 광고처럼 느껴지지 않도록 타이틀 없음
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

    await photoSelectorService.recordSent(
      userCharacter.id,
      content.photoId,
      schedule.userId,
      content.message
    );

    // 후속 시나리오 스케줄
    await followUpService.scheduleFollowUps(pushLog.id, content.category);

    // 쿼터 업데이트
    await prisma.dailyPushQuota.upsert({
      where: { userId_date: { userId: schedule.userId, date: today } },
      create: { userId: schedule.userId, date: today, sentCount: 1, maxCount: 2 },
      update: { sentCount: { increment: 1 } },
    });

    await prisma.pushSchedule.update({
      where: { id: schedule.id },
      data: { status: ScheduleStatus.EXECUTED, executedAt: new Date() },
    });

    // 최적 시간 학습
    await analyticsService.recordPushTime(schedule.userId, new Date());
  }
}

export const pushSchedulerService = new PushSchedulerService();
