import { buildPhotoUrl } from '../lib/photo-catalog/index-manager.js';
import { photoCatalogRepository } from '../lib/photo-catalog/photo-repository.js';
import { PHOTO_UNIVERSE_ENABLED } from '../config/photo-universe.config.js';
import { getMeetTheme } from '../config/character-meet.config.js';
import type { PhotoEmotion } from '../lib/photo-catalog/types.js';

const ACTIVITY_TO_CATEGORY: Record<string, string> = {
  wake: 'morning',
  prepare: 'mirror',
  commute: 'commute',
  subway: 'commute',
  lunch: 'lunch',
  coffee: 'cafe',
  cafe: 'cafe',
  leave_work: 'evening',
  exercise: 'workout',
  gym: 'workout',
  bed: 'bed',
  sleep: 'bed',
  study: 'reading',
  drive: 'commute',
  walk: 'travel',
  default: 'selfie',
};

const EMOTION_TO_PHOTO: Record<string, PhotoEmotion> = {
  love: 'happy',
  happy: 'happy',
  sleepy: 'sleepy',
  sad: 'sad',
  bored: 'neutral',
  hungry: 'neutral',
  waiting: 'neutral',
  neutral: 'neutral',
};

const FALLBACK_CATEGORIES = ['selfie', 'cafe', 'home', 'coffee', 'morning'];

export interface ResolvedMeetPhotos {
  photoUrl: string;
  ambientPhotoUrl?: string;
  thumbnailUrl?: string;
  source: 'library' | 'static';
}

export function resolveMeetPhotos(
  slug: string,
  activityKey?: string,
  emotionKey?: string
): ResolvedMeetPhotos {
  const theme = getMeetTheme(slug);
  const staticFallback: ResolvedMeetPhotos = {
    photoUrl: `/assets/photos/${theme.heroPhoto}`,
    ambientPhotoUrl: theme.ambientPhoto
      ? `/assets/photos/${theme.ambientPhoto}`
      : undefined,
    source: 'static',
  };

  if (!PHOTO_UNIVERSE_ENABLED) return staticFallback;

  const category = ACTIVITY_TO_CATEGORY[activityKey ?? ''] ?? ACTIVITY_TO_CATEGORY.default!;
  const emotion = EMOTION_TO_PHOTO[emotionKey ?? 'neutral'] ?? 'neutral';

  const hero = photoCatalogRepository.selectWithFallback(
    slug,
    category,
    emotion,
    [],
    FALLBACK_CATEGORIES
  );

  if (!hero) return staticFallback;

  const ambient = photoCatalogRepository.selectPhoto({
    characterSlug: slug,
    categorySlug: hero.category === category ? 'selfie' : category,
    emotion,
    excludeHashes: [hero.contentHash],
  });

  const baseUrl = process.env.PUBLIC_BASE_URL;
  const photoUrl = buildPhotoUrl(hero.relativePath, baseUrl);
  const ambientPhotoUrl = ambient
    ? buildPhotoUrl(ambient.relativePath, baseUrl)
    : staticFallback.ambientPhotoUrl;

  return {
    photoUrl,
    ambientPhotoUrl,
    thumbnailUrl: photoUrl,
    source: 'library',
  };
}
