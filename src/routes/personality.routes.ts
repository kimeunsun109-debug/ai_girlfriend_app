import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  adaptivePersonalityEngine,
  growthTimeline,
  habitLearningEngine,
  preferenceLearningEngine,
} from '../lib/adaptive-personality/index.js';

const prisma = new PrismaClient();
export const personalityRouter = Router();

async function loadContext(req: Request) {
  const userCharacterId =
    (req.query.userCharacterId as string | undefined) ??
    (req.body?.userCharacterId as string | undefined);
  if (!userCharacterId) return null;

  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { character: true },
  });
  return uc;
}

personalityRouter.get('/personality', async (req: Request, res: Response) => {
  const uc = await loadContext(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  await adaptivePersonalityEngine.ensure(uc.id);
  const data = await adaptivePersonalityEngine.getPersonality(uc.id);
  res.json(data);
});

personalityRouter.get('/personality/dna', async (req: Request, res: Response) => {
  const uc = await loadContext(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  await adaptivePersonalityEngine.ensure(uc.id);
  const data = await adaptivePersonalityEngine.getPersonality(uc.id);
  res.json({
    userCharacterId: uc.id,
    character: uc.character.name,
    dna: data?.dna ?? [],
  });
});

personalityRouter.get('/personality/history', async (req: Request, res: Response) => {
  const uc = await loadContext(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const history = await prisma.personalityHistory.findMany({
    where: { userCharacterId: uc.id },
    orderBy: { createdAt: 'desc' },
    take: parseInt((req.query.limit as string) ?? '100', 10),
  });

  const growth = await growthTimeline.get(uc.id, 100);
  res.json({ history, growth });
});

personalityRouter.post('/personality/update', async (req: Request, res: Response) => {
  const userCharacterId = req.body?.userCharacterId as string | undefined;
  const type = req.body?.type as string | undefined;
  if (!userCharacterId || !type) {
    return res.status(400).json({ error: 'userCharacterId and type required' });
  }

  await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
    type,
    value: req.body?.value,
    reaction: req.body?.reaction,
    reason: req.body?.reason,
    specialEvent: Boolean(req.body?.specialEvent),
  });

  const data = await adaptivePersonalityEngine.getPersonality(userCharacterId);
  res.json({ success: true, data });
});

personalityRouter.get('/preferences', async (req: Request, res: Response) => {
  const uc = await loadContext(req);
  if (!uc) return res.status(400).json({ error: 'userCharacterId required' });

  const preferences = await preferenceLearningEngine.getPreferences(uc.id);
  const habits = await habitLearningEngine.getHabits(uc.id);
  res.json({ preferences, habits });
});
