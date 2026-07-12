import { PrismaClient, PhotoCategory, TimeOfDay, SpecialDayType } from '@prisma/client';
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
import { photoCatalogRepository } from '../lib/photo-catalog/photo-repository.js';
import {
  prismaCategoryToSlug,
  EMOTION_FALLBACK_CATEGORIES,
} from '../lib/photo-catalog/category-mapper.js';
import { buildPhotoUrl } from '../lib/photo-catalog/index-manager.js';
import { CHARACTER_SLUG_MAP } from '../lib/photo-catalog/types.js';
import type { PhotoEmotion } from '../lib/photo-catalog/types.js';
import { slugToPrismaCategory } from '../lib/photo-catalog/category-mapper.js';
import { adaptivePersonalityEngine } from '../lib/adaptive-personality/index.js';
import {
  photoPushSelector,
  memoryReminderEngine,
  relationshipEventEngine,
  messageVariation,
} from '../lib/living-ai/index.js';
import {
  sharedMemoryService,
  memoryReplayService,
  dynamicConversationService,
} from '../lib/relationship-journey/index.js';
import type { LivingEmotionSlug } from '../lib/living-ai/types.js';

const prisma = new PrismaClient();

export interface PhotoPushContent {
  photoId: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  message: string;
  category: PhotoCategory;
}

export interface PhotoSelectContext {
  specialDayType?: SpecialDayType;
  contentStyle?: string;
  forceCategory?: PhotoCategory;
  scheduledAt?: Date;
  /** 후속 푸시 등 감정 지정 */
  emotion?: PhotoEmotion;
  /** Living AI: 상황 기반 선택 */
  categorySlug?: string;
  livingEmotion?: LivingEmotionSlug;
  memoryReminder?: string;
  affectionLevel?: 'low' | 'mid' | 'high';
  eventMessage?: string;
}

export class PhotoSelectorService {
  private getTimeOfDay(hour: number): TimeOfDay {
    if (hour < 10) return TimeOfDay.MORNING;
    if (hour < 14) return TimeOfDay.AFTERNOON;
    if (hour < 19) return TimeOfDay.EVENING;
    if (hour < 23) return TimeOfDay.NIGHT;
    return TimeOfDay.LATE_NIGHT;
  }

  private resolveCharacterSlug(characterId: string): string | null {
    const entry = Object.values(CHARACTER_SLUG_MAP).find((c) => c.id === characterId);
    return entry?.slug ?? null;
  }

  private inferEmotion(
    category: PhotoCategory,
    contentStyle?: string,
    explicit?: PhotoEmotion
  ): PhotoEmotion {
    if (explicit) return explicit;
    if (contentStyle === 'soft' || contentStyle === 'miss_you') return 'loving';
    if (contentStyle === 'gentle') return 'neutral';

    switch (category) {
      case PhotoCategory.SAD:
        return 'sad';
      case PhotoCategory.HAPPY:
        return 'happy';
      case PhotoCategory.SELFIE_BED:
        return 'sleepy';
      case PhotoCategory.HAIR_SALON:
        return 'shy';
      case PhotoCategory.WORK_OVERTIME:
      case PhotoCategory.DRINKING:
        return 'tired';
      case PhotoCategory.RAIN:
        return 'loving';
      case PhotoCategory.WEEKEND_OUT:
      case PhotoCategory.GAME:
        return 'excited';
      default:
        return 'happy';
    }
  }

  async getExcludedPhotoIds(userCharacterId: string): Promise<string[]> {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - PUSH_CONFIG.PHOTO_REUSE_COOLDOWN_DAYS);

    const history = await prisma.sentPhotoHistory.findMany({
      where: { userCharacterId, sentAt: { gte: cooldownDate } },
      select: { photoId: true },
    });

