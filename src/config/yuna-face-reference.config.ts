/**
 * 유나(Yuna) 얼굴 기준 — Midjourney Identity Lock
 * 원본: 캐릭터예시 사진.txt + 유나 인사.mp4 + face reference images
 *
 * 모든 MJ 프롬프트에 동일하게 포함. 얼굴/헤어는 절대 변경하지 않음.
 */
export const YUNA_FACE_IDENTITY = {
  slug: 'yuna',
  name: '유나',

  /** Midjourney --cref / prompt prefix */
  identityPrompt: [
    'SAME PERSON every photo — Yuna, 22 year old Korean woman',
    'puppy-like gentle face (강아지상), soft heart-shaped jawline',
    'large warm brown eyes, slight droopy eye corners, natural double eyelids',
    'small refined nose, thin lips with subtle gentle smile',
    'bright warm skin tone, natural pores, realistic skin texture',
    'long straight dark brown hair near-black, see-through wispy bangs optional',
    'NEVER change face shape, eye shape, or bone structure',
  ].join(', '),

  /** Negative — face drift prevention */
  identityNegative: [
    'different person', 'different face', 'face change', 'wrong identity',
    'cartoon', 'anime', 'illustration', '3d render', 'plastic skin',
    'deformed face', 'extra fingers', 'bad anatomy', 'uncanny valley',
    'western features', 'blonde hair', 'blue eyes', 'short bob unless specified',
  ].join(', '),

  /** 20-test scenario folders (matches Photo Library) */
  testScenarios: [
    'morning', 'home', 'cafe', 'work', 'travel', 'rainy', 'selfie', 'mirror',
    'workout', 'commute', 'office', 'lunch', 'evening', 'bed', 'game',
    'reading', 'shopping', 'date', 'snow', 'cherry',
  ] as const,

  /** Reference image paths (relative to repo) — bootstrap copies to face-references */
  canonicalReferences: [
    'reference/yuna/yuna_campus_selfie.jpg',
    'reference/yuna/yuna_finger_heart.jpg',
    'reference/yuna/yuna_hair_salon.jpg',
    'reference/yuna/yuna_rain_umbrella.jpg',
    'reference/yuna/yuna_sad_pouty.jpg',
    'reference/yuna/yuna_nail_art.jpg',
  ],
} as const;

export const YUNA_MJ_SUFFIX =
  '--style raw --ar 3:4 --v 6.1 --stylize 100 --no cartoon, illustration, anime, 3d render, plastic skin, deformed face, different person';
