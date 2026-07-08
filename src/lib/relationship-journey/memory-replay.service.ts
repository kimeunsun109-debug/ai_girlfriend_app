import { memoryTimelineService } from './memory-timeline.service.js';
import { sharedMemoryService } from './shared-memory.service.js';

/**
 * MemoryReplayService — 6개월/1년 전 같은 날짜 추억 회상
 */
export class MemoryReplayService {
  async getReplayMessage(userCharacterId: string): Promise<string | null> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const onThisDay = await memoryTimelineService.findOnDate(userCharacterId, month, day);

    const pastYears = onThisDay.filter((m) => m.occurredAt.getFullYear() < now.getFullYear());
    if (pastYears.length === 0) {
      return this.recallFromSharedMemory(userCharacterId);
    }

    const memory = pastYears[Math.floor(Math.random() * pastYears.length)];
    const yearsAgo = now.getFullYear() - memory.occurredAt.getFullYear();

    const templates = [
      `오늘 보니까 딱 ${yearsAgo}년 전에도 이런 날이 있었더라.`,
      `${yearsAgo}년 전 오늘, "${memory.title}" 기억나?`,
      `작년 오늘은 ${memory.title}이었어.`,
      `그날 ${memory.description ?? memory.title}… 아직도 생각나.`,
    ];

    await memoryTimelineService.record({
      userCharacterId,
      eventType: 'MEMORY_REPLAY',
      title: '추억 회상',
      description: memory.title,
      emoji: '🕰️',
      emotionalIntensity: 0.7,
      metadata: { replayedMemoryId: memory.id, yearsAgo },
    });

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private async recallFromSharedMemory(userCharacterId: string): Promise<string | null> {
    const phrase = await sharedMemoryService.recallForMessage(userCharacterId);
    if (!phrase) return null;

    await memoryTimelineService.record({
      userCharacterId,
      eventType: 'MEMORY_REPLAY',
      title: '추억 회상',
      description: phrase,
      emoji: '🕰️',
      emotionalIntensity: 0.65,
    });

    return phrase;
  }

  async maybeInjectReplay(userCharacterId: string, probability = 0.15): Promise<string | null> {
    if (Math.random() > probability) return null;
    return this.getReplayMessage(userCharacterId);
  }
}

export const memoryReplayService = new MemoryReplayService();
