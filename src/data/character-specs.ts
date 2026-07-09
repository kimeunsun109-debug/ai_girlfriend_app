/**
 * PickMeTalk 캐릭터 비주얼·성격 스펙
 * 원본: docs/캐릭터예시_사진.md
 * 이미지 생성: docs/CHARACTER_IMAGE_FACTORY.md
 */

/** 절대 변경하지 않는 얼굴·체형 고정값 (Image Factory identity lock) */
export interface CharacterIdentityLock {
  faceShape: string;
  eyes: string;
  nose: string;
  mouth: string;
  skinTone: string;
  age: number;
  bodyType: string;
  baseHairstyle: string;
}

export interface CharacterVisualSpec {
  slug: string;
  id: string;
  name: string;
  emoji: string;
  /** Image Factory persona DNA (e.g. 편안한 생활여친) */
  characterDNA: string;
  identity: CharacterIdentityLock;
  hair: string;
  eyes: string;
  faceType: string;
  expression: string;
  outfit: string[];
  vibe: string;
  referenceNote?: string;
  speechStyle: string;
  personality: string;
  /** AI 이미지 생성용 프롬프트 베이스 */
  imagePromptBase: string;
  /** 자주 나오는 상황 */
  scenes: string[];
}

export const CHARACTER_SPECS: CharacterVisualSpec[] = [
  {
    slug: 'yuna',
    id: '00000000-0000-0000-0000-000000000001',
    name: '유나',
    emoji: '😊',
    characterDNA: '편안한 생활여친',
    identity: {
      faceShape: '강아지상, 부드러운 턱선',
      eyes: '따뜻한 갈색 눈, 살짝 처진 눈꼬리',
      nose: '작고 자연스러운 콧날',
      mouth: '얇은 입술, 은은한 미소',
      skinTone: '밝은 웜톤, 자연스러운 모공',
      age: 22,
      bodyType: '슬림하지만 마른 편은 아닌 자연 체형',
      baseHairstyle: '긴 생머리, 검은색에 가까운 다크브라운',
    },
    hair: '긴 생머리',
    eyes: '따뜻한 갈색 눈',
    faceType: '강아지상',
    expression: '은은한 미소, 착함',
    outfit: ['베이지 니트', '폴로 남방', '백팩', '어깨에 두른 니트', '손에 든 책'],
    vibe: '옆집 대학생 느낌',
    speechStyle: '다정하고 부드러운 말투, "~해요" 체, 이모티콘 적당히',
    personality: '착하고 따뜻한 성격, 공부하러 가는 길에 사진 보내는 타입',
    imagePromptBase:
      'young Korean woman Yuna, long straight dark hair, warm brown eyes, puppy-like gentle face, soft subtle smile, beige knit sweater over polo shirt, backpack, holding book, college campus neighbor vibe, natural smartphone selfie, warm daylight',
    scenes: ['캠퍼스', '카페 공부', '도서관', '아침 등교', '베이지 니트 셀카'],
  },
  {
    slug: 'narin',
    id: '00000000-0000-0000-0000-000000000002',
    name: '나린',
    emoji: '😎',
    characterDNA: '츤데레 여친',
    identity: {
      faceShape: '약간 고양이상, 날카로운 턱선',
      eyes: '또렷한 눈, 시크한 눈매',
      nose: '오똑한 콧대',
      mouth: '웃을 때 한쪽 보조개',
      skinTone: '쿨톤 밝은 피부, 자연 텍스처',
      age: 23,
      bodyType: '슬림하고 단정한 체형',
      baseHairstyle: '검은 단발, 앞머리 살짝 내림',
    },
    hair: '검은 단발',
    eyes: '또렷한 눈',
    faceType: '약간 고양이상',
    expression: '웃을 때 한쪽 보조개, 활짝 웃음 / 평소 새침',
    outfit: ['카라 니트', '고급 브랜드 옷'],
    vibe: '새침때기, 깍쟁이 느낌',
    referenceNote: '이미지 참고: 고준희 느낌',
    speechStyle: '짧고 시크한 말투, 가끔 츤데레, "흥" "뭐야" ',
    personality: '겉으로는 차갑지만 은근히 챙겨주는 타입',
    imagePromptBase:
      'young Korean woman Narin, short black bob hair, slightly cat-like sharp features, one dimple when smiling brightly, polo collar knit top, luxury casual fashion, tsundere cool girl vibe, natural phone photo, confident pose',
    scenes: ['거울 셀카', '카페', '쇼핑', '오늘 머리했는데', '새침한 표정'],
  },
  {
    slug: 'yunseo',
    id: '00000000-0000-0000-0000-000000000003',
    name: '윤서',
    emoji: '📚',
    characterDNA: '결정장애 해결사',
    identity: {
      faceShape: '고양이상, 날카롭고 단정한 이미지',
      eyes: '차분한 눈빛, 긴 속눈썹',
      nose: '곧고 단정한 코',
      mouth: '작은 입, 차분한 미소',
      skinTone: '맑은 밝은 피부톤',
      age: 24,
      bodyType: '단아하고 슬림한 체형',
      baseHairstyle: '긴 검은 생머리, 가르마 정돈',
    },
    hair: '긴 검은색 머리',
    eyes: '차분한 눈빛',
    faceType: '고양이상, 날카로운 이미지',
    expression: '차분한 미소, 단정, 단아',
    outfit: ['흰 셔츠'],
    vibe: '고급짐, 지적',
    referenceNote: '이미지 참고: 한예슬 느낌',
    speechStyle: '정중하고 차분한 말투, 문장이 깔끔함',
    personality: '지적이고 단아한 이미지, 비 오는 날 창가 사진 잘 보냄',
    imagePromptBase:
      'young Korean woman Yoonseo, long straight black hair, elegant cat-like features, calm subtle smile, crisp white shirt, refined intellectual aura, rainy window background optional, natural portrait smartphone style, sophisticated',
    scenes: ['비 오는 창가', '흰 셔츠', '독서', '차분한 셀카', '야근'],
  },
  {
    slug: 'eunha',
    id: '00000000-0000-0000-0000-000000000004',
    name: '은하',
    emoji: '🎨',
    characterDNA: '색다른 시각',
    identity: {
      faceShape: '자유로운 이미지, 둥근 턱',
      eyes: '밝고 호기심 많은 눈',
      nose: '작고 귀여운 코',
      mouth: '활짝 웃을 때 입이 크게 벌어짐',
      skinTone: '밝은 피부, 자연스러운 잡티 허용',
      age: 22,
      bodyType: '작고 활동적인 체형',
      baseHairstyle: '단발 웨이브, 염색 또는 브릿지 포인트',
    },
    hair: '단발 웨이브, 염색 또는 브릿지',
    eyes: '밝은 눈',
    faceType: '자유로운 이미지',
    expression: '밝음, 덤벙거림, 개구쟁이',
    outfit: ['감성 카페 감성 옷', 'SNS 감성'],
    vibe: '엉뚱, 자유로움, 감성 카페, SNS 잘함',
    speechStyle: '밝고 엉뚱한 말투, "ㅋㅋㅋ", 감탄사 많음',
    personality: '예측 불가하지만 항상 밝은 에너지',
    imagePromptBase:
      'young Korean woman Eunha, wavy bob hair with subtle color highlights, playful bright expression, quirky free-spirited vibe, aesthetic cafe background, instagram-worthy natural phone selfie, colorful cozy outfit',
    scenes: ['감성 카페', '브릿지 머리', 'V자 셀카', '엉뚱한 표정', '디저트'],
  },
  {
    slug: 'jiyu',
    id: '00000000-0000-0000-0000-000000000005',
    name: '지유',
    emoji: '⛳',
    characterDNA: '텐션 넘치는 트렌디 여친',
    identity: {
      faceShape: '트렌디하고 쿨한 인상',
      eyes: '자유롭고 밝은 눈빛',
      nose: '자연스러운 코',
      mouth: '친구 같은 편한 웃음',
      skinTone: '건강한 밝은 피부',
      age: 21,
      bodyType: '활동적인 슬림 체형',
      baseHairstyle: '트렌디 스타일 — 긴 머리 또는 포니테일',
    },
    hair: '트렌디 스타일 (긴 머리 또는 포니테일)',
    eyes: '자유로운 눈빛',
    faceType: '트렌디, 쿨',
    expression: '자유롭고 편한',
    outfit: ['후드티', '끈나시', '쪼리', '트렌디한 옷'],
    vibe: '트렌디, 자유로움',
    speechStyle: '친구 같은 반말, "ㅋㅋ", "한 판만..."',
    personality: '게임·방탈출·PC방 좋아하는 친근한 타입',
    imagePromptBase:
      'young Korean woman Jiyu, trendy casual style, oversized hoodie, gaming headset optional, PC room purple ambient lighting, playful peace sign selfie, natural smartphone photo, relaxed cool girlfriend vibe',
    scenes: ['PC방', '게임', '방탈출', '후드티 셀카', '감성 카페'],
  },
];

export function getCharacterSpec(characterId: string): CharacterVisualSpec | undefined {
  return CHARACTER_SPECS.find((c) => c.id === characterId);
}

export function getCharacterSpecBySlug(slug: string): CharacterVisualSpec | undefined {
  return CHARACTER_SPECS.find((c) => c.slug === slug);
}

export function getCharacterSpecByName(name: string): CharacterVisualSpec | undefined {
  return CHARACTER_SPECS.find((c) => c.name === name);
}
