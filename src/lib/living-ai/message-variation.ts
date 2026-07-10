import { LIVING_AI_CONFIG } from '../../config/living-ai.config.js';
import { polishCharacterMessage } from '../natural-conversation/index.js';

const RECENT_EMOJIS: string[] = [];
const RECENT_OPENERS: string[] = [];
const MAX_HISTORY = 20;

const OPENER_POOL = [
  '있잖아', '그거 알아', '아 맞다', '흠', '음~', '야', '있지',
  '오늘', '방금', '지금', '아까', '헤헤', 'ㅋㅋ',
];

const EMOJI_POOL = ['😊', '😏', '💕', '😴', '🥺', '😤', '🍢', '☕', '💅', '🌧️', '📸', '❤️'];

/**
 * 자연스러운 대화 — 반복 방지, 다양한 말투
 */
export class MessageVariation {
  avoidGreeting(message: string): string {
    const banned = ['안녕하세요', '안녕하십니까', '반갑습니다', 'Hello'];
    for (const b of banned) {
      if (message.startsWith(b)) {
        return message.replace(b, randomPickNonRecent(OPENER_POOL, RECENT_OPENERS));
      }
    }
    return message;
  }

  diversifyEmoji(message: string): string {
    const emojiMatch = message.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
    if (!emojiMatch) {
      if (Math.random() < 0.4) {
        const emoji = randomPickNonRecent(EMOJI_POOL, RECENT_EMOJIS);
        return `${message} ${emoji}`;
      }
      return message;
    }

    const used = emojiMatch[0];
    if (RECENT_EMOJIS.includes(used)) {
      const replacement = randomPickNonRecent(EMOJI_POOL, RECENT_EMOJIS);
      message = message.replace(used, replacement);
      trackRecent(RECENT_EMOJIS, replacement);
    } else {
      trackRecent(RECENT_EMOJIS, used);
    }
    return message;
  }

  finalize(message: string, userName: string, useName: boolean, characterSlug?: string): string {
    let result = this.avoidGreeting(message);
    result = this.diversifyEmoji(result);

    if (useName && !result.includes(userName) && Math.random() < 0.3) {
      result = `${userName}~ ${result}`;
    }

    return polishCharacterMessage(result, { userName, useName, characterSlug });
  }
}

function randomPickNonRecent(pool: string[], recent: string[]): string {
  const available = pool.filter((p) => !recent.includes(p));
  const pick = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : pool[Math.floor(Math.random() * pool.length)];
  trackRecent(recent, pick);
  return pick;
}

function trackRecent(list: string[], item: string): void {
  list.push(item);
  if (list.length > MAX_HISTORY) list.shift();
}

export const messageVariation = new MessageVariation();
