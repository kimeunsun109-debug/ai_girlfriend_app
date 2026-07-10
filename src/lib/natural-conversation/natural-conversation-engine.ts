/**
 * NaturalConversationEngine — 사람처럼 말하기
 * 모든 캐릭터 아웃바운드 메시지의 최종 정제 파이프라인
 */
import {
  ALLOWED_EMOJIS,
  BANNED_AI_PHRASES,
  CHARACTER_SPEECH_HINTS,
  INTENT_KEYWORDS,
  INTENT_REACTIONS,
  MAX_EMOJIS_PER_MESSAGE,
  MAX_MESSAGE_LENGTH,
  MAX_SENTENCES,
} from '../../config/natural-conversation.config.js';
import { randomPick } from '../../utils/push.utils.js';

export interface ConversationContext {
  userName?: string;
  characterSlug?: string;
  stageLevel?: number;
  useName?: boolean;
}

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const SENTENCE_SPLIT = /(?<=[.!?…~])\s+|\n+/u;

export class NaturalConversationEngine {
  /** AI 금지 표현 포함 여부 */
  containsBannedPhrase(text: string): boolean {
    const lower = text.toLowerCase();
    return BANNED_AI_PHRASES.some((p) => lower.includes(p.toLowerCase()));
  }

  /** AI 금지 표현이 포함된 문장 제거 */
  stripBannedPhrases(text: string): string {
    const sentences = this.splitSentences(text);
    const filtered = sentences.filter((s) => !this.containsBannedPhrase(s));
    if (filtered.length === 0) {
      return randomPick(['헐', '진짜?', 'ㅋㅋ', '그래?']);
    }
    return filtered.join(' ');
  }

  /** 1~3문장으로 제한 */
  limitSentences(text: string, max = MAX_SENTENCES): string {
    const sentences = this.splitSentences(text);
    return sentences.slice(0, max).join(' ');
  }

  /** 허용 이모지만 유지, 개수 제한 */
  limitEmojis(text: string, max = MAX_EMOJIS_PER_MESSAGE): string {
    const matches = text.match(EMOJI_REGEX) ?? [];
    if (matches.length === 0) return text;

    let count = 0;
    return text.replace(EMOJI_REGEX, (emoji) => {
      const allowed = (ALLOWED_EMOJIS as readonly string[]).includes(emoji);
      if (!allowed) return '';
      if (count >= max) return '';
      count++;
      return emoji;
    }).replace(/\s{2,}/g, ' ').trim();
  }

  /** 질문 남발 방지 — 문장이 2개 이상이면 마지막 질문만 유지 */
  reduceQuestionSpam(text: string): string {
    const sentences = this.splitSentences(text);
    if (sentences.length <= 1) return text;

    const questions = sentences.filter((s) => s.trim().endsWith('?'));
    if (questions.length <= 1) return text;

    const nonQuestions = sentences.filter((s) => !s.trim().endsWith('?'));
    const lastQuestion = questions[questions.length - 1];
    return [...nonQuestions, lastQuestion].join(' ');
  }

  /** 아웃바운드 메시지 최종 정제 (모든 캐릭터 메시지에 적용) */
  polishOutbound(message: string, ctx: ConversationContext = {}): string {
    if (!message?.trim()) return 'ㅋㅋ';

    let result = message.trim();
    result = this.stripBannedPhrases(result);
    result = this.limitSentences(result);
    result = this.reduceQuestionSpam(result);
    result = this.limitEmojis(result);
    result = this.applyCharacterHint(result, ctx.characterSlug);
    result = result.slice(0, MAX_MESSAGE_LENGTH).trim();

    if (!result) return 'ㅋㅋ';
    return result;
  }

  /** 사용자 메시지 의도 감지 */
  detectIntent(userContent: string): string | null {
    const lower = userContent.toLowerCase();
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some((k) => lower.includes(k))) return intent;
    }
    return null;
  }

  /** 사용자 메시지에 대한 자연스러운 반응 생성 (설명·분석 X) */
  reactToUserMessage(userContent: string, ctx: ConversationContext = {}): string {
    const intent = this.detectIntent(userContent);
    const pool = intent ? INTENT_REACTIONS[intent] : null;

    let reaction = pool
      ? randomPick(pool)
      : randomPick(['그래?', '헐', '진짜?', 'ㅋㅋ', '오 그래?']);

    if (ctx.useName && ctx.userName && Math.random() < 0.3 && !reaction.includes(ctx.userName)) {
      reaction = `${ctx.userName} ${reaction}`;
    }

    return this.polishOutbound(reaction, ctx);
  }

  private splitSentences(text: string): string[] {
    return text
      .split(SENTENCE_SPLIT)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private applyCharacterHint(message: string, slug?: string): string {
    if (!slug) return message;
    const hints = CHARACTER_SPEECH_HINTS[slug];
    if (!hints) return message;

    if (hints.prefix && Math.random() < 0.15) {
      const prefix = randomPick(hints.prefix);
      if (!message.startsWith(prefix.trim())) {
        message = `${prefix}${message}`;
      }
    }
    return message;
  }
}

export const naturalConversationEngine = new NaturalConversationEngine();

/** 모든 캐릭터 아웃바운드 메시지 파이프라인 종착점 */
export function polishCharacterMessage(
  message: string,
  ctx: ConversationContext = {}
): string {
  return naturalConversationEngine.polishOutbound(message, ctx);
}
