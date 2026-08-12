import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomInt } from 'crypto';
import sharp from 'sharp';
import { FACTORY_PATHS } from '../../../config/hybrid-factory.config.js';
import type { GenerateRequest, GenerateResult, GenerationEngine } from './types.js';

/**
 * Stub engine — Cloud/CI safe. Writes a labeled placeholder PNG so the
 * rest of the pipeline (ingest, face, UI) can be exercised without GPU.
 * On Windows RTX, use ComfyUIEngine or A1111Engine instead.
 */
export class StubGenerationEngine implements GenerationEngine {
  readonly id = 'stub';
  readonly displayName = 'Stub (no GPU)';
  readonly capabilities = ['txt2img' as const];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const start = Date.now();
    const seed = req.seed ?? randomInt(1, 2_147_483_647);
    mkdirSync(FACTORY_PATHS.generatedInbox, { recursive: true });
    const out = join(
      FACTORY_PATHS.generatedInbox,
      `${req.character}_stub_${seed}_${Date.now()}.png`
    );

    const w = req.width ?? 768;
    const h = req.height ?? 1024;
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2a2a2a"/>
      <text x="50%" y="40%" fill="#ff8fab" font-size="36" text-anchor="middle" font-family="sans-serif">${req.character}</text>
      <text x="50%" y="50%" fill="#ccc" font-size="18" text-anchor="middle" font-family="sans-serif">STUB ENGINE — replace with FLUX/SDXL</text>
      <text x="50%" y="58%" fill="#888" font-size="14" text-anchor="middle" font-family="sans-serif">seed ${seed}</text>
    </svg>`;

    await sharp(Buffer.from(svg)).png().toFile(out);
    writeFileSync(
      out + '.gen.json',
      JSON.stringify({ engine: this.id, model: 'stub-placeholder', seed, prompt: req.prompt }, null, 2)
    );

    return {
      ok: true,
      engineId: this.id,
      model: 'stub-placeholder',
      seed,
      imagePath: out,
      durationMs: Date.now() - start,
    };
  }
}
