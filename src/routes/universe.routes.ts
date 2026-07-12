import { Router, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_PATHS } from '../config/photo-universe.config.js';
import {
  photoCacheService,
  prepareMidjourneyPrompt,
  formatMidjourneyWorkflowSteps,
  resolveLibraryPath,
  universeScanner,
  printScanReport,
} from '../lib/photo-universe/index.js';
import type { PhotoEmotion } from '../lib/photo-catalog/types.js';

export const universeRouter = Router();

/** Photo Universe 통계 */
universeRouter.get('/stats', (_req: Request, res: Response) => {
  res.json({
    libraryRoot: PHOTO_LIBRARY_ROOT,
    libraryExists: existsSync(PHOTO_LIBRARY_ROOT),
    dataRoot: PHOTO_UNIVERSE_PATHS,
    ...photoCacheService.getStats(),
  });
});

/** 고급 검색 — 캐릭터 + 상황 + 감정 + 날씨 등 */
universeRouter.get('/search', (req: Request, res: Response) => {
  const character = req.query.character as string;
  if (!character) return res.status(400).json({ error: 'character required' });

  const results = photoCacheService.search({
    character,
    location: req.query.location as string | undefined,
    category: req.query.category as string | undefined,
    time: req.query.time as 'morning' | undefined,
    weather: req.query.weather as 'rainy' | undefined,
    emotion: req.query.emotion as PhotoEmotion | undefined,
    outfit: req.query.outfit as string | undefined,
    limit: Math.min(Number(req.query.limit ?? 20), 50),
  });

  res.json({ count: results.length, results });
});

/** Cache-first lookup — 있으면 반환, 없으면 Midjourney 프롬프트 제안 */
universeRouter.get('/cache/lookup', (req: Request, res: Response) => {
  const character = req.query.character as string;
  const location = (req.query.location ?? req.query.category) as string | undefined;
  if (!character || !location) {
    return res.status(400).json({ error: 'character and location (or category) required' });
  }

  const result = photoCacheService.lookup({
    character,
    location,
    emotion: req.query.emotion as PhotoEmotion | undefined,
    time: req.query.time as 'morning' | undefined,
    weather: req.query.weather as 'rainy' | undefined,
    outfit: req.query.outfit as string | undefined,
  });

  res.json(result);
});

/** Midjourney 생성용 다음 프롬프트 */
universeRouter.get('/midjourney/prompt', (req: Request, res: Response) => {
  const character = req.query.character as string;
  const category = req.query.category as string;
  if (!character || !category) {
    return res.status(400).json({ error: 'character and category required' });
  }

  const prompt = prepareMidjourneyPrompt({
    characterSlug: character,
    category,
    emotion: req.query.emotion as PhotoEmotion | undefined,
    seed: req.query.seed ? Number(req.query.seed) : undefined,
  });

  res.json({
    ...prompt,
    workflow: formatMidjourneyWorkflowSteps(prompt),
  });
});

/** 수동 라이브러리 스캔 트리거 */
universeRouter.post('/scan', async (_req: Request, res: Response) => {
  try {
    const stats = await universeScanner.scanLibrary();
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Thumbnail static helper path check */
universeRouter.get('/thumbnails/*', (req: Request, res: Response) => {
  const rel = (req.params as { 0?: string })[0];
  if (!rel) return res.status(400).end();
  const safe = rel.replace(/\.\./g, '');
  const file = join(PHOTO_UNIVERSE_PATHS.thumbnails, safe);
  if (!existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

/** Library path validation middleware used in index.ts */
export function serveLibraryFile(relativePath: string, res: Response): void {
  const resolved = resolveLibraryPath(relativePath);
  if (!resolved || !existsSync(resolved)) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }
  res.sendFile(resolved);
}
