import { PrismaClient } from '@prisma/client';
import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import { addHours } from 'date-fns';

const prisma = new PrismaClient();

/**
 * MemoryReminderEngine — 단기(24h)·장기 기억 관리
 */
export class MemoryReminderEngine {
  /** 채팅에서 단기/장기 기억 추출 */
  async processUserMessage(userCharacterId: string, content: string): Promise<void> {
    const lower = content.toLowerCase();

    for (const [keyword, meta] of Object.entries(LIVING_AI_CONFIG.MEMORY_KEYWORDS)) {
      if (lower.includes(keyword)) {
        await this.addShortTermMemory(userCharacterId, meta.topic, content, meta.emotion);
      }
    }

    if (lower.includes('좋아') && !lower.includes('싫어')) {
      const match = content.match(/(.{1,20})좋아/);
      if (match) {
        await this.upsertLongTerm(userCharacterId, 'PREFERENCE', 'likes', match[1].trim(), 'chat');
      }
    }

    if (lower.includes('싫어')) {
      const match = content.match(/(.{1,20})싫어/);
      if (match) {
        await this.upsertLongTerm(userCharacterId, 'DISLIKE', 'dislikes', match[1].trim(), 'chat');
      }
    }

    if (lower.includes('생일')) {
      await this.upsertLongTerm(userCharacterId, 'BIRTHDAY', 'mentioned', content.slice(0, 80), 'chat');
    }

    if (lower.match(/회사|직장|일해/)) {
      await this.upsertLongTerm(userCharacterId, 'JOB', 'work', content.slice(0, 80), 'chat');
    }
  }

  async addShortTermMemory(
    userCharacterId: string,
    topic: string,
    content: string,
    emotion?: string
  ): Promise<void> {
    const expiresAt = addHours(new Date(), LIVING_AI_CONFIG.SHORT_TERM_MEMORY_HOURS);

    await prisma.shortTermMemory.create({
      data: {
        userCharacterId,
        topic,
        content: content.slice(0, 200),
        emotion: emotion as never,
        expiresAt,
      },
    });
  }

  async upsertLongTerm(
    userCharacterId: string,
    category: 'PREFERENCE' | 'FOOD' | 'DISLIKE' | 'JOB' | 'LIFESTYLE' | 'BIRTHDAY' | 'HOBBY' | 'CUSTOM',
    key: string,
    value: string,
    source: string
  ): Promise<void> {
    await prisma.longTermMemory.upsert({
      where: {
        userCharacterId_category_key: { userCharacterId, category, key },
      },
      create: { userCharacterId, category, key, value, source },
      update: { value, source, confidence: Math.min(1, 0.8 + 0.05) },
    });
  }

  /** 오늘 사용할 단기 기억 리마인더 (아직 reminded=false) */
  async getReminderMessage(userCharacterId: string): Promise<string | null> {
    const now = new Date();
    const memory = await prisma.shortTermMemory.findFirst({
      where: {
        userCharacterId,
        expiresAt: { gt: now },
        reminded: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!memory) return null;

    const templates: Record<string, string[]> = {
      감기: ['감기 좀 괜찮아?', '목 안 아파?', '약은 먹었어?'],
      시험: ['시험 어땠어?', '시험 잘 봤어?'],
      야근: ['어제 야근했잖아, 좀 쉬어', '피곤하지?'],
      회의: ['회의 잘 됐어?', '오늘 회의 있지?'],
      운동: ['운동 갔다 왔어?', '오늘도 운동해?'],
      약속: ['약속 잊지 않았지?', '오늘 약속 기대돼'],
      비: ['우산 챙겼어?', '비 오는데 조심해'],
      늦잠: ['오늘도 늦잠?', '알람 맞춰~'],
    };

    const msgs = templates[memory.topic] ?? [`${memory.topic} 괜찮아?`];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    await prisma.shortTermMemory.update({
      where: { id: memory.id },
      data: { reminded: true },
    });

    return msg;
  }

  /** 장기 기억을 메시지에 자연스럽게 삽입 */
  async enrichMessage(userCharacterId: string, baseMessage: string): Promise<string> {
    const memories = await prisma.longTermMemory.findMany({
      where: { userCharacterId },
      orderBy: { confidence: 'desc' },
      take: 3,
    });

    if (memories.length === 0 || Math.random() > 0.35) return baseMessage;

    const mem = memories[Math.floor(Math.random() * memories.length)];
    const inserts: Record<string, string> = {
      PREFERENCE: `너 ${mem.value} 좋아하잖아~ `,
      FOOD: `맛있는 거 먹고 싶다 `,
      DISLIKE: ``,
      JOB: `일 힘들지? `,
      BIRTHDAY: `생일 얼마 안 남았지? `,
    };

    const prefix = inserts[mem.category] ?? '';
    if (!prefix) return baseMessage;
    return `${prefix}${baseMessage}`;
  }

  /** 만료된 단기 기억 정리 */
  async purgeExpired(): Promise<number> {
    const result = await prisma.shortTermMemory.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

export const memoryReminderEngine = new MemoryReminderEngine();
