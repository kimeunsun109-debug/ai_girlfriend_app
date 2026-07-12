import { PrismaClient, PersonalityTrait } from '@prisma/client';

const prisma = new PrismaClient();

export class GrowthTimeline {
  async record(userCharacterId: string, input: { title: string; description: string; traitKey?: PersonalityTrait; delta?: number; emotionalIntensity?: number; metadata?: Record<string, unknown>; }): Promise<void> {
    await prisma.growthEvent.create({
      data: {
        userCharacterId,
        title: input.title,
        description: input.description,
        traitKey: input.traitKey,
        delta: input.delta,
        emotionalIntensity: input.emotionalIntensity ?? 0.5,
        metadata: input.metadata as never,
      },
    });
  }

  async get(userCharacterId: string, limit = 100) {
    return prisma.growthEvent.findMany({ where: { userCharacterId }, orderBy: { happenedAt: 'desc' }, take: limit });
  }
}

export const growthTimeline = new GrowthTimeline();
