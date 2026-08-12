/**
 * Modular Generation Engine — swap FLUX / SDXL / ComfyUI without touching
 * Photo Library, Face Verification, Metadata, or Dashboard.
 */
export type EngineCapability = 'txt2img' | 'img2img' | 'character_ref';

export interface GenerateRequest {
  character: string;
  prompt: string;
  negativePrompt: string;
  seed?: number;
  width?: number;
  height?: number;
  /** Absolute path to master/reference face for img2img or IP-Adapter */
  referenceImagePath?: string;
  /** Extra engine-specific params */
  extras?: Record<string, unknown>;
}

export interface GenerateResult {
  ok: boolean;
  engineId: string;
  model: string;
  seed: number;
  imagePath?: string;
  /** Base64 if engine returns bytes without writing */
  imageBase64?: string;
  error?: string;
  durationMs: number;
}

export interface GenerationEngine {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: EngineCapability[];
  isAvailable(): Promise<boolean>;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}