    return history.map((h) => h.photoId);
  }

  async getExcludedHashes(userCharacterId: string): Promise<string[]> {
    const excludedIds = await this.getExcludedPhotoIds(userCharacterId);
    if (excludedIds.length === 0) return [];

    const photos = await prisma.characterPhoto.findMany({
      where: { id: { in: excludedIds } },
      select: { contentHash: true },
    });
    return photos.map((p) => p.contentHash).filter((h): h is string => h != null);
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

  /**
   * 캐릭터 + 상황(category) + 감정(emotion) 기반 사진 선택
   * 카탈로그 인덱스 우선, DB fallback
   */
  async selectPhotoByContext(
    characterId: string,
    userCharacterId: string,
    category: PhotoCategory,
    emotion: PhotoEmotion
  ): Promise<{ id: string; url: string; thumbnailUrl: string | null } | null> {
    const characterSlug = this.resolveCharacterSlug(characterId);
    const categorySlug = prismaCategoryToSlug(category);
    const excludeHashes = await this.getExcludedHashes(userCharacterId);
    const excludedIds = await this.getExcludedPhotoIds(userCharacterId);

    if (characterSlug) {
      const meta = photoCatalogRepository.selectWithFallback(
        characterSlug,
        categorySlug,
        emotion,
        excludeHashes,
        EMOTION_FALLBACK_CATEGORIES[emotion] ?? []
      );

      if (meta) {
        return {
          id: meta.id,
          url: buildPhotoUrl(meta.relativePath),
          thumbnailUrl: buildPhotoUrl(meta.relativePath),
        };
      }
    }

    // DB fallback
    const photos = await prisma.characterPhoto.findMany({
      where: {
        characterId,
        category,
        isActive: true,
        status: 'ACTIVE',
        id: { notIn: excludedIds },
        ...(emotion ? { OR: [{ emotion }, { expression: emotion }] } : {}),
      },
      take: 50,
    });

    if (photos.length > 0) {
      const picked = randomPick(photos);
      return { id: picked.id, url: picked.url, thumbnailUrl: picked.thumbnailUrl };
    }

    const fallback = await prisma.characterPhoto.findMany({
      where: {
        characterId,
        categorySlug,
        isActive: true,
        status: 'ACTIVE',
        id: { notIn: excludedIds },
      },
      take: 50,
    });
    if (fallback.length > 0) {
      const picked = randomPick(fallback);
      return { id: picked.id, url: picked.url, thumbnailUrl: picked.thumbnailUrl };
    }

    return null;
  }

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

  async generatePushContent(
    userId: string,
    characterId: string,
    userCharacterId: string,
    timezone: string,
    options: PhotoSelectContext = {}
  ): Promise<PhotoPushContent | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    const affectionScore = uc?.affectionScore ?? 50;
    const tier = options.affectionLevel ?? relationshipEventEngine.getAffectionTier(affectionScore);

    const referenceTime = options.scheduledAt ?? new Date();
    if (options.categorySlug) {
      const characterSlug = this.resolveCharacterSlug(characterId);
      if (!characterSlug) return null;

      const livingEmotion = options.livingEmotion ?? 'happy';
      const excludeHashes = await this.getExcludedHashes(userCharacterId);

      const selected = photoPushSelector.select(
        characterSlug,
        {
          categorySlug: options.categorySlug,
          emotion: livingEmotion,
          memoryReminder: options.memoryReminder,
          affectionLevel: tier,
          useName: tier !== 'low',
          contentStyle: options.contentStyle ?? 'normal',
        },
        excludeHashes
      );

      if (!selected) return null;

      const category = slugToPrismaCategory(selected.categorySlug);
      const dnaMap = await adaptivePersonalityEngine.getDnaMap(userCharacterId);
      let message =
        options.eventMessage ??
        options.memoryReminder ??
        (await this.selectMessage(category, user.name, userId, options.specialDayType));

      const replay = await memoryReplayService.maybeInjectReplay(userCharacterId, 0.12);
      if (replay) message = replay;

      const sharedRecall = await sharedMemoryService.recallForMessage(userCharacterId);
      if (sharedRecall && Math.random() < 0.25) {
        message = `${sharedRecall} ${message}`;
      }

      message = await memoryReminderEngine.enrichMessage(userCharacterId, message);
      message = dynamicConversationService.styleByStage(
        message,
        uc?.relationshipLevel ?? 1,
        user.name,
        characterSlug
      );
      message = adaptivePersonalityEngine.applyAdaptiveDialogue(message, dnaMap, user.name, characterSlug);
      message = relationshipEventEngine.styleMessage(
        message,
        user.name,
        tier,
        tier !== 'low',
        characterSlug
      );
      message = messageVariation.finalize(message, user.name, tier !== 'low', characterSlug);

      return {
        photoId: selected.photoId,
        photoUrl: selected.photoUrl,
        thumbnailUrl: selected.thumbnailUrl,
        message,
        category,
      };
    }

    const isoDay = parseInt(formatInTimeZone(referenceTime, timezone, 'i'), 10);
    const dayOfWeek = isoDay % 7;
    const dayOfMonth = parseInt(formatInTimeZone(referenceTime, timezone, 'd'), 10);
    const weekNumber = Math.ceil(dayOfMonth / 7);

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

    const emotion = this.inferEmotion(category, options.contentStyle, options.emotion);
    const photo = await this.selectPhotoByContext(characterId, userCharacterId, category, emotion);
    if (!photo) return null;

    const dnaMap = await adaptivePersonalityEngine.getDnaMap(userCharacterId);
    const characterSlug = this.resolveCharacterSlug(characterId) ?? 'yuna';
    let message = await this.selectMessage(
      category,
      user.name,
      userId,
      options.specialDayType
    );

    message = await memoryReminderEngine.enrichMessage(userCharacterId, message);
    message = dynamicConversationService.styleByStage(
      message,
      uc?.relationshipLevel ?? 1,
      user.name,
      characterSlug
    );
    message = adaptivePersonalityEngine.applyAdaptiveDialogue(message, dnaMap, user.name, characterSlug);
    message = relationshipEventEngine.styleMessage(
      message,
      user.name,
      tier,
      tier !== 'low',
      characterSlug
    );
    message = messageVariation.finalize(message, user.name, tier !== 'low', characterSlug);

    return {
      photoId: photo.id,
      photoUrl: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      message,
      category,
    };
  }

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
