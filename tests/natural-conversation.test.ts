import { describe, it, expect } from 'vitest';
import { naturalConversationEngine, polishCharacterMessage } from '../src/lib/natural-conversation/index.js';

describe('Natural Conversation Engine', () => {
  it('strips banned AI phrases', () => {
    const result = polishCharacterMessage('이해합니다. 오늘 힘들었지?');
    expect(result).not.toContain('이해합니다');
    expect(result.length).toBeGreaterThan(0);
  });

  it('limits to max 3 sentences', () => {
    const long = '첫번째. 두번째. 세번째. 네번째. 다섯번째.';
    const result = polishCharacterMessage(long);
    const sentences = result.split(/[.!?]/).filter((s) => s.trim());
    expect(sentences.length).toBeLessThanOrEqual(3);
  });

  it('reacts to tired message with emotion-first response', () => {
    const reaction = naturalConversationEngine.reactToUserMessage('오늘 너무 피곤해', {
      characterSlug: 'yuna',
    });
    expect(reaction).not.toContain('이해합니다');
    expect(reaction).not.toContain('도움이');
    expect(naturalConversationEngine.detectIntent('오늘 너무 피곤해')).toBe('tired');
  });

  it('reacts to food message naturally', () => {
    const reaction = naturalConversationEngine.reactToUserMessage('나 방금 치킨 시켰다', {
      characterSlug: 'jiyu',
    });
    expect(reaction).toMatch(/먹|맛|헐|ㅋㅋ|대박/i);
    expect(naturalConversationEngine.detectIntent('나 방금 치킨 시켰다')).toBe('food');
  });

  it('reacts to commute done message', () => {
    const reaction = naturalConversationEngine.reactToUserMessage('퇴근했다', {});
    expect(reaction).not.toContain('수고');
    expect(naturalConversationEngine.detectIntent('퇴근했다')).toBe('commute_done');
  });

  it('keeps messages short', () => {
    const result = polishCharacterMessage(
      '오늘 하루 종일 회의가 있었고 정말 힘들었어요. 그럴 수도 있겠네요. 도움이 되었으면 좋겠습니다. 내일은 좀 쉬세요.'
    );
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result).not.toMatch(/그럴 수도|도움이 되었|좋겠습니다/);
  });
});
