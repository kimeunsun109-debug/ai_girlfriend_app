import { describe, it, expect } from 'vitest';
import {
  promptCatalogBuilder,
} from '../src/lib/photo-catalog/prompt-catalog-builder.js';
import { PROMPT_CATEGORIES } from '../src/config/prompt-categories.config.js';

describe('Prompt Catalog', () => {
  it('has 100+ categories', () => {
    expect(PROMPT_CATEGORIES.length).toBeGreaterThanOrEqual(100);
  });

  it('each category targets 20-50 prompts', () => {
    for (const cat of PROMPT_CATEGORIES) {
      expect(cat.promptCount).toBeGreaterThanOrEqual(20);
      expect(cat.promptCount).toBeLessThanOrEqual(50);
    }
  });

  it('builds unique prompts per category', () => {
    const cat = PROMPT_CATEGORIES.find((c) => c.slug === 'cafe')!;
    const file = promptCatalogBuilder.buildCategoryFile('yuna', cat);
    expect(file.count).toBe(cat.promptCount);
    const texts = file.prompts.map((p) => p.prompt);
    expect(new Set(texts).size).toBe(texts.length);
    expect(file.prompts[0]).toMatchObject({
      category: 'cafe',
      prompt: expect.stringContaining('SAME PERSON ALWAYS'),
      negativePrompt: expect.any(String),
      lighting: expect.any(String),
    });
  });

  it('per-character capacity exceeds 1000', () => {
    const cap = promptCatalogBuilder.getExpectedCapacity();
    expect(cap.perCharacter).toBeGreaterThanOrEqual(1000);
  });
});

describe('Prompt Catalog Reader', () => {
  it('exports reader with catalog root path', async () => {
    const { promptCatalogReader } = await import('../src/lib/photo-catalog/prompt-catalog-reader.js');
    const { PROMPTS_ROOT } = await import('../src/lib/photo-catalog/prompt-catalog-builder.js');
    expect(PROMPTS_ROOT).toContain('assets/prompts');
    expect(promptCatalogReader.listCharacters().length).toBeGreaterThanOrEqual(5);
  });
});
