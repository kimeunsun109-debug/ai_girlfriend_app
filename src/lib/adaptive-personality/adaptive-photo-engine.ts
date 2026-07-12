import type { PersonalityTrait } from '@prisma/client';

export class AdaptivePhotoEngine {
  adjustCategoryWeight(
    base: Record<string, number>,
    dnaMap: Partial<Record<PersonalityTrait, number>>,
    preferences: Array<{ preferenceKey: string; likesScore: number }>
  ): Record<string, number> {
    const out = { ...base };

    const expressiveness = dnaMap.EXPRESSIVENESS ?? 50;
    const playful = dnaMap.PLAYFULNESS ?? 50;
    const romantic = dnaMap.ROMANTIC ?? 50;

    if (expressiveness > 60) out.selfie = (out.selfie ?? 0) + 0.2;
    if (playful > 65) out.weekend = (out.weekend ?? 0) + 0.15;
    if (romantic > 65) out.rain = (out.rain ?? 0) + 0.1;

    for (const p of preferences) {
      if (p.likesScore <= 0) continue;
      if (p.preferenceKey.includes('selfie')) out.selfie = (out.selfie ?? 0) + 0.2;
      if (p.preferenceKey.includes('cafe')) out.coffee = (out.coffee ?? 0) + 0.2;
      if (p.preferenceKey.includes('food')) out.tteokbokki = (out.tteokbokki ?? 0) + 0.15;
    }

    return out;
  }
}

export const adaptivePhotoEngine = new AdaptivePhotoEngine();
