/**
 * 얼굴 턴어라운드(정면·좌·우) Midjourney 프롬프트 설정
 * 연한 화장, 자연스러운 인물 사진, 얼굴 Identity Lock 유지
 */
import { buildCharacterMjCommand } from './character-face-reference.config.js';

export type FaceAngle = 'front' | 'right' | 'left';

export interface FaceTurnaroundCharacter {
  slug: string;
  name: string;
  /** 로컬 레퍼런스 경로 (Windows) — MJ_CREF 업로드용 */
  localReferencePath: string;
}

export interface FaceTurnaroundJob {
  id: string;
  character: string;
  angle: FaceAngle;
  variation: number;
  label: string;
  scenePrompt: string;
  negativePrompt: string;
}

export const FACE_TURNAROUND_CHARACTERS: FaceTurnaroundCharacter[] = [
  {
    slug: 'narin',
    name: '나린',
    localReferencePath: String.raw`C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\나린`,
  },
  {
    slug: 'yuna',
    name: '유나',
    localReferencePath: String.raw`C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\유나`,
  },
  {
    slug: 'jiyu',
    name: '지유',
    localReferencePath: String.raw`C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\지유\지유 2.png`,
  },
  {
    slug: 'yunseo',
    name: '윤서',
    localReferencePath: String.raw`C:\Users\user\OneDrive\Desktop\픽미톡 ai\확정\윤서\윤서4.png`,
  },
];

const LIGHT_MAKEUP =
  'light natural everyday makeup, no-makeup makeup look, subtle foundation, soft peach lip tint, light brow fill, minimal mascara, healthy skin glow, NOT bare face, NOT heavy glam makeup';

const PORTRAIT_BASE =
  'close-up face portrait, head and shoulders, plain soft neutral background, photorealistic Korean woman, natural skin texture with visible pores, real human photograph, shot on iPhone portrait mode, soft diffused lighting, no beauty filter, no plastic skin';

const FACE_TURNAROUND_NEGATIVE =
  [
    'bare face',
    'no makeup',
    'naked face',
    'completely unmade face',
    'heavy makeup',
    'glam makeup',
    'thick foundation',
    'smoky eyes',
    'red lipstick',
    'studio glamour',
    'fashion editorial',
    'AI beauty filter',
    'doll face',
    'over retouched',
    'uncanny valley',
    'wrong angle',
    'back of head',
    'profile mismatch',
  ].join(', ');

const ANGLE_SCENES: Record<FaceAngle, string[]> = {
  front: [
    `frontal face portrait, looking straight at camera, eyes to lens, symmetrical front view, neutral calm expression, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `front-facing headshot, direct eye contact, soft subtle smile, centered composition, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `straight-on face portrait, relaxed natural expression, even front lighting, identity reference photo style, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
  ],
  right: [
    `three-quarter right profile, head turned 30 degrees to the right, right cheek visible, eyes slightly toward camera, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `right side angle portrait, head turned 45 degrees right, natural side lighting on right cheek, calm expression, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `right profile headshot, showing right jawline and nose bridge, soft window light from left, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
  ],
  left: [
    `three-quarter left profile, head turned 30 degrees to the left, left cheek visible, eyes slightly toward camera, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `left side angle portrait, head turned 45 degrees left, natural side lighting on left cheek, calm expression, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
    `left profile headshot, showing left jawline and nose bridge, soft window light from right, ${LIGHT_MAKEUP}, ${PORTRAIT_BASE}`,
  ],
};

const ANGLE_LABELS: Record<FaceAngle, string> = {
  front: '정면',
  right: '오른쪽',
  left: '왼쪽',
};

export function buildFaceTurnaroundJobs(
  slugs: string[] = FACE_TURNAROUND_CHARACTERS.map((c) => c.slug)
): FaceTurnaroundJob[] {
  const jobs: FaceTurnaroundJob[] = [];

  for (const slug of slugs) {
    for (const angle of ['front', 'right', 'left'] as FaceAngle[]) {
      const scenes = ANGLE_SCENES[angle];
      scenes.forEach((scenePrompt, idx) => {
        const variation = idx + 1;
        jobs.push({
          id: `${slug}-${angle}-v${variation}`,
          character: slug,
          angle,
          variation,
          label: `${ANGLE_LABELS[angle]} v${variation}`,
          scenePrompt,
          negativePrompt: FACE_TURNAROUND_NEGATIVE,
        });
      });
    }
  }

  return jobs;
}

export function buildFaceTurnaroundMjCommand(job: FaceTurnaroundJob): string {
  return buildCharacterMjCommand(job.character, job.scenePrompt, job.negativePrompt);
}

export function getFaceTurnaroundCharacter(slug: string): FaceTurnaroundCharacter | undefined {
  return FACE_TURNAROUND_CHARACTERS.find((c) => c.slug === slug);
}
