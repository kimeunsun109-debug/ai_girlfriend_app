import { photoCatalogRepository } from '../photo-catalog/photo-repository.js';
import { emotionStateManager } from './emotion-state-manager.js';
import { dailyRoutineGenerator } from './daily-routine-generator.js';
import type { LivingPushContext, RoutineActivity } from './types.js';
import type { PhotoEmotion } from '../photo-catalog/types.js';

export interface PhotoPushSelection {
  photoId: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  categorySlug: string;
  emotion: PhotoEmotion;
  relativePath: string;
}

/**
 * PhotoPushSelector — 상황(category) + 감정 기반 사진 선택 (랜덤 전체 ❌)
 */
export class PhotoPushSelector {
  select(
    characterSlug: string,
    context: LivingPushContext,
    excludeHashes: string[] = []
  ): PhotoPushSelection | null {
    const photoEmotion = emotionStateManager.toPhotoEmotion(context.emotion) as PhotoEmotion;

    const meta = photoCatalogRepository.selectWithFallback(
      characterSlug,
      context.categorySlug,
      photoEmotion,
      excludeHashes,
      this.fallbackCategories(context.categorySlug)
    );

    if (!meta) return null;

    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

    return {
      photoId: meta.id,
      photoUrl: `${baseUrl}/assets/photos/${meta.relativePath}`,
      thumbnailUrl: `${baseUrl}/assets/photos/${meta.relativePath}`,
      categorySlug: meta.category,
      emotion: meta.emotion,
      relativePath: meta.relativePath,
    };
  }

  /** 현재 일과 활동 → 사진 컨텍스트 */
  fromActivity(
    activity: RoutineActivity,
    emotionSlug: string,
    affectionLevel: 'low' | 'mid' | 'high',
    contentStyle: string
  ): LivingPushContext {
    return {
      categorySlug: activity.categorySlug,
      emotion: emotionSlug as LivingPushContext['emotion'],
      activityLabel: activity.label,
      affectionLevel,
      useName: affectionLevel !== 'low',
      contentStyle,
    };
  }

  /** 활동 키워드 → category slug */
  activityToCategory(activity: string): string {
    const map: Record<string, string> = {
      wake: 'morning',
      prepare: 'selfie',
      commute: 'selfie',
      lunch: 'tteokbokki',
      coffee: 'coffee',
      leave_work: 'leave',
      exercise: 'exercise',
      bed: 'morning',
      sleep: 'home',
      food: 'tteokbokki',
      work: 'overtime',
      rain: 'rain',
      fitness: 'exercise',
      nail: 'nail',
      hair: 'hair',
    };
    return map[activity] ?? map[activity.toLowerCase()] ?? 'selfie';
  }

  private fallbackCategories(primary: string): string[] {
    const fallbacks: Record<string, string[]> = {
      food: ['tteokbokki', 'dessert', 'coffee'],
      work: ['overtime', 'leave', 'selfie'],
      coffee: ['coffee', 'home', 'selfie'],
      rain: ['rain', 'home', 'selfie'],
      fitness: ['exercise', 'walk', 'selfie'],
      bed: ['morning', 'home', 'selfie'],
      hair: ['hair', 'selfie', 'happy'],
      nail: ['nail', 'selfie', 'happy'],
    };
    return fallbacks[primary] ?? ['selfie', 'happy', 'home'];
  }
}

export const photoPushSelector = new PhotoPushSelector();

export { dailyRoutineGenerator };
