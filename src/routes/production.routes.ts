import { Router, Request, Response } from 'express';
import {
  bootstrapPhotoLibrary,
  productionQueue,
  productionDashboard,
  getProductionDb,
  startImportWatcher,
  ingestPipeline,
  productionOrchestrator,
  productionStats,
} from '../lib/midjourney-production/index.js';
import { MJ_IMPORT_WATCH_FOLDER, MJ_PHOTOS_PER_CHARACTER, MJ_PRODUCTION_PHASE } from '../config/midjourney-production.config.js';

export const productionRouter = Router();

/** Bootstrap D:\PickMeTalk_PhotoLibrary */
productionRouter.post('/bootstrap', (_req: Request, res: Response) => {
  const result = bootstrapPhotoLibrary();
  res.json(result);
});

/** Create production queue run */
productionRouter.post('/queue', (req: Request, res: Response) => {
  const photosPerCharacter = Number(req.body.photosPerCharacter ?? MJ_PHOTOS_PER_CHARACTER);
  const run = productionQueue.createRun({ photosPerCharacter });
  const first = productionQueue.activateNextJob(run.id);
  res.status(201).json({ run, firstJob: first });
});

/** Dashboard snapshot JSON */
productionRouter.get('/dashboard', (_req: Request, res: Response) => {
  res.json(productionDashboard.getSnapshot());
});

/** Activate next pending job (returns MJ command) */
productionRouter.post('/queue/next', (req: Request, res: Response) => {
  const runId = req.body.runId as string | undefined;
  const run = runId ? productionQueue.getRun(runId) : productionQueue.getActiveRun();
  if (!run) return res.status(404).json({ error: 'No active run' });
  const job = productionQueue.activateNextJob(run.id);
  if (!job) return res.status(404).json({ error: 'No pending jobs' });
  res.json({ job });
});

/** Pending face review list */
productionRouter.get('/review', (req: Request, res: Response) => {
  const character = req.query.character as string | undefined;
  res.json({ items: getProductionDb().getPendingReviews(character) });
});

/** Production orchestrator tick (top-up, regen, stats) */
productionRouter.post('/orchestrator/tick', (req: Request, res: Response) => {
  const phase = Number(req.body.phase ?? MJ_PRODUCTION_PHASE);
  const result = productionOrchestrator.tick(phase);
  res.json({
    ...result,
    recommendedPhase: productionOrchestrator.recommendNextPhase(),
  });
});

/** Quality stats for phase gate decisions */
productionRouter.get('/stats', (_req: Request, res: Response) => {
  const report = productionStats.collect();
  res.json({
    ...report,
    recommendedPhase: productionOrchestrator.recommendNextPhase(),
  });
});

/** Recent production event log */
productionRouter.get('/events', (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 50);
  res.json({ events: getProductionDb().getRecentEvents(limit) });
});

/** Manual ingest from import path */
productionRouter.post('/ingest', async (req: Request, res: Response) => {
  const filePath = req.body.filePath as string;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const result = await ingestPipeline.ingestFromImport(filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Start import folder watcher (idempotent) */
productionRouter.post('/watch/start', (_req: Request, res: Response) => {
  bootstrapPhotoLibrary();
  startImportWatcher();
  res.json({ watching: MJ_IMPORT_WATCH_FOLDER });
});
