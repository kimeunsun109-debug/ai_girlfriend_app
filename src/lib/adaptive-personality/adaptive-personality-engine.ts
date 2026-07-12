import { PrismaClient, PersonalityTrait } from '@prisma/client';
import { personalityDNA } from './personality-dna.js';
import { dnaEvolutionEngine } from './dna-evolution-engine.js';
import { habitLearningEngine } from './habit-learning-engine.js';
import { preferenceLearningEngine } from './preference-learning-engine.js';
import { adaptiveDialogueEngine } from './adaptive-dialogue-engine.js';
import { adaptivePhotoEngine } from './adaptive-photo-engine.js';
import { adaptiveEmotionEngine } from './adaptive-emotion-engine.js';
import { adaptivePushEngine } from './adaptive-push-engine.js';
import { growthTimeline } from './growth-timeline.js';

const prisma = new PrismaClient();

export class AdaptivePersonalityEngine {
  async ensure(userCharacterId: string): Promise<void> {
    const uc = await prisma.userCharacter.findUnique({
      where: { id: userCharacterId },
      include: { character: true },
    });
    if (!uc) return;
    await personalityDNA.ensureInitialized(userCharacterId, uc.character.slug ?? 'yuna');
  }

  async getPersonality(userCharacterId: string) {
    const uc = await prisma.userCharacter.findUnique({
      where: { id: userCharacterId },
      include: { character: true },
    });
    if (!uc) return null;

    const snapshot = await personalityDNA.getSnapshot(
      userCharacterId,
      uc.character.slug ?? 'yuna',
      uc.relationshipLevel
    );
    const habits = await habitLearningEngine.getHabits(userCharacterId);
    const preferences = await preferenceLearningEngine.getPreferences(userCharacterId);
    const growth = await growthTimeline.get(userCharacterId, 40);

    return {
      userCharacterId,
      character: uc.character.name,
      stageLevel: uc.relationshipLevel,
      affectionScore: uc.affectionScore,
      dna: snapshot.dna,
      habits,
      preferences,
      growth,
    };
  }

  async updateFromSignal(
    userCharacterId: string,
    signal: {
      type: string;
      value?: string;
      reaction?: 'like' | 'dislike' | 'neutral';
      reason?: string;
      specialEvent?: boolean;
    }
  ): Promise<void> {
    const uc = await prisma.userCharacter.findUnique({
      where: { id: userCharacterId },
      include: { character: true },
    });
    if (!uc) return;

    await this.ensure(userCharacterId);

    const slug = uc.character.slug ?? 'yuna';
    const reason = signal.reason ?? signal.type;
    let didSomething = false;

    switch (signal.type) {
      case 'compliment':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'compliment', reason, signal.specialEvent);
        didSomething = true;
        break;
      case 'photo_compliment':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'photo_compliment', reason, signal.specialEvent);
        didSomething = true;
        break;
      case 'late_reply':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'late_reply', reason);
        didSomething = true;
        break;
      case 'playful_user':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'playful_user', reason);
        didSomething = true;
        break;
      case 'comforting_user':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'comforting_user', reason, !!signal.specialEvent);
        didSomething = true;
        break;
      case 'emotional_user':
        await dnaEvolutionEngine.applyRule(userCharacterId, slug, 'emotional_user', reason);
        didSomething = true;
        break;
      case 'habit':
        await habitLearningEngine.learn(userCharacterId, signal.value ?? reason, signal.value);
        didSomething = true;
        break;
      case 'preference':
        await preferenceLearningEngine.learnReaction(userCharacterId, signal.value ?? 'general', signal.reaction ?? 'neutral');
        didSomething = true;
        break;
      default:
        break;
    }

    if (didSomething) {
      await prisma.adaptiveMemory.create({
        data: {
          userCharacterId,
          memoryType: signal.type,
          content: `네가 ${reason}해줘서 조금 변했어.`,
          trigger: reason,
        },
      });
    }
  }

  async getDnaMap(userCharacterId: string): Promise<Partial<Record<PersonalityTrait, number>>> {
    return personalityDNA.getDnaMap(userCharacterId);
  }

  applyAdaptiveDialogue(message: string, dnaMap: Partial<Record<PersonalityTrait, number>>, userName: string, characterSlug?: string): string {
    return adaptiveDialogueEngine.styleMessage(message, dnaMap, userName, characterSlug);
  }

  adjustEmotion(base: any, dnaMap: Partial<Record<PersonalityTrait, number>>, context: { lateReply?: boolean; compliment?: boolean }) {
    return adaptiveEmotionEngine.adjustEmotion(base, dnaMap, context);
  }

  adjustPhotoWeights(base: Record<string, number>, dnaMap: Partial<Record<PersonalityTrait, number>>, preferences: Array<{ preferenceKey: string; likesScore: number }>) {
    return adaptivePhotoEngine.adjustCategoryWeight(base, dnaMap, preferences);
  }

  pushBonus(dnaMap: Partial<Record<PersonalityTrait, number>>) {
    return adaptivePushEngine.contactProbabilityBonus(dnaMap);
  }
}

export const adaptivePersonalityEngine = new AdaptivePersonalityEngine();
