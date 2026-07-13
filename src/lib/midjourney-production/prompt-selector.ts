import { createHash } from 'crypto';
import { promptCatalogReader } from '../photo-catalog/prompt-catalog-reader.js';
import type { PromptCatalogEntry } from '../photo-catalog/prompt-catalog-builder.js';
import { getProductionDb } from './production-db.js';
import { runtimeSceneGenerator } from './runtime-scene-generator.js';

export interface SelectedPrompt {
  character: string;
  catalogCategory: string;
  catalogIndex: number;
  entry: PromptCatalogEntry;
  promptHash: string;
  source?: 'catalog' | 'generated';
}

/**
 * Select unused prompts from Prompt Catalog — never repeats catalog_index per character.
 */
export class PromptSelector {
  pickUnused(
    character: string,
    preferredCategory?: string,
    maxAttempts = 500
  ): SelectedPrompt | null {
    const db = getProductionDb();
    const index = promptCatalogReader.loadIndex(character);
    if (!index?.categories.length) return null;

    const categories = preferredCategory
      ? index.categories.filter((c) => c.slug === preferredCategory)
      : [...index.categories].sort(() => Math.random() - 0.5);

    if (categories.length === 0) return null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const cat = categories[attempt % categories.length]!;
      const file = promptCatalogReader.loadCategory(character, cat.slug);
      if (!file?.prompts.length) continue;

      const shuffled = [...file.prompts].sort(() => Math.random() - 0.5);
      for (const entry of shuffled) {
        const catalogIndex = file.prompts.indexOf(entry);
        if (db.isPromptUsed(character, cat.slug, catalogIndex)) continue;

        const promptHash = createHash('sha256').update(entry.prompt).digest('hex').slice(0, 16);
        return {
          character,
          catalogCategory: cat.slug,
          catalogIndex,
          entry,
          promptHash,
        };
      }
    }
    return null;
  }

  /** Catalog first; runtime scene generation when exhausted */
  pickUnusedOrGenerate(
    character: string,
    preferredCategory?: string,
    maxAttempts = 500
  ): SelectedPrompt | null {
    const catalog = this.pickUnused(character, preferredCategory, maxAttempts);
    if (catalog) return { ...catalog, source: 'catalog' };
    return runtimeSceneGenerator.generate(character, preferredCategory);
  }

  remainingCount(character: string): number {
    const index = promptCatalogReader.loadIndex(character);
    if (!index) return 0;
    const db = getProductionDb();
    let total = 0;
    let used = db.getUsedPromptCount(character);
    for (const cat of index.categories) {
      const file = promptCatalogReader.loadCategory(character, cat.slug);
      total += file?.prompts.length ?? 0;
    }
    return Math.max(0, total - used);
  }
}

export const promptSelector = new PromptSelector();

export function buildPromptId(character: string, category: string, index: number): string {
  return `${character}/${category}/${index}`;
}
