import { PhotoCategory, TimeOfDay } from '@prisma/client';
import type { PhotoEmotion } from './types.js';

export interface CategoryMapping {
  slug: string;
  prismaCategory: PhotoCategory;
  timeOfDay?: TimeOfDay;
  defaultEmotion: PhotoEmotion;
  aliases: string[];
}

/** 폴더명/파일명 키워드 → category slug */
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  { slug: 'hair', prismaCategory: PhotoCategory.HAIR_SALON, defaultEmotion: 'shy', aliases: ['hair', 'salon', '머리', '미용실', '헤어'] },
  { slug: 'coffee', prismaCategory: PhotoCategory.COFFEE_CAFE, timeOfDay: TimeOfDay.MORNING, defaultEmotion: 'happy', aliases: ['coffee', 'cafe', '커피', '카페', 'latte', 'americano', '라떼', '아아'] },
  { slug: 'nail', prismaCategory: PhotoCategory.NAIL_ART, defaultEmotion: 'happy', aliases: ['nail', '네일', '손톱', 'manicure'] },
  { slug: 'tteokbokki', prismaCategory: PhotoCategory.FOOD_TTEOKBOKKI, defaultEmotion: 'excited', aliases: ['tteok', 'tteokbokki', '떡볶이', 'food_tteok'] },
  { slug: 'rain', prismaCategory: PhotoCategory.RAIN, defaultEmotion: 'loving', aliases: ['rain', 'rainy', '비', '우산', 'umbrella'] },
  { slug: 'alcohol', prismaCategory: PhotoCategory.DRINKING, timeOfDay: TimeOfDay.NIGHT, defaultEmotion: 'tired', aliases: ['drink', 'drinking', 'alcohol', 'beer', '술', 'hangover', '해장'] },
  { slug: 'morning', prismaCategory: PhotoCategory.SELFIE_BED, timeOfDay: TimeOfDay.MORNING, defaultEmotion: 'sleepy', aliases: ['morning', 'bed', 'wake', '아침', '침대', '기상', 'sleepy', '졸림'] },
  { slug: 'selfie', prismaCategory: PhotoCategory.SELFIE_GENERAL, defaultEmotion: 'happy', aliases: ['selfie', '셀카', 'mirror', '거울'] },
  { slug: 'weekend', prismaCategory: PhotoCategory.WEEKEND_OUT, defaultEmotion: 'happy', aliases: ['weekend', 'out', '주말', '놀러', 'escape'] },
  { slug: 'game', prismaCategory: PhotoCategory.GAME, timeOfDay: TimeOfDay.EVENING, defaultEmotion: 'excited', aliases: ['game', 'gaming', 'pc', '게임', 'pc방'] },
  { slug: 'overtime', prismaCategory: PhotoCategory.WORK_OVERTIME, timeOfDay: TimeOfDay.NIGHT, defaultEmotion: 'tired', aliases: ['overtime', 'work', 'desk', '야근', 'office'] },
  { slug: 'leave', prismaCategory: PhotoCategory.WORK_LEAVE, timeOfDay: TimeOfDay.EVENING, defaultEmotion: 'happy', aliases: ['leave', 'offwork', '퇴근'] },
  { slug: 'exercise', prismaCategory: PhotoCategory.EXERCISE_GYM, defaultEmotion: 'excited', aliases: ['gym', 'exercise', 'workout', '운동', '헬스'] },
  { slug: 'walk', prismaCategory: PhotoCategory.WALK, defaultEmotion: 'happy', aliases: ['walk', '산책'] },
  { slug: 'snow', prismaCategory: PhotoCategory.SNOW, defaultEmotion: 'excited', aliases: ['snow', '눈'] },
  { slug: 'cherry', prismaCategory: PhotoCategory.CHERRY_BLOSSOM, defaultEmotion: 'loving', aliases: ['cherry', 'blossom', '벚꽃'] },
  { slug: 'brunch', prismaCategory: PhotoCategory.BRUNCH, timeOfDay: TimeOfDay.MORNING, defaultEmotion: 'happy', aliases: ['brunch', '브런치'] },
  { slug: 'home', prismaCategory: PhotoCategory.HOME_LOUNGE, defaultEmotion: 'neutral', aliases: ['home', 'lounge', '집', '쉬'] },
  { slug: 'reading', prismaCategory: PhotoCategory.READING, defaultEmotion: 'neutral', aliases: ['read', 'reading', 'book', '독서'] },
  { slug: 'dessert', prismaCategory: PhotoCategory.FOOD_BAKERY, defaultEmotion: 'happy', aliases: ['dessert', 'bakery', '디저트', '빵'] },
  { slug: 'sad', prismaCategory: PhotoCategory.SAD, defaultEmotion: 'sad', aliases: ['sad', 'pouty', 'cry', '슬픔', '별론', '삐짐', 'waiting'] },
  { slug: 'happy', prismaCategory: PhotoCategory.HAPPY, defaultEmotion: 'happy', aliases: ['happy', 'blush', 'smile', '기쁨', '웃음', 'heart', '하트'] },
];

