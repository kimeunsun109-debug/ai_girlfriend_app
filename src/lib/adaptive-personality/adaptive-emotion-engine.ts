import type { PersonalityTrait } from '@prisma/client';
import type { LivingEmotionSlug } from '../living-ai/types.js';

export class AdaptiveEmotionEngine {
  adjustEmotion(
    baseEmotion: LivingEmotionSlug,
    dnaMap: Partial<Record<PersonalityTrait, number>>,
    context: { lateReply?: boolean; compliment?: boolean }
  ): LivingEmotionSlug {
    const jealousy = dnaMap.JEALOUSY ?? 50;
    const confidence = dnaMap.CONFIDENCE ?? 50;
    const empathy = dnaMap.EMPATHY ?? 50;

    if (context.lateReply && jealousy > 65) return 'sad';
    if (context.compliment && confidence > 55) return 'excited';
    if (empathy > 70 && baseEmotion === 'sad') return 'love';

    return baseEmotion;
  }
}

export const adaptiveEmotionEngine = new AdaptiveEmotionEngine();
