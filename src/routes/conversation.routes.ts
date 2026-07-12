import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { naturalConversationEngine } from '../lib/natural-conversation/index.js';

export const conversationRouter = Router();

const reactSchema = z.object({
  userCharacterId: z.string().uuid(),
  content: z.string().min(1),
});

/** 사용자 메시지에 대한 자연스러운 캐릭터 반응 (테스트/채팅 연동용) */
conversationRouter.post('/react', async (req: Request, res: Response) => {
  const parsed = reactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userCharacterId, content } = parsed.data;
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { user: true, character: true },
  });
  if (!uc) return res.status(404).json({ error: 'userCharacter not found' });

  const reaction = naturalConversationEngine.reactToUserMessage(content, {
    userName: uc.user.name,
    characterSlug: uc.character.slug ?? 'yuna',
    stageLevel: uc.relationshipLevel,
    useName: uc.relationshipLevel >= 3,
  });

  res.json({ reaction, intent: naturalConversationEngine.detectIntent(content) });
});