const EMOTION_KEYWORDS: Array<{ emotion: PhotoEmotion; keywords: string[] }> = [
  { emotion: 'happy', keywords: ['happy', 'blush', 'smile', 'joy', '기쁨', '웃음', 'heart', '하트', '활짝'] },
  { emotion: 'sad', keywords: ['sad', 'pouty', 'pout', 'cry', '슬픔', '별론', '삐짐', 'waiting', '아쉬'] },
  { emotion: 'sleepy', keywords: ['sleepy', 'tired', 'morning', 'bed', 'wake', '졸림', '피곤', '아침'] },
  { emotion: 'shy', keywords: ['shy', 'nervous', '쑥스', '어때', '괜찮'] },
  { emotion: 'excited', keywords: ['excited', 'fun', '신남', '놀러', 'escape'] },
  { emotion: 'tired', keywords: ['tired', 'hangover', 'overtime', '야근', '해장', '부시'] },
  { emotion: 'loving', keywords: ['loving', 'love', 'rain', '우산', '보고싶', '다정'] },
];

export function classifyFromPath(relativePath: string): {
  categorySlug: string;
  prismaCategory: PhotoCategory;
  timeOfDay?: TimeOfDay;
  emotion: PhotoEmotion;
  tags: string[];
} {
  const lower = relativePath.toLowerCase().replace(/\\/g, '/');
  const parts = lower.split('/');

  let matched: CategoryMapping | undefined;
  for (const mapping of CATEGORY_MAPPINGS) {
    if (
      mapping.aliases.some((alias) =>
        parts.some((p) => p.includes(alias)) || lower.includes(alias)
      )
    ) {
      matched = mapping;
      break;
    }
  }

  const categorySlug = matched?.slug ?? 'selfie';
  const prismaCategory = matched?.prismaCategory ?? PhotoCategory.SELFIE_GENERAL;

  let emotion: PhotoEmotion = matched?.defaultEmotion ?? 'neutral';
  for (const rule of EMOTION_KEYWORDS) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      emotion = rule.emotion;
      break;
    }
  }

  const tags = parts
    .flatMap((p) => p.replace(/\.[a-z]+$/, '').split(/[_\-\s]+/))
    .filter((t) => t.length > 1 && !['jpg', 'jpeg', 'png', 'webp'].includes(t));

  return {
    categorySlug,
    prismaCategory,
    timeOfDay: matched?.timeOfDay,
    emotion,
    tags: [...new Set(tags)].slice(0, 8),
  };
}

export function slugToPrismaCategory(slug: string): PhotoCategory {
  const found = CATEGORY_MAPPINGS.find((m) => m.slug === slug);
  return found?.prismaCategory ?? PhotoCategory.SELFIE_GENERAL;
}

export function prismaCategoryToSlug(category: PhotoCategory): string {
  const found = CATEGORY_MAPPINGS.find((m) => m.prismaCategory === category);
  return found?.slug ?? 'selfie';
}

/** 감정 기반 fallback category slugs */
export const EMOTION_FALLBACK_CATEGORIES: Record<PhotoEmotion, string[]> = {
  sleepy: ['morning', 'home', 'selfie'],
  sad: ['sad', 'home', 'selfie'],
  happy: ['happy', 'selfie', 'weekend'],
  neutral: ['selfie', 'home', 'coffee'],
  excited: ['weekend', 'game', 'selfie'],
  shy: ['hair', 'selfie', 'happy'],
  tired: ['overtime', 'alcohol', 'morning'],
  loving: ['rain', 'happy', 'selfie'],
};
