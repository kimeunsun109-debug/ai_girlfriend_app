import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { param } from '../utils/route.utils.js';
import { SpecialDayType } from '@prisma/client';
import { memoryEventEngine } from '../lib/relationship-journey/index.js';

export const userRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(120).optional(),
  timezone: z.string().default('Asia/Seoul'),
  country: z.string().default('KR'),
  birthday: z.string().datetime().optional(),
});

userRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, age, timezone, country, birthday } = parsed.data;

  const user = await prisma.user.create({
    data: {
      name,
      age,
      timezone,
      country,
      birthday: birthday ? new Date(birthday) : undefined,
    },
  });

  res.status(201).json(user);
});

userRouter.get('/:userId', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: param(req.params.userId) },
    include: {
      characters: { include: { character: true } },
      specialDays: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const linkCharacterSchema = z.object({
  characterId: z.string().uuid(),
});

userRouter.post('/:userId/characters', async (req: Request, res: Response) => {
  const parsed = linkCharacterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const relationshipStartAt = new Date();
  const day100Date = new Date(relationshipStartAt);
  day100Date.setDate(day100Date.getDate() + 100);

  const userCharacter = await prisma.userCharacter.create({
    data: {
      userId: param(req.params.userId),
      characterId: parsed.data.characterId,
      day100Date,
    },
    include: { character: true },
  });

  await memoryEventEngine.onUserCharacterCreated(
    userCharacter.id,
    userCharacter.character.name
  );

  res.status(201).json(userCharacter);
});

const specialDaySchema = z.object({
  type: z.nativeEnum(SpecialDayType),
  date: z.string(),
  label: z.string().optional(),
});

userRouter.post('/:userId/special-days', async (req: Request, res: Response) => {
  const parsed = specialDaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const specialDay = await prisma.userSpecialDay.create({
    data: {
      userId: param(req.params.userId),
      type: parsed.data.type,
      date: new Date(parsed.data.date),
      label: parsed.data.label,
    },
  });

  res.status(201).json(specialDay);
});

userRouter.patch('/:userId', async (req: Request, res: Response) => {
  const { name, age, timezone, pushEnabled } = req.body;

  const user = await prisma.user.update({
    where: { id: param(req.params.userId) },
    data: {
      ...(name !== undefined && { name }),
      ...(age !== undefined && { age }),
      ...(timezone !== undefined && { timezone }),
      ...(pushEnabled !== undefined && { pushEnabled }),
    },
  });

  res.json(user);
});
