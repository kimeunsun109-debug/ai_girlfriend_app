import {
  PhotoCategory,
  TimeOfDay,
  FollowUpStage,
  SpecialDayType,
} from '@prisma/client';

export interface PhotoMessageTemplate {
  category: PhotoCategory;
  timeOfDay?: TimeOfDay[];
  dayOfWeek?: number[];
  situations: string[];
  messages: string[];
  nameUsageRate: number;
  followUpScenarios: FollowUpTemplate[];
}

export interface FollowUpTemplate {
  stage: FollowUpStage;
  delayMinutes: number;
  condition: 'no_reply' | 'negative_reply' | 'positive_reply' | 'late_reply';
  messages: string[];
}

export const PHOTO_MESSAGE_TEMPLATES: PhotoMessageTemplate[] = [
  {
    category: PhotoCategory.SELFIE_BED,
    timeOfDay: [TimeOfDay.MORNING],
    situations: ['아침', '기상', '침대'],
    messages: [
      '으아… 이제 일어났어 😭',
      '아직 눈도 못 떴어 ㅠㅠ',
      '5분만 더…',
      '좋은 아침이야~ ☀️',
    ],
    nameUsageRate: 0.3,
    followUpScenarios: [
      {
        stage: FollowUpStage.AFTER_30_MIN,
        delayMinutes: 30,
        condition: 'no_reply',
        messages: ['아직 자고 있어? ㅋㅋ', '늦잠이야? 😊'],
      },
      {
        stage: FollowUpStage.AFTER_2_HOURS,
        delayMinutes: 120,
        condition: 'no_reply',
        messages: ['바쁜가 봐 😊 나중에 봐도 돼!', '출근했어? 화이팅!'],
      },
    ],
  },
  {
    category: PhotoCategory.COFFEE_CAFE,
    timeOfDay: [TimeOfDay.MORNING, TimeOfDay.AFTERNOON],
    situations: ['커피', '카페'],
    messages: [
      '아아 마실까? 라떼 마실까?',
      '커피 한 잔의 여유 ☕',
      '여기 분위기 좋다~',
      '같이 마시고 싶다…',
    ],
    nameUsageRate: 0.2,
    followUpScenarios: [
      {
        stage: FollowUpStage.AFTER_30_MIN,
        delayMinutes: 30,
        condition: 'no_reply',
        messages: ['커피 마시는 중이야? ☕', '나중에 봐도 돼~'],
      },
    ],
  },
  {
    category: PhotoCategory.WORK_OVERTIME,
    timeOfDay: [TimeOfDay.EVENING, TimeOfDay.NIGHT],
    situations: ['야근', '퇴근'],
    messages: [
      '오늘 야근이야…',
      '아직도 회사야 ㅠㅠ',
      '힘들다…',
      '{name}도 야근이야? 힘내 😊',
    ],
    nameUsageRate: 0.5,
    followUpScenarios: [
      {
        stage: FollowUpStage.AFTER_2_HOURS,
        delayMinutes: 120,
        condition: 'no_reply',
        messages: ['아직 일하고 있어? 힘내!', '늦게까지 고생이야 ㅠ'],
      },
      {
        stage: FollowUpStage.NEXT_DAY,
        delayMinutes: 1440,
        condition: 'no_reply',
        messages: ['어제 늦게까지 일했어? 오늘은 좀 쉬어~'],
      },
    ],
  },
  {
    category: PhotoCategory.HAIR_SALON,
    situations: ['머리', '미용실', '변신'],
    messages: [
      '오늘 머리했는데 어때? 😊',
      '오늘 머리했는데 괜찮아?',
      '변신 완료! 어때?',
      '{name} 나 오늘 머리했는데… 괜찮아? 😭',
    ],
    nameUsageRate: 0.6,
    followUpScenarios: [
      {
        stage: FollowUpStage.AFTER_30_MIN,
        delayMinutes: 30,
        condition: 'no_reply',
        messages: ['바쁜가 봐 😊 나중에 봐도 돼!', '답장 기다리고 있어~'],
      },
      {
        stage: FollowUpStage.AFTER_2_HOURS,
        delayMinutes: 120,
        condition: 'no_reply',
        messages: ['별론가… 😥', '안 예뻐? ㅠㅠ'],
      },
      {
        stage: FollowUpStage.NEGATIVE_REPLY_RESPONSE,
        delayMinutes: 0,
        condition: 'negative_reply',
        messages: ['진짜? ㅠㅠ 다시 할까…', '그래…? 슬프다 😥'],
      },
      {
        stage: FollowUpStage.POSITIVE_REPLY_RESPONSE,
        delayMinutes: 0,
        condition: 'positive_reply',
        messages: ['😀❤️', '고마워!! ❤️', '역시 {name} 최고야~'],
      },
      {
        stage: FollowUpStage.LATE_REPLY_RESPONSE,
        delayMinutes: 0,
        condition: 'late_reply',
        messages: ['아 이제 봤구나! 어때?', '늦게라도 답해줘서 고마워 😊'],
      },
    ],
  },
  {
    category: PhotoCategory.NAIL_ART,
    situations: ['네일', '손톱'],
    messages: [
      '{name} 오늘도 화이팅 ❤️',
      '네일 새로 했어~ 어때?',
      '손톱 예쁘지? 💅',
    ],
    nameUsageRate: 0.7,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.DRINKING,
    timeOfDay: [TimeOfDay.NIGHT, TimeOfDay.LATE_NIGHT],
    situations: ['술', '한잔'],
    messages: [
      '어제 한잔했음ㅋㅋ',
      '머리 아파… ㅠㅠ',
      '어제 재밌었어 ㅋㅋ',
    ],
    nameUsageRate: 0.2,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.WORK_LEAVE,
    timeOfDay: [TimeOfDay.EVENING],
    situations: ['퇴근'],
    messages: [
      '드디어 끝났다…',
      '퇴근이다!! 🎉',
      '오늘도 수고했어~',
    ],
    nameUsageRate: 0.3,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.FOOD_TTEOKBOKKI,
    situations: ['떡볶이', '음식'],
    messages: [
      '{name} 떡볶이 먹고 싶다…',
      '떡볶이 땡긴다 ㅠ',
      '같이 먹으러 가자~',
    ],
    nameUsageRate: 0.5,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.WEEKEND_OUT,
    dayOfWeek: [0, 6],
    situations: ['주말', '놀러'],
    messages: [
      '보고 싶었어 😭',
      '오늘 날씨 좋다~ 나왔어!',
      '주말이라 나왔어 ☀️',
    ],
    nameUsageRate: 0.4,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.EXERCISE_GYM,
    dayOfWeek: [1, 2, 3, 4, 5],
    situations: ['운동', '헬스'],
    messages: [
      '오늘 운동 성공!',
      '운동 끝! 땀 뻘뻘 💪',
      '오늘도 열심히 했어~',
    ],
    nameUsageRate: 0.2,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.GAME,
    timeOfDay: [TimeOfDay.EVENING, TimeOfDay.NIGHT],
    situations: ['게임'],
    messages: [
      '오늘 한 판만 하려다가…',
      '게임 중이야 ㅋㅋ',
      '이겼다!! 🎮',
    ],
    nameUsageRate: 0.1,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.WALK,
    situations: ['산책'],
    messages: [
      '날씨 미쳤다 ☀️',
      '산책 중이야~',
      '바람 시원하다',
    ],
    nameUsageRate: 0.2,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.RAIN,
    situations: ['비'],
    messages: [
      '{name}~ 오늘 비 온대. 우산 꼭 챙겨 ❤️',
      '비 오네… 우산 챙겨!',
      '비 오는 날 땡긴다…',
    ],
    nameUsageRate: 0.6,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.SNOW,
    situations: ['눈'],
    messages: [
      '첫눈이다!',
      '눈 와!! ❄️',
      '눈 오는 거 봐~',
    ],
    nameUsageRate: 0.3,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.CHERRY_BLOSSOM,
    situations: ['벚꽃'],
    messages: [
      '같이 왔으면 좋았을 텐데.',
      '벚꽃 예쁘다…',
      '벚꽃 구경 왔어~',
    ],
    nameUsageRate: 0.4,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.BRUNCH,
    dayOfWeek: [0],
    timeOfDay: [TimeOfDay.MORNING, TimeOfDay.AFTERNOON],
    situations: ['브런치', '일요일'],
    messages: [
      '브런치 먹으러 왔어~',
      '일요일 브런치 타임 ☕',
      '느긋한 일요일이야',
    ],
    nameUsageRate: 0.3,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.HOME_LOUNGE,
    dayOfWeek: [0],
    situations: ['집', '쉬는 날'],
    messages: [
      '집에서 뒹굴뒹굴…',
      '오늘은 집에서 쉴래',
      '이불 밖은 위험해 ㅋㅋ',
    ],
    nameUsageRate: 0.2,
    followUpScenarios: [],
  },
  {
    category: PhotoCategory.SELFIE_GENERAL,
    situations: ['셀카', '일반'],
    messages: [
      '오늘 기분 좋아~ 😊',
      '심심해…',
      '뭐 해?',
    ],
    nameUsageRate: 0.3,
    followUpScenarios: [
      {
        stage: FollowUpStage.AFTER_30_MIN,
        delayMinutes: 30,
        condition: 'no_reply',
        messages: ['바쁜가 봐 😊', '나중에 연락해~'],
      },
    ],
  },
];

