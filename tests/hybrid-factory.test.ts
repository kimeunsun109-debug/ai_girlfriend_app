import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import {
  MASTER_SHOT_SPECS,
  masterShotScenePrompt,
  bootstrapMasterDataset,
  registerMasterImage,
  listMasterImages,
  getGenerationEngine,
  listGenerationEngines,
  mapEmotion,
  mapWeather,
  mapSeason,
  mapCamera,
  mapGeneratedBy,
  selectProfileCandidates,
  selectBestProfile,
  generateUiThumbnails,
  renderUiMockups,
  generateStyleGuide,
  buildCharacterProfile,
  verifyAgainstMaster,
} from '../src/lib/hybrid-factory/index.js';
import { FACTORY_PATHS, FACTORY_FACE, FACTORY_THUMB_SIZES } from '../src/config/hybrid-factory.config.js';

describe('Hybrid Photo Factory — Master specs', () => {
  it('defines 16 master shots covering required angles', () => {
    expect(MASTER_SHOT_SPECS.length).toBe(16);
    const angles = new Set(MASTER_SHOT_SPECS.map((s) => s.angle));
    expect(angles.has('front')).toBe(true);
    expect(angles.has('left45')).toBe(true);
    expect(angles.has('right45')).toBe(true);
    expect(angles.has('left_profile')).toBe(true);
    expect(angles.has('right_profile')).toBe(true);
  });

  it('builds scene prompts from shot specs', () => {
    const p = masterShotScenePrompt(MASTER_SHOT_SPECS[0]!);
    expect(p).toContain('front-facing');
    expect(p).toContain('photorealistic');
  });
});

describe('Hybrid Photo Factory — meta mappers', () => {
  it('maps catalog fields to universe enums', () => {
    expect(mapEmotion('smile')).toBe('happy');
    expect(mapEmotion('neutral')).toBe('neutral');
    expect(mapWeather('rainy afternoon')).toBe('rainy');
    expect(mapSeason('winter snow')).toBe('winter');
    expect(mapCamera('mirror selfie')).toBe('mirror selfie');
    expect(mapGeneratedBy('comfyui')).toBe('local_ai');
    expect(mapGeneratedBy('flux')).toBe('flux');
  });
});

describe('Hybrid Photo Factory — engines', () => {
  it('registers stub and comfyui engines', () => {
    const list = listGenerationEngines();
    expect(list.some((e) => e.id === 'stub')).toBe(true);
    expect(list.some((e) => e.id === 'comfyui')).toBe(true);
  });

  it('stub engine always available and generates png', async () => {
    const eng = getGenerationEngine('stub');
    expect(await eng.isAvailable()).toBe(true);
    const result = await eng.generate({
      character: 'yuna',
      prompt: 'test portrait',
      negativePrompt: 'bad',
      width: 256,
      height: 320,
    });
    expect(result.ok).toBe(true);
    expect(result.imagePath && existsSync(result.imagePath)).toBe(true);
  });
});

describe('Hybrid Photo Factory — face thresholds', () => {
  it('uses 95 / 90 production thresholds', () => {
    expect(FACTORY_FACE.autoApprove).toBe(0.95);
    expect(FACTORY_FACE.reviewMin).toBe(0.9);
    expect(FACTORY_FACE.rejectBelow).toBe(0.9);
  });
});

describe('Hybrid Photo Factory — Yuna profile pipeline (stub images)', () => {
  const character = 'yuna';
  let tmpMasterDir: string;

  beforeAll(async () => {
    bootstrapMasterDataset([character]);
    tmpMasterDir = join(FACTORY_PATHS.masterRoot, character, '_test_gen');
    mkdirSync(tmpMasterDir, { recursive: true });

    // Seed synthetic masters so Cloud/CI can exercise the pipeline without MJ
    if (listMasterImages(character).length < 10) {
      for (let i = 0; i < 10; i++) {
        const path = join(tmpMasterDir, `seed_${i}.png`);
        await sharp({
          create: {
            width: 384,
            height: 512,
            channels: 3,
            background: { r: 200 + (i % 20), g: 170, b: 160 },
          },
        })
          .png()
          .toFile(path);
        try {
          registerMasterImage({
            character,
            sourcePath: path,
            shotId: `test_m${String(i + 1).padStart(2, '0')}`,
          });
        } catch {
          /* duplicate ok */
        }
      }
    }
  });

  it('builds character face identity profile from masters', async () => {
    const bundle = await buildCharacterProfile(character);
    expect(bundle.faceIdentity.faceEmbedding.length).toBeGreaterThan(0);
    expect(bundle.faceIdentity.masterEmbeddings.length).toBeGreaterThanOrEqual(2);
    expect(bundle.metadata.masterCount).toBeGreaterThanOrEqual(2);
  });

  it('verifies a master image against face identity', async () => {
    const masters = listMasterImages(character);
    const face = await verifyAgainstMaster(character, masters[0]!);
    expect(face.similarity).toBeGreaterThan(0.5);
  });

  it('selects profile candidates and best profile', async () => {
    const candidates = await selectProfileCandidates(character, 5);
    expect(candidates.length).toBeGreaterThan(0);
    const best = await selectBestProfile(character);
    expect(best?.path).toBeTruthy();
    expect(best?.confidence).toBeGreaterThan(0);
  });

  it('generates multi-size UI thumbnails', async () => {
    const masters = listMasterImages(character);
    const thumbs = await generateUiThumbnails(masters[0]!, character, 'testhash123');
    for (const size of FACTORY_THUMB_SIZES) {
      expect(thumbs[size] && existsSync(thumbs[size]!)).toBe(true);
    }
  });

  it('renders UI mockups and style guide', async () => {
    const mock = await renderUiMockups(character);
    expect(existsSync(join(mock.outDir, 'index.html'))).toBe(true);
    expect(mock.evaluation.overall).toBeGreaterThan(0);
    const guide = await generateStyleGuide(character);
    expect(existsSync(guide)).toBe(true);
  });
});
