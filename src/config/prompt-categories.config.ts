/**
 * Prompt Catalog — 100+ lifestyle categories for image prompt generation.
 * Each category maps to scenario defaults; random pools fill the rest.
 */
import type { ImageScenario } from '../lib/photo-catalog/image-factory.js';

export interface PromptCategoryDef {
  slug: string;
  nameKo: string;
  /** Target prompts per character (20–50) */
  promptCount: number;
  /** Fixed or preferred scenario fields for this category */
  scenarioDefaults: Partial<ImageScenario>;
}

const DEFAULT_COUNT = 30;

function cat(
  slug: string,
  nameKo: string,
  scenarioDefaults: Partial<ImageScenario>,
  promptCount = DEFAULT_COUNT
): PromptCategoryDef {
  return { slug, nameKo, promptCount, scenarioDefaults };
}

export const PROMPT_CATEGORIES: PromptCategoryDef[] = [
  // ─── 시간대 ───────────────────────────────────────────────
  cat('morning', '아침', { time: 'morning', action: 'yawning', emotion: 'sleepy' }),
  cat('lunch', '점심', { time: 'lunch', action: 'eating food' }),
  cat('evening', '저녁', { time: 'evening', emotion: 'happy' }),
  cat('dawn', '새벽', { time: 'dawn', emotion: 'sleepy', expression: 'sleepy drowsy look' }),
  cat('night', '밤', { time: 'night', emotion: 'lonely' }),
  cat('golden_hour', '노을', { time: 'golden hour sunset', emotion: 'fluttering crush' }),

  // ─── 집 ───────────────────────────────────────────────────
  cat('home', '집', { location: 'home bedroom', emotion: 'happy' }),
  cat('bedroom', '침실', { location: 'home bedroom', camera: 'iPhone front selfie' }),
  cat('livingroom', '거실', { location: 'living room', action: 'scrolling phone' }),
  cat('kitchen', '주방', { location: 'home kitchen', action: 'cooking' }),
  cat('bathroom', '욕실', { location: 'bathroom mirror', camera: 'mirror selfie' }),
  cat('balcony', '베란다', { location: 'balcony', action: 'looking out the window' }),

  // ─── 일상·직장 ───────────────────────────────────────────
  cat('cafe', '카페', { location: 'cafe', action: 'drinking coffee', camera: 'photo on table pointing up' }),
  cat('office', '회사', { location: 'office desk', action: 'on laptop', outfit: 'shirt' }),
  cat('after_work', '퇴근', { time: 'evening', location: 'subway', emotion: 'tired' }),
  cat('commute', '출근', { time: 'morning', location: 'subway', action: 'scrolling phone' }),
  cat('overtime', '야근', { time: 'night', location: 'office desk', emotion: 'tired' }),
  cat('lunch_break', '점심시간', { time: 'lunch', location: 'restaurant', action: 'eating food' }),

  // ─── 야외 ─────────────────────────────────────────────────
  cat('walk', '산책', { location: 'neighborhood walk', action: 'walking', camera: 'friend took the photo' }),
  cat('park', '공원', { location: 'park', action: 'walking', weather: 'clear sky' }),
  cat('han_river', '한강', { location: 'riverside', action: 'walking', emotion: 'happy' }),
  cat('drive', '드라이브', { location: 'car during drive', action: 'driving', camera: 'inside car passenger seat' }),

  // ─── 날씨·계절 ────────────────────────────────────────────
  cat('rain', '비', { weather: 'rain', action: 'looking out the window' }),
  cat('snow', '눈', { weather: 'snow', emotion: 'excited' }),
  cat('cherry_blossom', '벚꽃', { weather: 'cherry blossom season', location: 'cherry blossom street' }),
  cat('autumn_leaves', '단풍', { weather: 'autumn leaves', location: 'park' }),
  cat('summer', '여름', { weather: 'midsummer heat', outfit: 'shorts' }),
  cat('winter', '겨울', { weather: 'deep winter cold', outfit: 'puffer jacket' }),
  cat('spring', '봄', { weather: 'clear sky', emotion: 'fluttering crush' }),
  cat('autumn', '가을', { weather: 'autumn leaves', outfit: 'coat' }),
  cat('sunny_day', '맑은날', { weather: 'clear sky', emotion: 'happy' }),
  cat('cloudy', '흐린날', { weather: 'cloudy', emotion: 'bored' }),
  cat('rainy_window', '비오는창가', { weather: 'rain', location: 'home bedroom', action: 'looking out the window' }),
  cat('snow_day', '눈오는날', { weather: 'snow', location: 'balcony' }),
  cat('hot_day', '무더위', { weather: 'midsummer heat', emotion: 'tired' }),
  cat('cold_day', '추위', { weather: 'deep winter cold', outfit: 'puffer jacket' }),
  cat('wind', '바람', { weather: 'windy', action: 'tying hair' }),

  // ─── 여행 ─────────────────────────────────────────────────
  cat('travel', '여행', { location: 'travel hotel', outfit: 'travel casual outfit', emotion: 'excited' }),
  cat('airport', '공항', { location: 'travel hotel', action: 'walking', outfit: 'travel casual outfit' }),
  cat('hotel', '호텔', { location: 'travel hotel', camera: 'mirror selfie' }),
  cat('beach', '바다', { location: 'beach', weather: 'clear sky', emotion: 'happy' }),
  cat('camping', '캠핑', { location: 'camping site', outfit: 'hoodie' }),

  // ─── 운동·뷰티 ────────────────────────────────────────────
  cat('gym', '헬스장', { location: 'gym', action: 'exercising', outfit: 'workout clothes' }),
  cat('pilates', '필라테스', { location: 'pilates studio', action: 'exercising', outfit: 'workout clothes' }),
  cat('workout', '운동', { location: 'gym', action: 'exercising', outfit: 'workout clothes' }),
  cat('yoga', '요가', { location: 'pilates studio', action: 'exercising' }),
  cat('running', '러닝', { location: 'park', action: 'walking', outfit: 'tracksuit' }),
  cat('hair_salon', '미용실', { location: 'hair salon mirror', action: 'at hair salon', camera: 'mirror selfie' }),
  cat('nail', '네일', { location: 'cafe', camera: 'iPhone front selfie', emotion: 'happy' }),
  cat('makeup', '화장', { location: 'bathroom mirror', camera: 'mirror selfie', action: 'taking selfie' }),

  // ─── 취미·문화 ────────────────────────────────────────────
  cat('reading', '독서', { location: 'library', action: 'reading a book', emotion: 'happy' }),
  cat('game', '게임', { location: 'home bedroom', action: 'gaming', outfit: 'hoodie' }),
  cat('pc_room', 'PC방', { location: 'home bedroom', action: 'gaming', outfit: 'hoodie' }),
  cat('karaoke', '노래방', { location: 'movie theater lobby', emotion: 'excited' }),
  cat('cinema', '영화관', { location: 'movie theater lobby', emotion: 'anticipating' }),
  cat('library', '도서관', { location: 'library', action: 'reading a book' }),
  cat('campus', '캠퍼스', { location: 'park', outfit: 'school-uniform vibe casual' }),
  cat('study', '공부', { location: 'library', action: 'on laptop', emotion: 'tired' }),
  cat('concert', '콘서트', { emotion: 'excited', camera: 'friend took the photo' }),
  cat('festival', '축제', { location: 'night market', emotion: 'excited' }),
  cat('amusement_park', '놀이공원', { location: 'amusement park', emotion: 'excited' }),
  cat('picnic', '피크닉', { location: 'park', action: 'eating food' }),

  // ─── 쇼핑·생활 ───────────────────────────────────────────
  cat('shopping', '쇼핑', { location: 'supermarket', action: 'walking', emotion: 'happy' }),
  cat('mart', '마트', { location: 'supermarket', action: 'walking' }),
  cat('convenience_store', '편의점', { location: 'convenience store', action: 'eating food' }),
  cat('grocery', '장보기', { location: 'supermarket', action: 'walking' }),
  cat('cleaning', '청소', { location: 'living room', action: 'cleaning', outfit: 'tracksuit' }),
  cat('laundry', '빨래', { location: 'home bedroom', action: 'doing laundry' }),

  // ─── 음식 ─────────────────────────────────────────────────
  cat('food', '음식', { location: 'restaurant', action: 'eating food', camera: 'photo on table pointing up' }),
  cat('cooking', '요리', { location: 'home kitchen', action: 'cooking' }),
  cat('coffee', '커피', { location: 'cafe', action: 'drinking coffee' }),
  cat('brunch', '브런치', { time: 'late morning', location: 'cafe', action: 'eating food' }),
  cat('ramen', '라면', { location: 'restaurant', action: 'eating food' }),
  cat('dessert', '디저트', { location: 'cafe', action: 'eating food', emotion: 'happy' }),
  cat('late_night_snack', '야식', { time: 'night', location: 'home kitchen', action: 'eating food' }),

  // ─── 사진 스타일 ──────────────────────────────────────────
  cat('selfie', '셀카', { camera: 'iPhone front selfie', action: 'taking selfie' }),
  cat('mirror_selfie', '거울셀카', { camera: 'mirror selfie', action: 'taking selfie' }),
  cat('aesthetic', '감성사진', { camera: 'glass window reflection', emotion: 'fluttering crush' }),
  cat('friend_took', '친구가 찍어줌', { camera: 'friend took the photo', action: 'laughing' }),

  // ─── 관계·감정 ────────────────────────────────────────────
  cat('date', '데이트', { emotion: 'fluttering crush', camera: 'friend took the photo' }),
  cat('couple', '커플', { emotion: 'happy', camera: 'friend took the photo' }),
  cat('friends', '친구', { emotion: 'playful', camera: 'friend took the photo' }),
  cat('missing_you', '보고싶음', { emotion: 'missing you', expression: 'blank relaxed face' }),
  cat('sulky', '삐짐', { emotion: 'sulky', expression: 'pouty sulky face' }),
  cat('sleepy', '졸림', { emotion: 'sleepy', expression: 'sleepy drowsy look' }),
  cat('excited', '신남', { emotion: 'excited', expression: 'mid-laugh candid moment' }),
  cat('cozy', '포근함', { emotion: 'happy', outfit: 'pajamas', location: 'home bedroom' }),

  // ─── 특별한 날 ────────────────────────────────────────────
  cat('pajamas', '잠옷', { outfit: 'pajamas', location: 'home bedroom', time: 'night' }),
  cat('birthday', '생일', { emotion: 'happy', action: 'laughing' }),
  cat('christmas', '크리스마스', { emotion: 'excited', weather: 'deep winter cold' }),
  cat('valentine', '발렌타인', { emotion: 'fluttering crush' }),
  cat('white_day', '화이트데이', { emotion: 'shy', expression: 'shy embarrassed blush' }),
  cat('pepero_day', '빼빼로데이', { emotion: 'playful', action: 'eating food' }),
  cat('new_year', '새해', { emotion: 'anticipating', time: 'night' }),
  cat('halloween', '할로윈', { emotion: 'playful', expression: 'playful teasing expression' }),
  cat('anniversary', '기념일', { emotion: 'touched', camera: 'friend took the photo' }),
  cat('first_date', '첫데이트', { emotion: 'fluttering crush', expression: 'shy embarrassed blush' }),
  cat('gift', '선물', { emotion: 'touched', action: 'laughing' }),
  cat('flowers', '꽃', { emotion: 'happy', weather: 'clear sky' }),

  // ─── 교통 ─────────────────────────────────────────────────
  cat('subway', '지하철', { location: 'subway', action: 'scrolling phone' }),
  cat('bus', '버스', { location: 'bus', action: 'looking out the window' }),
  cat('taxi', '택시', { location: 'taxi back seat', camera: 'iPhone front selfie' }),

  // ─── 기타 라이프스타일 ─────────────────────────────────────
  cat('bar', '술', { time: 'night', location: 'restaurant', emotion: 'playful' }),
  cat('drinking', '음주', { time: 'night', action: 'drinking coffee', emotion: 'happy' }),
  cat('hangover', '해장', { time: 'morning', emotion: 'tired', expression: 'sleepy drowsy look' }),
  cat('sick', '감기', { location: 'home bedroom', emotion: 'tired', outfit: 'pajamas' }),
  cat('pet', '반려동물', { action: 'petting a cat', emotion: 'happy' }),
  cat('cat', '고양이', { action: 'petting a cat', emotion: 'playful' }),
  cat('dog', '강아지', { action: 'watching a puppy', emotion: 'excited' }),
  cat('family_dinner', '가족식사', { location: 'restaurant', action: 'eating food' }),
  cat('wedding_guest', '결혼식', { outfit: 'casual dress', emotion: 'happy' }),
  cat('moving', '이사', { location: 'home bedroom', action: 'cleaning', emotion: 'tired' }),
];

export const PROMPT_CATEGORY_COUNT = PROMPT_CATEGORIES.length;

export function getPromptCategory(slug: string): PromptCategoryDef | undefined {
  return PROMPT_CATEGORIES.find((c) => c.slug === slug);
}

export function getTotalPromptCapacity(): number {
  return PROMPT_CATEGORIES.reduce((sum, c) => sum + c.promptCount, 0);
}
