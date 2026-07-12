/**
 * Prompt Catalog Builder — generates deduplicated prompt libraries per character/category.
 */
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  PROMPT_CATEGORIES,
  type PromptCategoryDef,
  getTotalPromptCapacity,
} from '../../config/prompt-categories.config.js';
import { CHARACTER_SPECS } from '../../data/character-specs.js';
import {
  characterImageFactory,
  type GeneratedImagePrompt,
  type ImageScenario,
} from './image-factory.js';

export const PROMPTS_ROOT = join(process.cwd(), 'assets', 'prompts');
export const CATALOG_VERSION = '1.0.0';

export interface PromptCatalogEntry {
  id: string;
  category: string;
  emotion: string;
  camera: string;
  weather: string;
  time: string;
  lighting: string;
  location: string;
  action: string;
  outfit: string;
  expression: string;
  prompt: string;
  negativePrompt: string;
  seed: number;
}

export interface PromptCatalogFile {
  character: string;
  slug: string;
  category: string;
  categoryKo: string;
  version: string;
  generatedAt: string;
  count: number;
  prompts: PromptCatalogEntry[];
}

export interface CharacterCatalogIndex {
  character: string;
  slug: string;
  version: string;
  generatedAt: string;
  categoryCount: number;
  totalPrompts: number;
  categories: Array<{ slug: string; nameKo: string; count: number; file: string }>;
}

export interface BuildCatalogResult {
  character: string;
  slug: string;
  categoriesBuilt: number;
  totalPrompts: number;
  duplicatesSkipped: number;
}

function hashSeed(character: string, category: string, index: number): number {
  const hex = createHash('sha256').update(`${character}:${category}:${index}`).digest('hex');
  return parseInt(hex.slice(0, 8), 16);
}

function normalizeForDedup(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function toEntry(
  generated: GeneratedImagePrompt,
  categorySlug: string
): PromptCatalogEntry {
  const s = generated.scenario;
  return {
    id: `${generated.slug}-${categorySlug}-${generated.seed}`,
    category: categorySlug,
    emotion: s.emotion,
    camera: s.camera,
    weather: s.weather,
    time: s.time,
    lighting: s.lighting,
    location: s.location,
    action: s.action,
    outfit: s.outfit,
    expression: s.expression,
    prompt: generated.prompt,
    negativePrompt: generated.negativePrompt,
    seed: generated.seed,
  };
}

function buildCategoryPrompts(
  characterSlug: string,
  category: PromptCategoryDef
): { prompts: PromptCatalogEntry[]; duplicatesSkipped: number } {
  const prompts: PromptCatalogEntry[] = [];
  const seen = new Set<string>();
  let duplicatesSkipped = 0;
  let index = 0;
  const maxAttempts = category.promptCount * 8;

  for (let attempt = 0; attempt < maxAttempts && prompts.length < category.promptCount; attempt++) {
    const seed = hashSeed(characterSlug, category.slug, index + attempt * 17);
    const generated = characterImageFactory.generate(characterSlug, {
      scenario: category.scenarioDefaults as Partial<ImageScenario>,
      seed,
    });

    if (!generated) break;

    const key = normalizeForDedup(generated.prompt);
    if (seen.has(key)) {
      duplicatesSkipped++;
      continue;
    }

    seen.add(key);
    prompts.push(toEntry(generated, category.slug));
    index++;
  }

  return { prompts, duplicatesSkipped };
}

export class PromptCatalogBuilder {
  getCategoryPath(characterSlug: string, categorySlug: string): string {
    return join(PROMPTS_ROOT, characterSlug, `${categorySlug}.json`);
  }

  getIndexPath(characterSlug: string): string {
    return join(PROMPTS_ROOT, characterSlug, '_index.json');
  }

  buildCategoryFile(characterSlug: string, category: PromptCategoryDef): PromptCatalogFile {
    const spec = CHARACTER_SPECS.find((c) => c.slug === characterSlug);
    const { prompts } = buildCategoryPrompts(characterSlug, category);

    return {
      character: spec?.name ?? characterSlug,
      slug: characterSlug,
      category: category.slug,
      categoryKo: category.nameKo,
      version: CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      count: prompts.length,
      prompts,
    };
  }

  writeCategoryFile(characterSlug: string, category: PromptCategoryDef): PromptCatalogFile {
    const file = this.buildCategoryFile(characterSlug, category);
    const dir = join(PROMPTS_ROOT, characterSlug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.getCategoryPath(characterSlug, category.slug), JSON.stringify(file, null, 2), 'utf-8');
    return file;
  }

  buildCharacterIndex(characterSlug: string, built: PromptCatalogFile[]): CharacterCatalogIndex {
    const spec = CHARACTER_SPECS.find((c) => c.slug === characterSlug);
    return {
      character: spec?.name ?? characterSlug,
      slug: characterSlug,
      version: CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      categoryCount: built.length,
      totalPrompts: built.reduce((s, f) => s + f.count, 0),
      categories: built.map((f) => ({
        slug: f.category,
        nameKo: f.categoryKo,
        count: f.count,
        file: `${f.category}.json`,
      })),
    };
  }

  buildCharacter(characterSlug: string, categories = PROMPT_CATEGORIES): BuildCatalogResult {
    let duplicatesSkipped = 0;
    const built: PromptCatalogFile[] = [];

    for (const category of categories) {
      const { prompts, duplicatesSkipped: dup } = buildCategoryPrompts(characterSlug, category);
      duplicatesSkipped += dup;

      const spec = CHARACTER_SPECS.find((c) => c.slug === characterSlug);
      const file: PromptCatalogFile = {
        character: spec?.name ?? characterSlug,
        slug: characterSlug,
        category: category.slug,
        categoryKo: category.nameKo,
        version: CATALOG_VERSION,
        generatedAt: new Date().toISOString(),
        count: prompts.length,
        prompts,
      };

      const dir = join(PROMPTS_ROOT, characterSlug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(this.getCategoryPath(characterSlug, category.slug), JSON.stringify(file, null, 2), 'utf-8');
      built.push(file);
    }

    const index = this.buildCharacterIndex(characterSlug, built);
    writeFileSync(this.getIndexPath(characterSlug), JSON.stringify(index, null, 2), 'utf-8');

    return {
      character: index.character,
      slug: characterSlug,
      categoriesBuilt: built.length,
      totalPrompts: index.totalPrompts,
      duplicatesSkipped,
    };
  }

  buildAll(characters = CHARACTER_SPECS.map((c) => c.slug)): BuildCatalogResult[] {
    return characters.map((slug) => this.buildCharacter(slug));
  }

  getExpectedCapacity(): { categories: number; perCharacter: number; allCharacters: number } {
    const perCharacter = getTotalPromptCapacity();
    return {
      categories: PROMPT_CATEGORIES.length,
      perCharacter,
      allCharacters: perCharacter * CHARACTER_SPECS.length,
    };
  }
}

export const promptCatalogBuilder = new PromptCatalogBuilder();
