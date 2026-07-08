import { PrismaClient } from '@prisma/client';
import { AlbumCategory } from '@prisma/client';
import { ALBUM_CATEGORY_MAP } from '../../config/relationship-journey.config.js';
import { memoryTimelineService } from './memory-timeline.service.js';
import { sharedMemoryService } from './shared-memory.service.js';
import { memoryAlbumService } from './memory-album.service.js';
import { anniversaryEngine } from './anniversary-engine.js';
import { relationshipJourneyService } from './relationship-journey.service.js';

const prisma = new PrismaClient();

export interface PhotoSentEvent {
  userCharacterId: string;
  characterName: string;
  photoId: string;
  photoUrl: string;
  categorySlug: string;
  pushLogId: string;
  message: string;
}

/**
 * MemoryEventEngine — 이벤트 발생 시 타임라인·앨범 자동 기록
 */
export class MemoryEventEngine {
  async onPhotoSent(event: PhotoSentEvent): Promise<void> {
    const isFirstPhoto = !(await memoryTimelineService.hasEvent(
      event.userCharacterId,
      'FIRST_PHOTO'
    ));
    const isSelfie = ['selfie', 'hair', 'nail', 'happy'].includes(event.categorySlug);
    const isFirstSelfie =
      isSelfie &&
      !(await memoryTimelineService.hasEvent(event.userCharacterId, 'FIRST_SELFIE'));

    const albumCategory = this.toAlbumCategory(event.categorySlug);

    const timeline = await memoryTimelineService.record({
      userCharacterId: event.userCharacterId,
      eventType: isFirstPhoto ? 'FIRST_PHOTO' : 'PHOTO_SENT',
      title: isFirstPhoto
        ? `${event.characterName}가(이) 첫 사진을 보냄`
        : isFirstSelfie
          ? `${event.characterName}가(이) 첫 셀카를 보냄`
          : `${event.characterName}가(이) 사진을 보냄`,
      description: event.message,
      photoId: event.photoId,
      photoUrl: event.photoUrl,
      pushLogId: event.pushLogId,
      albumCategory,
      emotionalIntensity: 0.6,
    });

    if (isFirstSelfie) {
      await memoryTimelineService.record({
        userCharacterId: event.userCharacterId,
        eventType: 'FIRST_SELFIE',
        title: '첫 셀카',
        photoId: event.photoId,
        photoUrl: event.photoUrl,
        albumCategory: 'SELFIE',
        emotionalIntensity: 0.75,
      });
    }

    await memoryAlbumService.addPhoto({
      userCharacterId: event.userCharacterId,
      albumCategory,
      photoId: event.photoId,
      photoUrl: event.photoUrl,
      title: event.message.slice(0, 40),
      timelineId: timeline.id,
    });

    if (isFirstPhoto) {
      await sharedMemoryService.create({
        userCharacterId: event.userCharacterId,
        title: '첫 사진',
        content: event.message,
        recallPhrase: '우리 처음 사진 보낸 날 기억나?',
        emotionalIntensity: 0.8,
        tags: ['first', 'photo'],
      });
    }

    await relationshipJourneyService.progressAffection(event.userCharacterId, 1, 'photo_sent');
  }

  async onSpecialChat(
    userCharacterId: string,
    characterName: string,
    content: string,
    emotionalIntensity: number
  ): Promise<void> {
    if (emotionalIntensity < 0.6) return;

    await memoryTimelineService.record({
      userCharacterId,
      eventType: 'SPECIAL_CHAT',
      title: '특별한 대화',
      description: content.slice(0, 100),
      emoji: '💬',
      emotionalIntensity,
    });

    await sharedMemoryService.create({
      userCharacterId,
      title: '특별한 대화',
      content,
      recallPhrase: this.buildRecallPhrase(content, emotionalIntensity),
      emotionalIntensity,
      tags: ['chat', 'emotional'],
    });

    await relationshipJourneyService.progressAffection(
      userCharacterId,
      emotionalIntensity > 0.8 ? 2 : 1,
      'special_chat'
    );
  }

  async onFirstEvent(
    userCharacterId: string,
    eventType: 'FIRST_JEALOUSY' | 'FIRST_FIGHT' | 'RECONCILE' | 'FIRST_CALL' | 'FIRST_GIFT',
    title: string,
    description?: string
  ): Promise<void> {
    const exists = await memoryTimelineService.hasEvent(userCharacterId, eventType);
    if (exists) return;

    await memoryTimelineService.record({
      userCharacterId,
      eventType,
      title,
      description,
      emotionalIntensity: 0.85,
    });
  }

  async onUserCharacterCreated(
    userCharacterId: string,
    characterName: string
  ): Promise<void> {
    await relationshipJourneyService.initializeJourney(userCharacterId, characterName);
    await anniversaryEngine.seedAnniversaries(userCharacterId);
  }

  private toAlbumCategory(categorySlug: string): AlbumCategory {
    const mapped = ALBUM_CATEGORY_MAP[categorySlug];
    return (mapped as AlbumCategory) ?? 'OTHER';
  }

  private buildRecallPhrase(content: string, intensity: number): string {
    if (intensity > 0.8) {
      return `그때 "${content.slice(0, 20)}..." 했잖아. 아직도 기억나.`;
    }
    return `그때 이야기했던 거 기억나?`;
  }
}

export const memoryEventEngine = new MemoryEventEngine();
