import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';
import { ANNIVERSARY_MILESTONES } from '../../config/relationship-journey.config.js';
import { memoryTimelineService } from './memory-timeline.service.js';
import { sharedMemoryService } from './shared-memory.service.js';
import { dynamicConversationService } from './dynamic-conversation.service.js';

const prisma = new PrismaClient();

/**
 * AnniversaryEngine — 기념일 자동 계산·축하
 */
export class AnniversaryEngine {
  async seedAnniversaries(userCharacterId: string): Promise<void> {
    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    if (!uc) return;

    for (const milestone of ANNIVERSARY_MILESTONES) {
      const scheduledDate = addDays(uc.relationshipStartAt, milestone.dayCount);

      await prisma.anniversary.upsert({
        where: {
          userCharacterId_dayCount: { userCharacterId, dayCount: milestone.dayCount },
        },
        create: {
          userCharacterId,
          dayCount: milestone.dayCount,
          label: milestone.label,
          scheduledDate,
        },
        update: {},
      });
    }
  }

  async getUpcoming(userCharacterId: string, withinDays = 30) {
    const now = new Date();
    const until = addDays(now, withinDays);

    return prisma.anniversary.findMany({
      where: {
        userCharacterId,
        isCelebrated: false,
        scheduledDate: { gte: now, lte: until },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getAll(userCharacterId: string) {
    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    if (!uc) return [];

    const daysTogether = Math.floor(
      (Date.now() - uc.relationshipStartAt.getTime()) / 86400000
    );

    const anniversaries = await prisma.anniversary.findMany({
      where: { userCharacterId },
      orderBy: { dayCount: 'asc' },
    });

    return anniversaries.map((a) => ({
      ...a,
      emoji: ANNIVERSARY_MILESTONES.find((m) => m.dayCount === a.dayCount)?.emoji ?? '🎉',
      isPast: daysTogether >= a.dayCount,
      daysUntil: Math.max(0, a.dayCount - daysTogether),
    }));
  }

  async checkAndCelebrate(userCharacterId: string, characterName: string): Promise<string | null> {
    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
    if (!uc) return null;

    const daysTogether = Math.floor(
      (Date.now() - uc.relationshipStartAt.getTime()) / 86400000
    );

    const due = await prisma.anniversary.findFirst({
      where: {
        userCharacterId,
        dayCount: { lte: daysTogether },
        isCelebrated: false,
      },
      orderBy: { dayCount: 'desc' },
    });

    if (!due) return null;

    const milestone = ANNIVERSARY_MILESTONES.find((m) => m.dayCount === due.dayCount);
    const emoji = milestone?.emoji ?? '🎉';

    const timeline = await memoryTimelineService.record({
      userCharacterId,
      eventType: due.dayCount === 100 ? 'DAY_100' : due.dayCount === 200 ? 'DAY_200' : 'ANNIVERSARY',
      title: `${due.label} 기념일`,
      description: `${characterName}와(과) 함께한 ${due.label}`,
      emoji,
      emotionalIntensity: 0.95,
      albumCategory: 'ANNIVERSARY',
    });

    await prisma.anniversary.update({
      where: { id: due.id },
      data: { isCelebrated: true, celebratedAt: new Date(), timelineId: timeline.id },
    });

    await sharedMemoryService.create({
      userCharacterId,
      title: `${due.label} 기념일`,
      content: `우리 ${due.label}이야`,
      recallPhrase: `벌써 ${due.label}이네. 기억나?`,
      emotionalIntensity: 0.9,
      tags: ['anniversary', `${due.dayCount}d`],
    });

    return dynamicConversationService.getAnniversaryMessage(
      uc.relationshipLevel,
      due.label,
      characterName
    );
  }
}

export const anniversaryEngine = new AnniversaryEngine();
