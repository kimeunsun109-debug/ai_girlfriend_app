import type { PersonalityTrait } from '@prisma/client';

export class AdaptivePushEngine {
  contactProbabilityBonus(dnaMap: Partial<Record<PersonalityTrait, number>>): number {
    const attachment = dnaMap.ATTACHMENT ?? 50;
    const confidence = dnaMap.CONFIDENCE ?? 50;
    const playful = dnaMap.PLAYFULNESS ?? 50;

    let bonus = 0;
    if (attachment > 65) bonus += 0.03;
    if (confidence > 60) bonus += 0.02;
    if (playful > 70) bonus += 0.01;
    return bonus;
  }

  firstContactWeight(dnaMap: Partial<Record<PersonalityTrait, number>>): number {
    const confidence = dnaMap.CONFIDENCE ?? 50;
    return confidence > 60 ? 1.15 : confidence < 40 ? 0.9 : 1.0;
  }
}

export const adaptivePushEngine = new AdaptivePushEngine();
