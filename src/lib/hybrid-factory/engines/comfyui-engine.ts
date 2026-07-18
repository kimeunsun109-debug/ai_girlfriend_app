/**
 * ComfyUI HTTP engine — Windows RTX local production.
 * Expects ComfyUI API at COMFYUI_URL (default http://127.0.0.1:8188).
 * Workflow JSON can be customized via FACTORY_COMFY_WORKFLOW path.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomInt, randomUUID } from 'crypto';
import { FACTORY_LOCAL_API, FACTORY_PATHS } from '../../../config/hybrid-factory.config.js';
import type { GenerateRequest, GenerateResult, GenerationEngine } from './types.js';

export class ComfyUIEngine implements GenerationEngine {
  readonly id = 'comfyui';
  readonly displayName = 'ComfyUI (FLUX/SDXL workflow)';
  readonly capabilities = ['txt2img' as const, 'img2img' as const, 'character_ref' as const];

  private base(): string {
    return FACTORY_LOCAL_API.comfyui.replace(/\/$/, '');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base()}/system_stats`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const start = Date.now();
    const seed = req.seed ?? randomInt(1, 2_147_483_647);
    const available = await this.isAvailable();
    if (!available) {
      return {
        ok: false,
        engineId: this.id,
        model: 'comfyui',
        seed,
        error: `ComfyUI not reachable at ${this.base()} — start ComfyUI on RTX PC`,
        durationMs: Date.now() - start,
      };
    }

    // Minimal API: queue a prompt object. Users replace workflow with FLUX/SDXL graph.
    const workflowPath = process.env.FACTORY_COMFY_WORKFLOW?.trim();
    let workflow: Record<string, unknown>;
    if (workflowPath && existsSync(workflowPath)) {
      workflow = JSON.parse(readFileSync(workflowPath, 'utf-8')) as Record<string, unknown>;
      // Best-effort inject prompt/seed into common node fields
      this.injectPrompt(workflow, req.prompt, req.negativePrompt, seed, req.referenceImagePath);
    } else {
      workflow = {
        prompt: req.prompt,
        negative: req.negativePrompt,
        seed,
        width: req.width ?? 768,
        height: req.height ?? 1024,
        character: req.character,
        reference: req.referenceImagePath,
        note: 'Provide FACTORY_COMFY_WORKFLOW JSON for production FLUX/SDXL graphs',
      };
    }

    const clientId = randomUUID();
    try {
      const queueRes = await fetch(`${this.base()}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow, client_id: clientId }),
      });
      const queueJson = (await queueRes.json()) as { prompt_id?: string; error?: unknown };
      if (!queueRes.ok || !queueJson.prompt_id) {
        return {
          ok: false,
          engineId: this.id,
          model: 'comfyui',
          seed,
          error: `ComfyUI queue failed: ${JSON.stringify(queueJson).slice(0, 300)}`,
          durationMs: Date.now() - start,
        };
      }

      // Poll history for outputs (simplified)
      const imagePath = await this.waitForOutput(queueJson.prompt_id, req.character, seed);
      if (!imagePath) {
        return {
          ok: false,
          engineId: this.id,
          model: 'comfyui',
          seed,
          error: 'ComfyUI job finished without image output (check workflow)',
          durationMs: Date.now() - start,
        };
      }

      return {
        ok: true,
        engineId: this.id,
        model: String(process.env.FACTORY_COMFY_MODEL ?? 'comfyui-workflow'),
        seed,
        imagePath,
        durationMs: Date.now() - start,
      };
    } catch (e) {
      return {
        ok: false,
        engineId: this.id,
        model: 'comfyui',
        seed,
        error: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - start,
      };
    }
  }

  private injectPrompt(
    workflow: Record<string, unknown>,
    prompt: string,
    negative: string,
    seed: number,
    referenceImagePath?: string
  ): void {
    for (const node of Object.values(workflow)) {
      if (!node || typeof node !== 'object') continue;
      const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
      if (!inputs) continue;
      if (typeof inputs.text === 'string') {
        inputs.text = inputs.text
          .replace(/\{\{PROMPT\}\}/g, prompt)
          .replace(/\{\{NEGATIVE\}\}/g, negative);
      }
      if (referenceImagePath) {
        for (const key of ['image', 'path', 'filename'] as const) {
          const value = inputs[key];
          if (typeof value === 'string' && value.includes('{{REFERENCE}}')) {
            inputs[key] = value.replace(/\{\{REFERENCE\}\}/g, referenceImagePath);
          }
        }
      }
      if ('seed' in inputs) inputs.seed = seed;
      if ('noise_seed' in inputs) inputs.noise_seed = seed;
    }
  }

  private async waitForOutput(
    promptId: string,
    character: string,
    seed: number
  ): Promise<string | null> {
    const timeout = Number(process.env.FACTORY_COMFY_TIMEOUT_MS ?? 300_000);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 2000));
      const hist = await fetch(`${this.base()}/history/${promptId}`);
      if (!hist.ok) continue;
      const json = (await hist.json()) as Record<string, unknown>;
      const entry = json[promptId] as
        | { outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string }> }> }
        | undefined;
      if (!entry?.outputs) continue;

      for (const out of Object.values(entry.outputs)) {
        const img = out.images?.[0];
        if (!img) continue;
        const viewUrl = `${this.base()}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? '')}&type=output`;
        const res = await fetch(viewUrl);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        mkdirSync(FACTORY_PATHS.generatedInbox, { recursive: true });
        const dest = join(
          FACTORY_PATHS.generatedInbox,
          `${character}_comfy_${seed}_${Date.now()}.png`
        );
        writeFileSync(dest, buf);
        return dest;
      }
    }
    return null;
  }
}
