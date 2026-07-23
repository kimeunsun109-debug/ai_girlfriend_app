/**
 * Character Profile + Face Identity from Master Dataset.
 * All local generations must stay consistent with this identity.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { FACTORY_PATHS } from '../../config/hybrid-factory.config.js';
import { getCharacterFaceIdentity } from '../../config/character-face-reference.config.js';
import {
  cosineSimilarity,
  extractFaceEmbedding,
} from '../midjourney-production/face-verifier.js';
import { listMasterImages, loadMasterIndex } from './master-dataset.js';

export interface CharacterFaceIdentityProfile {
  character: string;
  /** Averaged embedding from master faces */
  faceEmbedding: number[];
  /** Per-master embeddings for max-similarity scoring */
  masterEmbeddings: Array<{ filename: string; embedding: number[] }>;
  identityPrompt: string;
  identityNegative: string;
  masterCount: number;
  builtAt: string;
  version: 1;
}

export interface CharacterPromptProfile {
  character: string;
  baseIdentity: string;
  styleHints: string[];
  recommendedEmotions: string[];
  forbidden: string[];
}

export interface CharacterProfileBundle {
  character: string;
  faceIdentity: CharacterFaceIdentityProfile;
  promptProfile: CharacterPromptProfile;
  metadata: {
    masterCount: number;
    readyForMassProduction: boolean;
    builtAt: string;
  };
}

function profilePath(character: string): string {
  return join(FACTORY_PATHS.profiles, character, 'profile.json');
}

function facePath(character: string): string {
  return join(FACTORY_PATHS.profiles, character, 'face-identity.json');
}

function averageEmbedding(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0]!.length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i] ?? 0;
  }
  for (let i = 0; i < dim; i++) out[i] /= vectors.length;
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

export async function buildCharacterProfile(character: string): Promise<CharacterProfileBundle> {
  const images = listMasterImages(character);
  if (images.length < 1) {
    throw new Error(`No master images for ${character} — register Master Dataset first`);
  }

  const masterEmbeddings: CharacterFaceIdentityProfile['masterEmbeddings'] = [];
  for (const img of images) {
    const embedding = await extractFaceEmbedding(img);
    masterEmbeddings.push({ filename: img.split(/[/\\]/).pop()!, embedding });
  }

  const faceEmbedding = averageEmbedding(masterEmbeddings.map((m) => m.embedding));
  const identity = getCharacterFaceIdentity(character);

  const faceIdentity: CharacterFaceIdentityProfile = {
    character,
    faceEmbedding,
    masterEmbeddings,
    identityPrompt: identity?.identityPrompt ?? `SAME PERSON — ${character}`,
    identityNegative: identity?.identityNegative ?? 'different person, different face',
    masterCount: images.length,
    builtAt: new Date().toISOString(),
    version: 1,
  };

  const promptProfile: CharacterPromptProfile = {
    character,
    baseIdentity: faceIdentity.identityPrompt,
    styleHints: [
      'photorealistic Korean woman',
      'natural smartphone photo',
      'same face as master dataset',
      'consistent bone structure and eye shape',
    ],
    recommendedEmotions: ['happy', 'smile', 'neutral', 'shy', 'excited'],
    forbidden: [
      'different identity',
      'face morph',
      'age change',
      'western features',
      'anime',
      'plastic skin',
    ],
  };

  const bundle: CharacterProfileBundle = {
    character,
    faceIdentity,
    promptProfile,
    metadata: {
      masterCount: images.length,
      readyForMassProduction: images.length >= 10,
      builtAt: new Date().toISOString(),
    },
  };

  mkdirSync(join(FACTORY_PATHS.profiles, character), { recursive: true });
  writeFileSync(facePath(character), JSON.stringify(faceIdentity, null, 2));
  writeFileSync(profilePath(character), JSON.stringify(bundle, null, 2));

  return bundle;
}

export function loadCharacterProfile(character: string): CharacterProfileBundle | null {
  const p = profilePath(character);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as CharacterProfileBundle;
}

export function loadFaceIdentity(character: string): CharacterFaceIdentityProfile | null {
  const p = facePath(character);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as CharacterFaceIdentityProfile;
}

/** Max similarity against any master embedding (or averaged identity) */
export async function verifyAgainstMaster(
  character: string,
  imagePath: string
): Promise<{ similarity: number; similarityPercent: number; bestMaster?: string }> {
  const identity = loadFaceIdentity(character);
  const embedding = await extractFaceEmbedding(imagePath);

  if (!identity?.masterEmbeddings.length) {
    return { similarity: 0, similarityPercent: 0 };
  }

  let best = 0;
  let bestMaster: string | undefined;
  for (const m of identity.masterEmbeddings) {
    const s = cosineSimilarity(embedding, m.embedding);
    if (s > best) {
      best = s;
      bestMaster = m.filename;
    }
  }
  // also compare to average
  const avg = cosineSimilarity(embedding, identity.faceEmbedding);
  if (avg > best) best = avg;

  return {
    similarity: best,
    similarityPercent: Math.round(best * 1000) / 10,
    bestMaster,
  };
}

export function masterIndexSummary(character: string) {
  return loadMasterIndex(character);
}
