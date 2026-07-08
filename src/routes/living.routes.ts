import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { param } from '../utils/route.utils.js';
import { dailyLifeGenerator } from '../lib/living-ai/daily-life-generator.js';
import { emotionStateManager } from '../lib/living-ai/emotion-state-manager.js';
import { livingAIScheduler } from '../lib/living-ai/living-ai-scheduler.js';
import { LIVING_EMOTION_TO_SLUG } from '../lib/living-ai/types.js';
import { formatInTimeZone, getUserTodayStart } from '../utils/push.utils.js';

const prisma = new PrismaClient();
export const livingRouter = Router();

/** 캐릭터 오늘 일과 */
livingRouter.get('/routine/:userCharacterId', async (req: Request, res: Response) => {
  const userCharacterId = param(req.params.userCharacterId);
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { user: true, character: true },
  });
  if (!uc) return res.status(404).json({ error: 'Not found' });

  const today = getUserTodayStart(uc.user.timezone);
  let routine = await dailyLifeGenerator.getTodayRoutine(userCharacterId, uc.user.timezone);

  if (!routine) {
    await dailyLifeGenerator.generateForUserCharacter(
      userCharacterId,
      uc.characterId,
      today,
      uc.user.timezone
    );
    routine = await dailyLifeGenerator.getTodayRoutine(userCharacterId, uc.user.timezone);
  }

  res.json({
    character: uc.character.name,
    date: formatInTimeZone(today, uc.user.timezone, 'yyyy-MM-dd'),
    routine,
  });
});

/** 현재 감정 상태 */
livingRouter.get('/emotion/:userCharacterId', async (req: Request, res: Response) => {
  const userCharacterId = param(req.params.userCharacterId);
  const state = await emotionStateManager.getState(userCharacterId);
  if (!state) {
    return res.json({ emotion: 'neutral', intensity: 0.5 });
  }
  res.json({
    emotion: LIVING_EMOTION_TO_SLUG[state.emotion],
    intensity: state.intensity,
    triggers: state.triggers,
    updatedAt: state.updatedAt,
  });
});

/** 호감도 + 기억 */
livingRouter.get('/relationship/:userCharacterId', async (req: Request, res: Response) => {
  const userCharacterId = param(req.params.userCharacterId);
  const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
  if (!uc) return res.status(404).json({ error: 'Not found' });

  const [shortTerm, longTerm] = await Promise.all([
    prisma.shortTermMemory.findMany({
      where: { userCharacterId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.longTermMemory.findMany({
      where: { userCharacterId },
      orderBy: { confidence: 'desc' },
      take: 20,
    }),
  ]);

  res.json({
    affectionScore: uc.affectionScore,
    relationshipLevel: uc.relationshipLevel,
    shortTermMemories: shortTerm,
    longTermMemories: longTerm,
  });
});

/** 오늘 이벤트 */
livingRouter.get('/events/:userCharacterId', async (req: Request, res: Response) => {
  const userCharacterId = param(req.params.userCharacterId);
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { user: true },
  });
  if (!uc) return res.status(404).json({ error: 'Not found' });

  const today = getUserTodayStart(uc.user.timezone);
  const events = await prisma.dailyLifeEvent.findMany({
    where: { userCharacterId, date: today },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({ events });
});

/** 수동 일일 계획 트리거 (개발/운영) */
livingRouter.post('/plan/:userId', async (req: Request, res: Response) => {
  const userId = param(req.params.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { characters: { where: { isActive: true } } },
  });
  if (!user || user.characters.length === 0) {
    return res.status(404).json({ error: 'User or character not found' });
  }

  const tomorrow = getUserTodayStart(user.timezone);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const uc = user.characters[0];

  const result = await livingAIScheduler.planDayForUserCharacter(
    userId,
    uc.id,
    uc.characterId,
    user.timezone,
    tomorrow
  );

  res.json(result);
});
