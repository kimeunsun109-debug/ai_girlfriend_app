import type { PersonalityTrait } from '@prisma/client';
import { TRAIT_LABELS } from '../../config/adaptive-personality.config.js';

export class AdaptiveDialogueEngine {
  styleMessage(
    baseMessage: string,
    dnaMap: Partial<Record<PersonalityTrait, number>>,
    userName: string
  ): string {
    let message = baseMessage;

    const aegyo = dnaMap.AEGYO ?? 50;
    const humor = dnaMap.HUMOR ?? 50;
    const expressiveness = dnaMap.EXPRESSIVENESS ?? 50;
    const jealousy = dnaMap.JEALOUSY ?? 50;
    const attachment = dnaMap.ATTACHMENT ?? 50;

    if (aegyo > 60 && Math.random() < 0.35) message = `${message} 헤헤`;
    if (humor > 65 && Math.random() < 0.4) message = `ㅋㅋ ${message}`;
    if (expressiveness > 70 && Math.random() < 0.3) message = `${userName}~ ${message}`;
    if (attachment > 70 && Math.random() < 0.2) message = `${message} 보고 싶었어`;
    if (jealousy > 65 && Math.random() < 0.1) message = `${message} ...나만 봐줘`;

    return message.slice(0, 160);
  }

  reflectionLine(
    traitKey: PersonalityTrait,
    previous: number,
    current: number
  ): string {
    const dir = current > previous ? '늘었어' : '줄었어';
    return `예전보다 ${TRAIT_LABELS[traitKey]}이(가) ${dir}.`; 
  }
}

export const adaptiveDialogueEngine = new AdaptiveDialogueEngine();
