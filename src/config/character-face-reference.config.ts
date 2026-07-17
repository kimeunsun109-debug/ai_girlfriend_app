/**
 * 캐릭터별 Midjourney Identity Lock — 5명 전체
 * 원본: docs/캐릭터예시_사진.md + character-specs.ts
 *
 * 모든 MJ 프롬프트에 동일하게 포함. 얼굴/헤어는 절대 변경하지 않음.
 * 운영 자동화: --relax + --cref (캐릭터 레퍼런스) 강제.
 */
import type { CharacterVisualSpec } from '../data/character-specs.js';
import { getCharacterSpecBySlug } from '../data/character-specs.js';

export interface CharacterFaceIdentity {
  slug: string;
  name: string;
  identityPrompt: string;
  identityNegative: string;
}

const MJ_SUFFIX_BASE =
  '--style raw --ar 3:4 --v 6.1 --stylize 100 --no cartoon, illustration, anime, 3d render, plastic skin, deformed face, different person';

const COMMON_NEGATIVE = [
  'different person',
  'different face',
  'face change',
  'wrong identity',
  'cartoon',
  'anime',
  'illustration',
  '3d render',
  'plastic skin',
  'deformed face',
  'extra fingers',
  'bad anatomy',
  'uncanny valley',
  'western features',
].join(', ');

function buildIdentityFromSpec(spec: CharacterVisualSpec): CharacterFaceIdentity {
  const { identity, name, slug } = spec;
  const identityPrompt = [
    `SAME PERSON every photo — ${name} (${slug}), ${identity.age} year old Korean woman`,
    identity.faceShape,
    identity.eyes,
    identity.nose,
    identity.mouth,
    `${identity.skinTone}, realistic skin texture`,
    identity.baseHairstyle,
    'NEVER change face shape, eye shape, or bone structure',
    'identical facial identity across all images',
  ].join(', ');

  const characterSpecificNegative: string[] = [];
  if (slug === 'yuna') {
    characterSpecificNegative.push('blonde hair', 'blue eyes', 'short bob unless specified');
  } else if (slug === 'narin') {
    characterSpecificNegative.push('long hair unless specified', 'round face', 'cute puppy face');
  } else if (slug === 'yunseo') {
    characterSpecificNegative.push('short hair unless specified', 'playful expression', 'messy hair');
  } else if (slug === 'eunha') {
    characterSpecificNegative.push('long straight black hair', 'serious expression', 'corporate look');
  } else if (slug === 'jiyu') {
    characterSpecificNegative.push('formal suit', 'stiff pose', 'short bob unless specified');
  }

  return {
    slug,
    name,
    identityPrompt,
    identityNegative: [...COMMON_NEGATIVE.split(', '), ...characterSpecificNegative].join(', '),
  };
}

/** Pre-built identity locks for all 5 characters */
export const CHARACTER_FACE_IDENTITIES: Record<string, CharacterFaceIdentity> = {
  yuna: buildIdentityFromSpec(getCharacterSpecBySlug('yuna')!),
  narin: buildIdentityFromSpec(getCharacterSpecBySlug('narin')!),
  yunseo: buildIdentityFromSpec(getCharacterSpecBySlug('yunseo')!),
  eunha: buildIdentityFromSpec(getCharacterSpecBySlug('eunha')!),
  jiyu: buildIdentityFromSpec(getCharacterSpecBySlug('jiyu')!),
};

export const CHARACTER_SLUGS = ['yuna', 'narin', 'yunseo', 'eunha', 'jiyu'] as const;
export type CharacterSlug = (typeof CHARACTER_SLUGS)[number];

export function getCharacterFaceIdentity(slug: string): CharacterFaceIdentity | undefined {
  return CHARACTER_FACE_IDENTITIES[slug];
}

/** Character reference image URL for Midjourney --cref (face lock). Env: MJ_CREF_YUNA=https://... */
export function getCharacterCrefUrl(slug: string): string | null {
  const key = `MJ_CREF_${slug.toUpperCase()}`;
  const url = process.env[key]?.trim() || process.env.MJ_CREF_URL?.trim();
  return url || null;
}

export function getMjSuffix(_slug?: string): string {
  const relax =
    process.env.MJ_FORCE_RELAX === '0' || process.env.MJ_FORCE_RELAX === 'false'
      ? ''
      : ' --relax';
  return `${MJ_SUFFIX_BASE}${relax}`;
}

/** Build full Midjourney /imagine command with identity lock + optional --cref */
export function buildCharacterMjCommand(
  slug: string,
  scenePrompt: string,
  negativePrompt: string
): string {
  const identity = getCharacterFaceIdentity(slug);
  const suffix = getMjSuffix(slug);
  const cref = getCharacterCrefUrl(slug);
  const cw = Number(process.env.MJ_CREF_WEIGHT ?? 100);
  const crefPart = cref ? ` --cref ${cref} --cw ${Number.isFinite(cw) ? cw : 100}` : '';

  if (!identity) {
    return `/imagine prompt: ${scenePrompt} --no ${negativePrompt} ${suffix}${crefPart}`;
  }

  const fullPrompt = [
    identity.identityPrompt,
    scenePrompt,
    `natural smartphone selfie, photorealistic Korean woman ${identity.name}, same face as reference`,
    'Shot on iPhone, casual daily life, natural lighting, no AI beauty filter',
    'KEEP THE EXACT SAME FACE — do not alter identity',
  ].join('. ');

  return `/imagine prompt: ${fullPrompt} --no ${identity.identityNegative}, ${negativePrompt} ${suffix}${crefPart}`;
}
