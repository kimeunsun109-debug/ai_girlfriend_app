import { PrismaClient } from '@prisma/client';
import type { AlbumCategory } from '@prisma/client';
import type { SharedMemoryInput } from './types.js';

const prisma = new PrismaClient();

export class SharedMemoryService {
  async create(input: SharedMemoryInput) {
    return prisma.sharedMemory.create({
      data: {
        userCharacterId: input.userCharacterId,
        title: input.title,
        content: input.content,
        recallPhrase: input.recallPhrase,
        emotionalIntensity: input.emotionalIntensity ?? 0.7,
        occurredAt: input.occurredAt ?? new Date(),
        tags: input.tags ?? [],
      },
    });
  }

  async getMemories(userCharacterId: string, limit = 20) {
    return prisma.sharedMemory.findMany({
      where: { userCharacterId },
      orderBy: { emotionalIntensity: 'desc' },
      take: limit,
    });
  }

  /** 감정이 강한 기억 우선 회상 */
  async recallForMessage(userCharacterId: string): Promise<string | null> {
    const memories = await prisma.sharedMemory.findMany({
      where: { userCharacterId },
      orderBy: [{ emotionalIntensity: 'desc' }, { occurredAt: 'desc' }],
      take: 10,
    });

    if (memories.length === 0) return null;

    const candidates = memories.filter(
      (m) => !m.lastRecalledAt || Date.now() - m.lastRecalledAt.getTime() > 7 * 86400000
    );
    const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? memories[0];

    await prisma.sharedMemory.update({
      where: { id: pick.id },
      data: { lastRecalledAt: new Date(), recallCount: { increment: 1 } },
    });

    return pick.recallPhrase;
  }

  async getEmotionalMemories(userCharacterId: string, minIntensity = 0.7) {
    return prisma.sharedMemory.findMany({
      where: { userCharacterId, emotionalIntensity: { gte: minIntensity } },
      orderBy: { occurredAt: 'desc' },
    });
  }
}

export const sharedMemoryService = new SharedMemoryService();
