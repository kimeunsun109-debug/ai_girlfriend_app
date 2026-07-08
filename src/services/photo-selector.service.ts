import { PrismaClient, PhotoCategory, TimeOfDay } from '@prisma/client';
import {
  PHOTO_MESSAGE_TEMPLATES,
  SPECIAL_DAY_MESSAGES,
} from '../data/photo-message-templates.js';
import { PUSH_CONFIG } from '../config/push.config.js';
import {
  randomPick,
  personalizeMessage,
  selectCategoryForDay,
  formatInTimeZone,
} from '../utils/push.utils.js';
import type { SpecialDayType } from '@prisma/client';

const prisma = new PrismaClient();

export interface PhotoPushContent {
  photoId: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  message: string;
  category: PhotoCategory;
}

export class PhotoSelectorService {
  /** 시간대 → TimeOfDay 매핑 */
  private getTimeOfDay(hour: number): TimeOfDay {
    if (hour < 10) return TimeOfDay.MORNING;
    if (hour < 14) return TimeOfDay.AFTERNOON;
    if (hour < 19) return TimeOfDay.EVENING;
    if (hour < 23) return TimeOfDay.NIGHT;
    return TimeOfDay.LATE_NIGHT;
  }

  /** 중복 방지: 최근 발송된 사진/메시지 제외 */
  async getExcludedPhotoIds(userCharacterId: string): Promise<string[]> {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - PUSH_CONFIG.PHOTO_REUSE_COOLDOWN_DAYS);

    const history = await prisma.sentPhotoHistory.findMany({
      where: { userCharacterId, sentAt: { gte: cooldownDate } },
      select: { photoId: true },
    });

    return history.map((h) => h.photoId);
  }

  async getExcludedMessages(userId: string): Promise<string[]> {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - PUSH_CONFIG.MESSAGE_REUSE_COOLDOWN_DAYS);

    const history = await prisma.sentMessageHistory.findMany({
      where: { userId, sentAt: { gte: cooldownDate } },
      select: { message: true },
    });

    return history.map((h) => h.message);
  }

  /** 카테고리에 맞는 사진 선택 */
  async selectPhoto(
    characterId: string,
    userCharacterId: string,
    category: PhotoCategory,
    timeOfDay?: TimeOfDay
  ): Promise<{ id: string; url: string; thumbnailUrl: string | null } | null> {
    const excludedIds = await this.getExcludedPhotoIds(userCharacterId);

    const photos = await prisma.characterPhoto.findMany({
      where: {
        characterId,
        category,
        isActive: true,
        status: 'ACTIVE',
        id: { notIn: excludedIds },
        ...(timeOfDay ? { timeOfDay } : {}),
      },
      take: 20,
    });

    if (photos.length === 0) {
      // 카테고리 무관하게 fallback
      const fallback = await prisma.characterPhoto.findMany({
        where: {
          characterId,
          isActive: true,
          status: 'ACTIVE',
          id: { notIn: excludedIds },
        },
        take: 20,
      });
      if (fallback.length === 0) return null;
      const picked = randomPick(fallback);
      return { id: picked.id, url: picked.url, thumbnailUrl: picked.thumbnailUrl };
    }

    const picked = randomPick(photos);
    return { id: picked.id, url: picked.url, thumbnailUrl: picked.thumbnailUrl };
  }

  /** 메시지 선택 (중복 방지 + 이름 개인화) */
  async selectMessage(
    category: PhotoCategory,
    userName: string,
    userId: string,
    specialDayType?: SpecialDayType
  ): Promise<string> {
    if (specialDayType) {
      const messages = SPECIAL_DAY_MESSAGES[specialDayType];
      const excluded = await this.getExcludedMessages(userId);
      const available = messages.filter((m) => !excluded.includes(m));
      const msg = randomPick(available.length > 0 ? available : messages);
      return personalizeMessage(msg, userName, true);
    }

    const template = PHOTO_MESSAGE_TEMPLATES.find((t) => t.category === category);
    if (!template) {
      return personalizeMessage('오늘 기분 좋아~ 😊', userName, false);
    }

    const excluded = await this.getExcludedMessages(userId);
    const available = template.messages.filter((m) => !excluded.includes(m));
    const rawMessage = randomPick(available.length > 0 ? available : template.messages);
    const useName = Math.random() < template.nameUsageRate;

    return personalizeMessage(rawMessage, userName, useName);
  }

  /** 전체 푸시 콘텐츠 생성 */
  async generatePushContent(
    userId: string,
    characterId: string,
    userCharacterId: string,
    timezone: string,
    options: {
      specialDayType?: SpecialDayType;
      contentStyle?: string;
      forceCategory?: PhotoCategory;
      scheduledAt?: Date;
    } = {}
  ): Promise<PhotoPushContent | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const referenceTime = options.scheduledAt ?? new Date();
    const isoDay = parseInt(formatInTimeZone(referenceTime, timezone, 'i'), 10);
    const dayOfWeek = isoDay % 7;
    const dayOfMonth = parseInt(formatInTimeZone(referenceTime, timezone, 'd'), 10);
    const weekNumber = Math.ceil(dayOfMonth / 7);
    const hour = parseInt(formatInTimeZone(referenceTime, timezone, 'H'), 10);
    const timeOfDay = this.getTimeOfDay(hour);

    let category: PhotoCategory;
    if (options.forceCategory) {
      category = options.forceCategory;
    } else if (options.specialDayType) {
      category = PhotoCategory.SELFIE_GENERAL;
    } else {
      const recentCategories = await prisma.pushLog.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: 3,
        select: { photoCategory: true },
      });
      const exclude = recentCategories
        .map((l) => l.photoCategory)
        .filter((c): c is PhotoCategory => c != null);

      category = selectCategoryForDay(dayOfWeek, weekNumber, exclude);
    }

    const photo = await this.selectPhoto(characterId, userCharacterId, category, timeOfDay);
    if (!photo) return null;

    const message = await this.selectMessage(
      category,
      user.name,
      userId,
      options.specialDayType
    );

    return {
      photoId: photo.id,
      photoUrl: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      message,
      category,
    };
  }

  /** 발송 이력 기록 */
  async recordSent(userCharacterId: string, photoId: string, userId: string, message: string) {
    await prisma.$transaction([
      prisma.sentPhotoHistory.upsert({
        where: { userCharacterId_photoId: { userCharacterId, photoId } },
        create: { userCharacterId, photoId },
        update: { sentAt: new Date() },
      }),
      prisma.sentMessageHistory.create({
        data: { userId, message },
      }),
    ]);
  }
}

export const photoSelectorService = new PhotoSelectorService();
