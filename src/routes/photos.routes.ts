import { Router, Request, Response } from 'express';
import { photoCatalogRepository } from '../lib/photo-catalog/photo-repository.js';
import { buildPhotoUrl } from '../lib/photo-catalog/index-manager.js';
import { characterImageFactory } from '../lib/photo-catalog/image-factory.js';
import { param } from '../utils/route.utils.js';

export const photosRouter = Router();

/** 캐릭터 + 상황 + 감정 기반 사진 검색 */
photosRouter.get('/search', (req: Request, res: Response) => {
  const character = req.query.character as string;
  const category = req.query.category as string;
  const emotion = req.query.emotion as string | undefined;

  if (!character || !category) {
    return res.status(400).json({ error: 'character and category required' });
  }

  const photo = photoCatalogRepository.selectPhoto({
    characterSlug: character,
    categorySlug: category,
    emotion: emotion as 'happy' | undefined,
  });

  if (!photo) {
    return res.status(404).json({ error: 'No matching photo' });
  }

  res.json({
    ...photo,
    url: buildPhotoUrl(photo.relativePath),
  });
});

/** AI 이미지 생성용 프롬프트 (Character Image Factory) */
photosRouter.get('/prompt', (req: Request, res: Response) => {
  const character = req.query.character as string;
  if (!character) {
    return res.status(400).json({ error: 'character required' });
  }

  const count = Math.min(parseInt(req.query.count as string, 10) || 1, 20);
  const seed = req.query.seed ? parseInt(req.query.seed as string, 10) : undefined;
  const category = req.query.category as string | undefined;
  const emotion = req.query.emotion as string | undefined;

  const scenarioOverride = category
    ? characterImageFactory.scenarioFromCategory(category, emotion)
    : emotion
      ? { emotion }
      : undefined;

  const prompts = characterImageFactory.generateBatch(character, count, {
    scenario: scenarioOverride,
    seed,
  });

  if (!prompts.length) {
    return res.status(404).json({ error: 'Unknown character' });
  }

  res.json({ count: prompts.length, prompts });
});

/** 캐릭터 Image Factory 메타 (DNA + identity lock 요약) */
photosRouter.get('/factory/:characterSlug', (req: Request, res: Response) => {
  const slug = param(req.params.characterSlug);
  const resolved = characterImageFactory.resolveSlug(slug);
  if (!resolved) return res.status(404).json({ error: 'Unknown character' });

  const chars = characterImageFactory.listCharacters();
  const meta = chars.find((c) => c.slug === resolved);
  if (!meta) return res.status(404).json({ error: 'Unknown character' });

  const sample = characterImageFactory.generate(resolved, { seed: 1 });
  res.json({
    ...meta,
    identityLockFields: sample?.identityLock ?? [],
    sampleScenario: sample?.scenario,
  });
});

/** 캐릭터 인덱스 통계 */
photosRouter.get('/stats/:characterSlug', (req: Request, res: Response) => {
  const index = photoCatalogRepository.getIndex(param(req.params.characterSlug));
  if (!index) return res.status(404).json({ error: 'Character index not found' });

  const byCategory: Record<string, number> = {};
  for (const p of index.photos) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }

  res.json({
    character: index.character,
    totalCount: index.totalCount,
    byCategory,
  });
});
