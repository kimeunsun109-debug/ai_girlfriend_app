import { Router, Request, Response } from 'express';
import { PrismaClient, AlbumCategory } from '@prisma/client';
import { param } from '../utils/route.utils.js';
import {
  memoryTimelineService,
  memoryAlbumService,
  sharedMemoryService,
  anniversaryEngine,
  relationshipJourneyService,
  memoryEventEngine,
  memoryReplayService,
} from '../lib/relationship-journey/index.js';

const prisma = new PrismaClient();
export const relationshipRouter = Router();

async function resolveUserCharacter(req: Request): Promise<{
  id: string;
  character: { name: string };
} | null> {
  const userCharacterId =
    (req.query.userCharacterId as string) ||
    (req.body?.userCharacterId as string);
  if (!userCharacterId) return null;

  return prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { character: true },
  });
}

/** GET /api/timeline */
relationshipRouter.get('/timeline', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const timeline = await memoryTimelineService.getTimeline(uc.id, limit, offset);

  res.json({
    title: '❤️ 우리의 추억',
    characterName: uc.character.name,
    ...timeline,
  });
});

/** POST /api/timeline */
relationshipRouter.post('/timeline', async (req: Request, res: Response) => {
  const { userCharacterId, eventType, title, description, emoji, photoUrl } = req.body;
  if (!userCharacterId || !eventType || !title) {
    return res.status(400).json({ error: 'userCharacterId, eventType, title required' });
  }

  const entry = await memoryTimelineService.record({
    userCharacterId,
    eventType,
    title,
    description,
    emoji,
    photoUrl,
    emotionalIntensity: req.body.emotionalIntensity ?? 0.5,
  });

  res.status(201).json(entry);
});

/** GET /api/anniversary */
relationshipRouter.get('/anniversary', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const anniversaries = await anniversaryEngine.getAll(uc.id);
  const upcoming = await anniversaryEngine.getUpcoming(uc.id);

  res.json({
    title: '🎂 Anniversary',
    anniversaries,
    upcoming,
  });
});

/** GET /api/memory */
relationshipRouter.get('/memory', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const [shared, emotional, replay] = await Promise.all([
    sharedMemoryService.getMemories(uc.id),
    sharedMemoryService.getEmotionalMemories(uc.id),
    memoryReplayService.getReplayMessage(uc.id),
  ]);

  res.json({
    title: 'Shared Memories',
    shared,
    emotional,
    replaySuggestion: replay,
  });
});

/** POST /api/memory */
relationshipRouter.post('/memory', async (req: Request, res: Response) => {
  const { userCharacterId, title, content, recallPhrase, emotionalIntensity, tags } = req.body;
  if (!userCharacterId || !title || !content || !recallPhrase) {
    return res.status(400).json({ error: 'userCharacterId, title, content, recallPhrase required' });
  }

  const memory = await sharedMemoryService.create({
    userCharacterId,
    title,
    content,
    recallPhrase,
    emotionalIntensity,
    tags,
  });

  res.status(201).json(memory);
});

/** GET /api/album */
relationshipRouter.get('/album', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const category = req.query.category as string | undefined;
  if (category) {
    const photos = await memoryAlbumService.getByCategory(uc.id, category as AlbumCategory);
    return res.json({ category, photos });
  }

  const album = await memoryAlbumService.getAlbum(uc.id);
  res.json({ title: '📷 Memory Album', ...album });
});

/** GET /api/journey — Relationship Journey */
relationshipRouter.get('/journey', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const journey = await relationshipJourneyService.getJourney(uc.id);
  res.json({ title: '💕 Relationship Journey', ...journey });
});

/** POST /api/journey/init — 첫 만남 초기화 */
relationshipRouter.post('/journey/init', async (req: Request, res: Response) => {
  const { userCharacterId } = req.body;
  if (!userCharacterId) return res.status(400).json({ error: 'userCharacterId required' });

  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { character: true },
  });
  if (!uc) return res.status(404).json({ error: 'Not found' });

  await memoryEventEngine.onUserCharacterCreated(userCharacterId, uc.character.name);
  const journey = await relationshipJourneyService.getJourney(userCharacterId);
  res.json(journey);
});

/** GET /api/replay — Memory Replay */
relationshipRouter.get('/replay', async (req: Request, res: Response) => {
  const uc = await resolveUserCharacter(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const message = await memoryReplayService.getReplayMessage(uc.id);
  res.json({ message });
});
