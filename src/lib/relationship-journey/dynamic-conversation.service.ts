import { DYNAMIC_DIALOGUE } from '../../config/relationship-journey.config.js';
import { randomPick } from '../../utils/push.utils.js';
import { polishCharacterMessage } from '../natural-conversation/index.js';

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

  styleByStage(baseMessage: string, stageLevel: number, userName: string, characterSlug?: string): string {
    let message = baseMessage;
    if (stageLevel <= 2) {
      message = baseMessage.replace(/[~❤️💕😊]/g, '').trim();
    } else if (stageLevel <= 4) {
      message = baseMessage;
    } else if (stageLevel <= 6) {
      if (!baseMessage.includes(userName) && Math.random() < 0.4) {
        message = `${userName}~ ${baseMessage}`;
      }
    } else {
      const suffixes = ['❤️', '💕', '항상 고마워'];
      if (Math.random() < 0.3) {
        message = `${baseMessage} ${randomPick(suffixes)}`;
      }
    }
    return polishCharacterMessage(message, { userName, stageLevel, characterSlug });
  }

  getAnniversaryMessage(stageLevel: number, label: string, characterName: string): string {
    let msg: string;
    if (stageLevel <= 3) msg = `${label}… 고마워.`;
    else if (stageLevel <= 5) msg = `헤헤 ${label}! 설레💕`;
    else if (stageLevel <= 7) msg = `${label}이네… 오래 함께하자 ${characterName}❤️`;
    else msg = `평생 함께할 ${label}. 너밖에 없어❤️`;
    return polishCharacterMessage(msg, { stageLevel });
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
