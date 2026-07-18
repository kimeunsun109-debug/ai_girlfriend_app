import { FACTORY_ENGINE, type GenerationEngineId } from '../../../config/hybrid-factory.config.js';
import type { GenerationEngine } from './types.js';
import { StubGenerationEngine } from './stub-engine.js';
import { ComfyUIEngine } from './comfyui-engine.js';

const engines: Record<string, GenerationEngine> = {
  stub: new StubGenerationEngine(),
  comfyui: new ComfyUIEngine(),
  // Aliases — same ComfyUI host, different workflow via env
  flux: new ComfyUIEngine(),
  sdxl: new ComfyUIEngine(),
  a1111: new ComfyUIEngine(), // placeholder: point COMFYUI_URL or extend later
};

export function getGenerationEngine(id?: GenerationEngineId | string): GenerationEngine {
  const key = (id ?? FACTORY_ENGINE) as string;
  return engines[key] ?? engines.stub!;
}

export function listGenerationEngines(): Array<{ id: string; name: string }> {
  return Object.values(engines)
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .map((e) => ({ id: e.id, name: e.displayName }));
}

export type { GenerationEngine, GenerateRequest, GenerateResult } from './types.js';
