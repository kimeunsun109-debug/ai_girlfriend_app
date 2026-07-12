import { PrismaClient, Prisma } from '@prisma/client';
import { TIMELINE_EMOJI } from '../../config/relationship-journey.config.js';
import type { TimelineEntryInput } from './types.js';

const prisma = new PrismaClient();

/**
 * MemoryTimelineService — 추억 타임라인 CRUD
 */
export class MemoryTimelineService {
  async record(input: TimelineEntryInput) {
    const emoji = input.emoji ?? TIMELINE_EMOJI[input.eventType] ?? '✨';

    return prisma.memoryTimeline.create({
      data: {
        userCharacterId: input.userCharacterId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        emoji,
        photoId: input.photoId,
        photoUrl: input.photoUrl,
        pushLogId: input.pushLogId,
        albumCategory: input.albumCategory,
        emotionalIntensity: input.emotionalIntensity ?? 0.5,
        occurredAt: input.occurredAt ?? new Date(),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getTimeline(userCharacterId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      prisma.memoryTimeline.findMany({
        where: { userCharacterId },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.memoryTimeline.count({ where: { userCharacterId } }),
    ]);

    return { items, total, hasMore: offset + items.length < total };
  }

  async hasEvent(userCharacterId: string, eventType: string): Promise<boolean> {
    const count = await prisma.memoryTimeline.count({
      where: { userCharacterId, eventType: eventType as never },
    });
    return count > 0;
  }

  async getFirstOfType(userCharacterId: string, eventType: string) {
    return prisma.memoryTimeline.findFirst({
      where: { userCharacterId, eventType: eventType as never },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async findOnDate(userCharacterId: string, month: number, day: number) {
    const all = await prisma.memoryTimeline.findMany({
      where: { userCharacterId },
      orderBy: { occurredAt: 'asc' },
    });

    return all.filter((m) => {
      const d = m.occurredAt;
      return d.getMonth() + 1 === month && d.getDate() === day;
    });
  }
}

export const memoryTimelineService = new MemoryTimelineService();
