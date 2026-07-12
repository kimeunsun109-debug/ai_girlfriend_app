import { join } from 'path';
import { characterImageFactory } from '../photo-catalog/image-factory.js';
import { promptCatalogReader } from '../photo-catalog/prompt-catalog-reader.js';
import {
  MIDJOURNEY_IDENTITY_SUFFIX,
  PHOTO_LIBRARY_ROOT,
} from '../../config/photo-universe.config.js';
import { getCharacterSpecBySlug } from '../../data/character-specs.js';
import type { MidjourneyWorkflowPrompt } from './types.js';
import type { PhotoEmotion } from '../photo-catalog/types.js';

export interface PreparePromptOptions {
  characterSlug: string;
  category: string;
  emotion?: PhotoEmotion;
  time?: string;
  weather?: string;
  seed?: number;
  useCatalog?: boolean;
}

/** Map photo folder slug → prompt catalog category */
const PROMPT_CATEGORY_ALIASES: Record<string, string> = {
  hair: 'hair_salon',
  coffee: 'cafe',
  cafe: 'cafe',
  tteokbokki: 'food',
  weekend: 'walk',
  alcohol: 'bar',
  bar: 'bar',
  cherry: 'cherry_blossom',
  gym: 'gym',
  exercise: 'gym',
  late_snack: 'late_night_snack',
  commute: 'commute',
  subway: 'subway',
  office: 'office',
  lunch: 'lunch',
  drive: 'drive',
  beach: 'beach',
  camping: 'camping',
  snow: 'snow',
  rain: 'rain',
  birthday: 'birthday',
  christmas: 'christmas',
  valentine: 'valentine',
  study: 'study',
  cooking: 'cooking',
  movie: 'movie',
  game: 'game_room',
  reading: 'reading',
  mirror: 'mirror_selfie',
  selfie: 'selfie',
  bed: 'bed',
  sleep: 'sleep',
  sick: 'sick',
  hospital: 'hospital',
  date: 'date',
  dog: 'pet_dog',
  cat: 'pet_cat',
};

export function resolvePromptCategory(folderSlug: string): string {
  return PROMPT_CATEGORY_ALIASES[folderSlug] ?? folderSlug;
}

/**
 * Build Midjourney-ready prompt with locked identity for face consistency.
 * Operator pastes `midjourneyCommand` into Discord MJ bot.
 */
export function prepareMidjourneyPrompt(opts: PreparePromptOptions): MidjourneyWorkflowPrompt {
  const slug = characterImageFactory.resolveSlug(opts.characterSlug) ?? opts.characterSlug;
  const spec = getCharacterSpecBySlug(slug);
  const promptCategory = resolvePromptCategory(opts.category);
  const targetFolder = join(PHOTO_LIBRARY_ROOT, slug, opts.category).replace(/\\/g, '/');

  let prompt = '';
  let negativePrompt = '';
  let catalogPromptId: string | undefined;

  if (opts.useCatalog !== false) {
    const catalogPrompt = promptCatalogReader.getRandomPrompt(slug, promptCategory, opts.seed);
    if (catalogPrompt) {
      prompt = catalogPrompt.prompt;
      negativePrompt = catalogPrompt.negativePrompt;
      catalogPromptId = `${slug}/${promptCategory}`;
    }
  }

  if (!prompt) {
    const generated = characterImageFactory.generate(slug, {
      seed: opts.seed ?? Date.now(),
      scenario: {
        ...characterImageFactory.scenarioFromCategory(opts.category, opts.emotion),
        ...(opts.time ? { time: opts.time } : {}),
        ...(opts.weather ? { weather: opts.weather } : {}),
      },
    });
    prompt = generated?.prompt ?? '';
    negativePrompt = generated?.negativePrompt ?? '';
  }

  const identityNote =
    spec?.identity
      ? `IDENTITY LOCK — same person every photo: ${spec.identity.faceShape}, ${spec.identity.eyes}, ${spec.identity.baseHairstyle}, age ${spec.identity.age}. Never change face.`
      : 'Keep identical face across all generations.';

  const fullPrompt = `${prompt}. ${identityNote} Korean woman ${spec?.name ?? slug}, photorealistic smartphone photo, natural skin texture.`;

  const midjourneyCommand = `/imagine prompt: ${fullPrompt} --no ${negativePrompt} ${MIDJOURNEY_IDENTITY_SUFFIX}`;

  return {
    character: spec?.name ?? slug,
    slug,
    category: opts.category,
    targetFolder,
    prompt: fullPrompt,
    negativePrompt,
    midjourneyCommand,
    identityNote,
    catalogPromptId,
  };
}

export function formatMidjourneyWorkflowSteps(prompt: MidjourneyWorkflowPrompt): string {
  return [
    '1. Prompt Catalog에서 프롬프트 선택 (또는 CLI: npm run universe:prompt)',
    '2. Midjourney Discord에서 imagine 명령 실행',
    '3. 생성된 이미지 Upscale 후 다운로드',
    `4. 저장 위치: ${prompt.targetFolder}`,
    '5. 폴더 감시가 자동 등록 (또는 npm run universe:scan)',
    '6. .meta.json 사이드카 자동 생성',
  ].join('\n');
}
