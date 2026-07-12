import { PrismaClient } from '@prisma/client';
import { dnaEvolutionEngine } from './dna-evolution-engine.js';

const prisma = new PrismaClient();

export class HabitLearningEngine {
  async learn(userCharacterId: string, signal: string, value = '1'): Promise<void> {
    const habit = await prisma.habitLearning.upsert({
      where: { userCharacterId_habitKey: { userCharacterId, habitKey: signal } },
      create: { userCharacterId, habitKey: signal, value, score: 1, occurrences: 1, lastSeenAt: new Date() },
      update: { occurrences: { increment: 1 }, score: { increment: 0.5 }, value, lastSeenAt: new Date() },
    });

    const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId }, include: { character: true } });
    if (!uc) return;

    if (signal.includes('login_22')) {
      await dnaEvolutionEngine.applyRule(userCharacterId, uc.character.slug ?? 'yuna', 'daily_login', '매일 비슷한 시간 접속');
    }
    if (signal.includes('coffee')) {
      await dnaEvolutionEngine.applyRule(userCharacterId, uc.character.slug ?? 'yuna', 'coffee_user', '커피 습관 학습');
    }
    if (signal.includes('workout')) {
      await dnaEvolutionEngine.applyRule(userCharacterId, uc.character.slug ?? 'yuna', 'workout_user', '운동 습관 학습');
    }
  }

  async getHabits(userCharacterId: string) {
    return prisma.habitLearning.findMany({ where: { userCharacterId }, orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }] });
  }
}

export const habitLearningEngine = new HabitLearningEngine();
