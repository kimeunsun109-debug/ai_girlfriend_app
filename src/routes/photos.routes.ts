import { Router, Request, Response } from 'express';
import { photoCatalogRepository } from '../lib/photo-catalog/photo-repository.js';
import { buildPhotoUrl } from '../lib/photo-catalog/index-manager.js';
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
