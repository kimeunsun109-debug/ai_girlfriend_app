/**
 * Prompt Catalog Reader — load prompt libraries from assets/prompts/
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  PROMPTS_ROOT,
  type PromptCatalogEntry,
  type PromptCatalogFile,
  type CharacterCatalogIndex,
} from './prompt-catalog-builder.js';
import { getPromptCategory } from '../../config/prompt-categories.config.js';
import { resolveCharacterSlug } from './types.js';

export class PromptCatalogReader {
  getCategoryPath(characterSlug: string, categorySlug: string): string {
    return join(PROMPTS_ROOT, characterSlug, `${categorySlug}.json`);
  }

  getIndexPath(characterSlug: string): string {
    return join(PROMPTS_ROOT, characterSlug, '_index.json');
  }

  hasCatalog(characterSlug: string): boolean {
    return existsSync(this.getIndexPath(characterSlug));
  }

  loadIndex(characterSlug: string): CharacterCatalogIndex | null {
    const path = this.getIndexPath(characterSlug);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8')) as CharacterCatalogIndex;
  }

  loadCategory(characterSlug: string, categorySlug: string): PromptCatalogFile | null {
    const path = this.getCategoryPath(characterSlug, categorySlug);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8')) as PromptCatalogFile;
  }

  listCharacters(): string[] {
    if (!existsSync(PROMPTS_ROOT)) return [];
    return readdirSync(PROMPTS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  }

  listCategories(characterInput: string): CharacterCatalogIndex | null {
    const slug = resolveCharacterSlug(characterInput);
    if (!slug) return null;
    return this.loadIndex(slug);
  }

  getPrompts(characterInput: string, categorySlug: string): PromptCatalogEntry[] {
    const slug = resolveCharacterSlug(characterInput);
    if (!slug) return [];
    const file = this.loadCategory(slug, categorySlug);
    return file?.prompts ?? [];
  }

  getRandomPrompt(characterInput: string, categorySlug: string, seed?: number): PromptCatalogEntry | null {
    const prompts = this.getPrompts(characterInput, categorySlug);
    if (!prompts.length) return null;
    const idx = seed != null ? seed % prompts.length : Math.floor(Math.random() * prompts.length);
    return prompts[idx] ?? null;
  }

  search(
    characterInput: string,
    filters: { emotion?: string; category?: string }
  ): PromptCatalogEntry[] {
    const slug = resolveCharacterSlug(characterInput);
    if (!slug) return [];

    const index = this.loadIndex(slug);
    if (!index) return [];

    const categories = filters.category
      ? index.categories.filter((c) => c.slug === filters.category)
      : index.categories;

    const results: PromptCatalogEntry[] = [];
    for (const cat of categories) {
      const file = this.loadCategory(slug, cat.slug);
      if (!file) continue;
      const matched = filters.emotion
        ? file.prompts.filter((p) => p.emotion === filters.emotion)
        : file.prompts;
      results.push(...matched);
    }

    return results;
  }

  getCategoryMeta(categorySlug: string) {
    return getPromptCategory(categorySlug);
  }
}

export const promptCatalogReader = new PromptCatalogReader();
