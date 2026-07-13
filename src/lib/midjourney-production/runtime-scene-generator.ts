import { createHash } from 'crypto';
import { characterImageFactory } from '../photo-catalog/image-factory.js';
import type { PromptCatalogEntry } from '../photo-catalog/prompt-catalog-builder.js';
import {
  MJ_DYNAMIC_CATALOG_CATEGORY,
  MJ_PRODUCTION_RUNTIME_SCENE_GEN,
} from '../../config/midjourney-production.config.js';
import { getProductionDb } from './production-db.js';
import type { SelectedPrompt } from './prompt-selector.js';

/**
 * Runtime scene generation when Prompt Catalog is exhausted.
 * Uses Character Image Factory with deterministic seeds — no duplicate prompts.
 */
export class RuntimeSceneGenerator {
  generate(character: string, preferredCategory?: string): SelectedPrompt | null {
    if (!MJ_PRODUCTION_RUNTIME_SCENE_GEN) return null;

    const db = getProductionDb();
    const dynamicIndex = db.getNextDynamicIndex(character);
    const seed = Date.now() + dynamicIndex * 9973;

    const scenarioOverrides = preferredCategory
      ? characterImageFactory.scenarioFromCategory(preferredCategory)
      : undefined;

    const generated = characterImageFactory.generate(character, {
      seed,
      scenario: scenarioOverrides,
    });
    if (!generated) return null;

    const promptHash = createHash('sha256').update(generated.prompt).digest('hex').slice(0, 16);
    if (db.isPromptHashUsed(character, promptHash)) {
      return this.generate(character, preferredCategory);
    }

    const entry: PromptCatalogEntry = {
      id: `${character}/${MJ_DYNAMIC_CATALOG_CATEGORY}/${dynamicIndex}`,
      category: preferredCategory ?? 'daily',
      emotion: generated.scenario.emotion,
      camera: generated.scenario.camera,
      weather: generated.scenario.weather,
      time: generated.scenario.time,
      lighting: generated.scenario.lighting,
      location: generated.scenario.location,
      action: generated.scenario.action,
      outfit: generated.scenario.outfit,
      expression: generated.scenario.expression,
      prompt: generated.prompt,
      negativePrompt: generated.negativePrompt,
      seed: generated.seed,
    };

    db.registerDynamicPrompt(character, dynamicIndex, promptHash, generated.prompt, generated.negativePrompt);

    return {
      character,
      catalogCategory: MJ_DYNAMIC_CATALOG_CATEGORY,
      catalogIndex: dynamicIndex,
      entry,
      promptHash,
      source: 'generated',
    };
  }
}

export const runtimeSceneGenerator = new RuntimeSceneGenerator();
