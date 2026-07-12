import { PrismaClient, ScheduleStatus, NotificationType } from '@prisma/client';
import type { LivingPushContext } from './types.js';

const prisma = new PrismaClient();

export interface QueuePhotoPushInput {
  userId: string;
  userCharacterId: string;
  characterId: string;
  scheduledAt: Date;
  context: LivingPushContext;
  eventId?: string;
  priority?: number;
}

/**
 * NotificationQueue — Living AI 알림 큐
 */
export class NotificationQueue {
  async enqueuePhotoPush(input: QueuePhotoPushInput): Promise<string> {
    const item = await prisma.notificationQueueItem.create({
      data: {
        userId: input.userId,
        userCharacterId: input.userCharacterId,
        characterId: input.characterId,
        type: NotificationType.PHOTO_PUSH,
        scheduledAt: input.scheduledAt,
        status: ScheduleStatus.PENDING,
        priority: input.priority ?? 0,
        payload: {
          categorySlug: input.context.categorySlug,
          emotion: input.context.emotion,
          activityLabel: input.context.activityLabel,
          eventType: input.context.eventType,
          memoryReminder: input.context.memoryReminder,
          affectionLevel: input.context.affectionLevel,
          useName: input.context.useName,
          contentStyle: input.context.contentStyle,
          eventId: input.eventId,
          eventMessage: input.context.eventMessage ?? input.context.activityLabel,
        },
      },
    });
    return item.id;
  }

  async enqueueMemoryReminder(
    userId: string,
    userCharacterId: string,
    characterId: string,
    scheduledAt: Date,
    message: string
  ): Promise<string> {
    const item = await prisma.notificationQueueItem.create({
      data: {
        userId,
        userCharacterId,
        characterId,
        type: NotificationType.MEMORY_REMINDER,
        scheduledAt,
        status: ScheduleStatus.PENDING,
        priority: 1,
        payload: { message },
      },
    });
    return item.id;
  }

  async getPendingDue(now: Date = new Date(), limit = 50) {
    return prisma.notificationQueueItem.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: { lte: now },
      },
      orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
      take: limit,
      include: {
        userCharacter: { include: { character: true } },
      },
    });
  }

  async markExecuted(id: string, pushScheduleId?: string): Promise<void> {
    await prisma.notificationQueueItem.update({
      where: { id },
      data: {
        status: ScheduleStatus.EXECUTED,
        executedAt: new Date(),
        pushScheduleId,
      },
    });
  }

  async markCancelled(id: string): Promise<void> {
    await prisma.notificationQueueItem.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });
  }

  async countPendingForDay(userId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return prisma.notificationQueueItem.count({
      where: {
        userId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { in: [ScheduleStatus.PENDING, ScheduleStatus.EXECUTED] },
      },
    });
  }
}

export const notificationQueue = new NotificationQueue();
