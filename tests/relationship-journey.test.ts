import { describe, it, expect } from 'vitest';
import { relationshipJourneyService } from '../src/lib/relationship-journey/relationship-journey.service.js';
import { dynamicConversationService } from '../src/lib/relationship-journey/dynamic-conversation.service.js';
import { RELATIONSHIP_STAGES, ANNIVERSARY_MILESTONES } from '../src/config/relationship-journey.config.js';

describe('Relationship Journey', () => {
  it('defines 8 relationship stages', () => {
    expect(RELATIONSHIP_STAGES).toHaveLength(8);
    expect(RELATIONSHIP_STAGES[0].nameKo).toBe('처음 만남');
    expect(RELATIONSHIP_STAGES[7].nameKo).toBe('평생 함께');
  });

  it('maps affection to correct stage', () => {
    const stage = relationshipJourneyService.getStageByAffection(55);
    expect(stage.level).toBe(5);
    expect(stage.nameKo).toBe('썸');
  });

  it('maps low affection to stage 1', () => {
    const stage = relationshipJourneyService.getStageByAffection(5);
    expect(stage.level).toBe(1);
  });

  it('maps high affection to stage 8', () => {
    const stage = relationshipJourneyService.getStageByAffection(95);
    expect(stage.level).toBe(8);
  });

  it('has anniversary milestones including 100 and 365 days', () => {
    const days = ANNIVERSARY_MILESTONES.map((m) => m.dayCount);
    expect(days).toContain(100);
    expect(days).toContain(365);
    expect(days).toContain(1000);
  });

  it('stage rewards unlock progressively', () => {
    expect(RELATIONSHIP_STAGES[1].rewards).toContain('selfie');
    expect(RELATIONSHIP_STAGES[4].rewards).toContain('jealousy');
    expect(RELATIONSHIP_STAGES[7].rewards).toContain('special_event');
  });
});

describe('Dynamic Conversation', () => {
  it('varies thanks by stage level', () => {
    const lv1 = dynamicConversationService.getThanksMessage(1);
    const lv8 = dynamicConversationService.getThanksMessage(8);
    expect(lv1).not.toBe(lv8);
    expect(lv8).toContain('❤️');
  });

  it('styles message for high stage with affection', () => {
    const styled = dynamicConversationService.styleByStage('고마워', 8, '은선');
    expect(styled.length).toBeGreaterThan(0);
  });

  it('generates anniversary message by stage', () => {
    const msg = dynamicConversationService.getAnniversaryMessage(6, '100일', '유나');
    expect(msg).toContain('100일');
  });
});

describe('Album category mapping', () => {
  it('maps category slugs to album types', async () => {
    const { ALBUM_CATEGORY_MAP } = await import('../src/config/relationship-journey.config.js');
    expect(ALBUM_CATEGORY_MAP.selfie).toBe('SELFIE');
    expect(ALBUM_CATEGORY_MAP.coffee).toBe('CAFE');
    expect(ALBUM_CATEGORY_MAP.rain).toBe('RAIN');
  });
});

describe('Timeline emoji config', () => {
  it('has emojis for key events', async () => {
    const { TIMELINE_EMOJI } = await import('../src/config/relationship-journey.config.js');
    expect(TIMELINE_EMOJI.FIRST_MEET).toBe('😊');
    expect(TIMELINE_EMOJI.FIRST_PHOTO).toBe('📷');
    expect(TIMELINE_EMOJI.MEMORY_REPLAY).toBe('🕰️');
  });
});
