/**
 * Combinatorial prompt generation from existing Prompt Catalog.
 * Same catalog prompt is never regenerated (shared production DB).
 */
import { createHash, randomUUID } from 'node:crypto';
import type { PromptCatalogEntry } from '../photo-catalog/prompt-catalog-builder.js';
import { promptSelector } from '../midjourney-production/prompt-selector.js';
import { getProductionDb } from '../midjourney-production/production-db.js';
import { loadCharacterProfile } from './character-profile.js';

export type ComposedPrompt = {
  fingerprint: string;
  character: string;
  category: string;
  catalogIndex: number;
  emotion: string;
  location: string;
  season: string;
  weather: string;
  outfit: string;
  action: string;
  camera: string;
  lighting: string;
  prompt: string;
  negativePrompt: string;
  catalog: PromptCatalogEntry;
};

function inferSeason(entry: PromptCatalogEntry): string {
  const blob = `${entry.prompt} ${entry.weather} ${entry.location}`.toLowerCase();
  if (/(snow|winter|한겨울|눈)/.test(blob)) return 'winter';
  if (/(autumn|fall|가을|낙엽)/.test(blob)) return 'autumn';
  if (/(summer|여름|beach|hot)/.test(blob)) return 'summer';
  return 'spring';
}

function buildPositive(character: string, entry: PromptCatalogEntry): string {
  const profile = loadCharacterProfile(character);
  const identity =
    profile?.promptProfile.baseIdentity ??
    profile?.faceIdentity.identityPrompt ??
    `SAME PERSON — ${character}`;
  const styleHints = profile?.promptProfile.styleHints?.join(', ') ?? 'photorealistic, natural smartphone photo';

  return [
    identity,
    styleHints,
    entry.prompt,
    `emotion ${entry.emotion}`,
    `location ${entry.location}`,
    `weather ${entry.weather}`,
    `outfit ${entry.outfit}`,
    `action ${entry.action}`,
    `camera ${entry.camera}`,
    `lighting ${entry.lighting}`,
    'consistent face identity matching master dataset',
  ].join(', ');
}

function buildNegative(character: string, entry: PromptCatalogEntry): string {
  const profile = loadCharacterProfile(character);
  const forbidden = profile?.promptProfile.forbidden?.join(', ') ?? '';
  const identityNeg = profile?.faceIdentity.identityNegative ?? '';
  return [entry.negativePrompt, identityNeg, forbidden]
    .filter(Boolean)
    .join(', ');
}

/** Reserve a catalog prompt slot after successful generation. */
export function markComposedPromptUsed(composed: ComposedPrompt): void {
  getProductionDb().markPromptUsed(
    composed.character,
    composed.category,
    composed.catalogIndex,
    composed.fingerprint,
    `factory_${randomUUID()}`
  );
}

/**
 * Pick next unused catalog prompt without consuming it until generation succeeds.
 */
export function composeNextPrompt(character: string, preferredCategory?: string): ComposedPrompt | null {
  const selected = promptSelector.pickUnusedOrGenerate(character, preferredCategory);
  if (!selected) return null;

  const entry = selected.entry;
  const fingerprint =
    selected.promptHash ||
    createHash('sha256')
      .update(
        [
          character,
          selected.catalogCategory,
          String(selected.catalogIndex),
          entry.emotion,
          entry.location,
          entry.weather,
          entry.outfit,
          entry.action,
          entry.camera,
          entry.lighting,
        ].join('|')
      )
      .digest('hex')
      .slice(0, 24);

  return {
    fingerprint,
    character,
    category: selected.catalogCategory,
    catalogIndex: selected.catalogIndex,
    emotion: entry.emotion,
    location: entry.location || selected.catalogCategory,
    season: inferSeason(entry),
    weather: entry.weather,
    outfit: entry.outfit,
    action: entry.action,
    camera: entry.camera,
    lighting: entry.lighting,
    prompt: buildPositive(character, entry),
    negativePrompt: buildNegative(character, entry),
    catalog: entry,
  };
}

export function remainingFactoryPrompts(character: string): number {
  return promptSelector.remainingCount(character);
}