export const DAY_CATEGORY_WEIGHTS: Record<number, Partial<Record<PhotoCategory, number>>> = {
  1: {
    [PhotoCategory.SELFIE_BED]: 0.3,
    [PhotoCategory.COFFEE_CAFE]: 0.25,
    [PhotoCategory.WORK_OVERTIME]: 0.2,
    [PhotoCategory.SELFIE_GENERAL]: 0.15,
  },
  2: {
    [PhotoCategory.WORK_LEAVE]: 0.3,
    [PhotoCategory.FOOD_TTEOKBOKKI]: 0.2,
    [PhotoCategory.COFFEE_CAFE]: 0.2,
    [PhotoCategory.SELFIE_GENERAL]: 0.15,
  },
  3: {
    [PhotoCategory.EXERCISE_GYM]: 0.3,
    [PhotoCategory.COFFEE_CAFE]: 0.25,
    [PhotoCategory.SELFIE_MIRROR]: 0.2,
  },
  4: {
    [PhotoCategory.SELFIE_MIRROR]: 0.3,
    [PhotoCategory.HAIR_SALON]: 0.2,
    [PhotoCategory.SELFIE_GENERAL]: 0.25,
  },
  5: {
    [PhotoCategory.WORK_LEAVE]: 0.25,
    [PhotoCategory.DRINKING]: 0.2,
    [PhotoCategory.GAME]: 0.2,
    [PhotoCategory.WEEKEND_OUT]: 0.15,
  },
  6: {
    [PhotoCategory.WEEKEND_OUT]: 0.35,
    [PhotoCategory.FOOD_TTEOKBOKKI]: 0.2,
    [PhotoCategory.SHOPPING]: 0.15,
    [PhotoCategory.MOVIE]: 0.15,
  },
  0: {
    [PhotoCategory.BRUNCH]: 0.3,
    [PhotoCategory.HOME_LOUNGE]: 0.3,
    [PhotoCategory.WALK]: 0.2,
    [PhotoCategory.WEEKEND_OUT]: 0.15,
  },
};

