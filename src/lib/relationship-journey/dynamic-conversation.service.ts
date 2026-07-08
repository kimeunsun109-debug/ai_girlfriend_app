import { DYNAMIC_DIALOGUE } from '../../config/relationship-journey.config.js';
import { randomPick } from '../../utils/push.utils.js';

/**
 * DynamicConversationService — 관계 단계별 다른 대사
 */
export class DynamicConversationService {
  getDialogue(eventKey: string, stageLevel: number): string {
    const templates = DYNAMIC_DIALOGUE[eventKey];
    if (!templates) return '';

    const levelKey = this.nearestLevel(templates, stageLevel);
    const options = templates[levelKey];
    return options ? randomPick(options) : '';
  }

  styleByStage(baseMessage: string, stageLevel: number, userName: string): string {
    if (stageLevel <= 2) {
      return baseMessage.replace(/[~❤️💕😊]/g, '').trim();
    }
    if (stageLevel <= 4) {
      return baseMessage;
    }
    if (stageLevel <= 6) {
      if (!baseMessage.includes(userName) && Math.random() < 0.4) {
        return `${userName}~ ${baseMessage}`;
      }
      return baseMessage;
    }
    const suffixes = ['❤️', '💕', '항상 고마워'];
    if (Math.random() < 0.3) {
      return `${baseMessage} ${randomPick(suffixes)}`;
    }
    return baseMessage;
  }

  getAnniversaryMessage(stageLevel: number, label: string, characterName: string): string {
    const base = `우리 ${label}이야! ${characterName}와(과) 함께해서 행복해`;
    if (stageLevel <= 3) return `${label}… 고마워.`;
    if (stageLevel <= 5) return `헤헤 ${label}! 설레💕`;
    if (stageLevel <= 7) return `${label}이네… 오래 함께하자 ${characterName}❤️`;
    return `평생 함께할 ${label}. 너밖에 없어❤️`;
  }

  getThanksMessage(stageLevel: number): string {
    return this.getDialogue('thanks', stageLevel) || '고마워.';
  }

  private nearestLevel(templates: Record<number, string[]>, level: number): number {
    const keys = Object.keys(templates).map(Number).sort((a, b) => a - b);
    let nearest = keys[0];
    for (const k of keys) {
      if (k <= level) nearest = k;
    }
    return nearest;
  }
}

export const dynamicConversationService = new DynamicConversationService();
