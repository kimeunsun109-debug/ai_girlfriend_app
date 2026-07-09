/**
 * PickMeTalk Character Image Factory
 * Builds photorealistic smartphone-style prompts with locked identity + random daily-life scenarios.
 */
import {
  ACTION_POOL,
  CAMERA_POOL,
  CHARACTER_DNA_LABELS,
  EMOTION_POOL,
  EXPRESSION_POOL,
  IDENTITY_LOCK_FIELDS,
  LOCATION_POOL,
  OUTFIT_POOL,
  QUALITY_NEGATIVE,
  QUALITY_POSITIVE,
  SHOT_RULES,
  TIME_POOL,
  WEATHER_POOL,
} from '../../config/character-image-factory.config.js';
import {
  CHARACTER_SPECS,
  getCharacterSpecBySlug,
  type CharacterVisualSpec,
} from '../../data/character-specs.js';
import { resolveCharacterSlug } from './types.js';

export interface ImageScenario {
  time: string;
  location: string;
  weather: string;
  outfit: string;
  emotion: string;
  action: string;
  expression: string;
  camera: string;
}

export interface ImagePromptOptions {
  /** Partial scenario overrides (category/emotion from photo catalog, etc.) */
  scenario?: Partial<ImageScenario>;
  /** Deterministic seed for reproducible random picks */
  seed?: number;
}

export interface GeneratedImagePrompt {
  character: string;
  slug: string;
  characterDNA: string;
  identityLock: string[];
  scenario: ImageScenario;
  prompt: string;
  negativePrompt: string;
  seed: number;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(pool: readonly T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)]!;
}

function pickScenario(rng: () => number, overrides?: Partial<ImageScenario>): ImageScenario {
  return {
    time: overrides?.time ?? pick(TIME_POOL, rng),
    location: overrides?.location ?? pick(LOCATION_POOL, rng),
    weather: overrides?.weather ?? pick(WEATHER_POOL, rng),
    outfit: overrides?.outfit ?? pick(OUTFIT_POOL, rng),
    emotion: overrides?.emotion ?? pick(EMOTION_POOL, rng),
    action: overrides?.action ?? pick(ACTION_POOL, rng),
    expression: overrides?.expression ?? pick(EXPRESSION_POOL, rng),
    camera: overrides?.camera ?? pick(CAMERA_POOL, rng),
  };
}

function buildIdentityBlock(spec: CharacterVisualSpec): string {
  const id = spec.identity;
  return [
    `SAME PERSON ALWAYS — ${spec.name} (${spec.slug})`,
    `Face shape: ${id.faceShape}`,
    `Eyes: ${id.eyes}`,
    `Nose: ${id.nose}`,
    `Mouth: ${id.mouth}`,
    `Skin tone: ${id.skinTone}`,
    `Age: ${id.age}`,
    `Body type: ${id.bodyType}`,
    `Base hairstyle: ${id.baseHairstyle} (ponytail/bun OK for situation)`,
    `Vibe: ${spec.vibe}`,
  ].join('. ');
}

function buildPromptBody(
  spec: CharacterVisualSpec,
  scenario: ImageScenario,
  dnaEn: string
): string {
  const sections = [
    'PickMeTalk Character Image Factory — MASTER PROMPT',
    '',
    '## Identity lock (NEVER change)',
    buildIdentityBlock(spec),
    `Locked fields: ${IDENTITY_LOCK_FIELDS.join(', ')}`,
    '',
    '## Character DNA',
    `${spec.characterDNA} / ${dnaEn}`,
    '',
    '## Scene (random daily life)',
    `Time: ${scenario.time}`,
    `Location: ${scenario.location}`,
    `Weather: ${scenario.weather}`,
    `Outfit: ${scenario.outfit}`,
    `Emotion: ${scenario.emotion}`,
    `Action: ${scenario.action}`,
    `Expression: ${scenario.expression}`,
    `Camera: ${scenario.camera}`,
    '',
    '## Photo quality',
    QUALITY_POSITIVE.join(', '),
    '',
    '## Shot rules',
    SHOT_RULES.join('. '),
    '',
    '## Character visual base',
    spec.imagePromptBase,
    '',
    '## Principle',
    'Feels like 2 years of the same person\'s SNS feed — same face, different moods and places. Natural smartphone capture, not AI beauty.',
  ];

  return sections.join('\n');
}

export class CharacterImageFactory {
  resolveSlug(input: string): string | null {
    return resolveCharacterSlug(input);
  }

  listCharacters(): Array<{ slug: string; name: string; characterDNA: string }> {
    return CHARACTER_SPECS.map((c) => ({
      slug: c.slug,
      name: c.name,
      characterDNA: c.characterDNA,
    }));
  }

  generate(characterInput: string, options: ImagePromptOptions = {}): GeneratedImagePrompt | null {
    const slug = resolveCharacterSlug(characterInput);
    if (!slug) return null;

    const spec = getCharacterSpecBySlug(slug);
    if (!spec) return null;

    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
    const rng = mulberry32(seed);
    const scenario = pickScenario(rng, options.scenario);
    const dnaEn = CHARACTER_DNA_LABELS[slug] ?? spec.characterDNA;

    return {
      character: spec.name,
      slug,
      characterDNA: spec.characterDNA,
      identityLock: [...IDENTITY_LOCK_FIELDS],
      scenario,
      prompt: buildPromptBody(spec, scenario, dnaEn),
      negativePrompt: QUALITY_NEGATIVE.join(', '),
      seed,
    };
  }

  generateBatch(
    characterInput: string,
    count: number,
    options: ImagePromptOptions = {}
  ): GeneratedImagePrompt[] {
    const results: GeneratedImagePrompt[] = [];
    let seed = options.seed ?? Date.now();

    for (let i = 0; i < count; i++) {
      const item = this.generate(characterInput, { ...options, seed: seed + i });
      if (item) results.push(item);
    }

    return results;
  }

  /** Map photo-catalog category slug to a plausible scene override */
  scenarioFromCategory(categorySlug: string, emotion?: string): Partial<ImageScenario> {
    const map: Record<string, Partial<ImageScenario>> = {
      hair: { location: 'hair salon mirror', action: 'at hair salon', camera: 'mirror selfie' },
      coffee: { location: 'cafe', action: 'drinking coffee', camera: 'photo on table pointing up' },
      rain: { weather: 'rain', location: 'home bedroom', action: 'looking out the window' },
      nail: { location: 'cafe', action: 'showing nails', camera: 'iPhone front selfie' },
      selfie: { camera: 'iPhone front selfie', action: 'taking selfie' },
      game: { location: 'home bedroom', action: 'gaming', outfit: 'hoodie' },
      walk: { location: 'neighborhood walk', action: 'walking', camera: 'friend took the photo' },
      tteokbokki: { location: 'restaurant', action: 'eating food' },
      happy: { emotion: 'happy', expression: 'natural subtle smile' },
      sad: { emotion: 'lonely', expression: 'pouty sulky face' },
      sleepy: { emotion: 'sleepy', expression: 'sleepy drowsy look', time: 'night' },
    };

    const base = map[categorySlug] ?? {};
    if (emotion && map[emotion]) {
      return { ...base, ...map[emotion] };
    }
    if (emotion) {
      return { ...base, emotion };
    }
    return base;
  }
}

export const characterImageFactory = new CharacterImageFactory();