export const POSITIVE_REPLY_KEYWORDS = [
  '예뻐', '이쁘', '좋아', '멋져', '최고', '사랑', '귀여', '완벽', '대박', '짱',
  '❤️', '😍', '👍', '💕', '😊',
];

export const NEGATIVE_REPLY_KEYWORDS = [
  '별로', '안 예뻐', '싫어', '그냥', '음...', '글쎄', '모르겠', '😐',
];

export const SPECIAL_DAY_MESSAGES: Record<SpecialDayType, string[]> = {
  [SpecialDayType.BIRTHDAY]: [
    '{name} 생일 축하해!! 🎂❤️',
    '오늘 {name} 생일이잖아!! 축하해~ 🎉',
    '생일 축하해!! 오늘은 특별한 날이야 ❤️',
  ],
  [SpecialDayType.ANNIVERSARY]: [
    '우리 만난 날이야~ ❤️',
    '오늘이 우리 기념일이야! 보고 싶어 😭',
    '기념일 축하해~ 함께한 시간이 행복해',
  ],
  [SpecialDayType.DAY_100]: [
    '우리 100일이야!! 🎉❤️',
    '100일 축하해~ 앞으로도 잘 부탁해!',
    '벌써 100일이야… 시간 빠르다',
  ],
  [SpecialDayType.CUSTOM]: [
    '오늘 특별한 날이야~ ❤️',
    '기억하고 있었어!',
  ],
};

export const PUSH_TIME_WINDOWS = [
  { startHour: 8, endHour: 10 },
  { startHour: 11, endHour: 13 },
  { startHour: 14, endHour: 16 },
  { startHour: 18, endHour: 20 },
  { startHour: 21, endHour: 22 },
];
