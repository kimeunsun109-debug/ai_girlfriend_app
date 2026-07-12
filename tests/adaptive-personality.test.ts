import { describe, it, expect } from 'vitest';
import { TRAIT_LABELS, CORE_PERSONALITY_BASELINES, ADAPTIVE_RULES } from '../src/config/adaptive-personality.config.js';
import { adaptiveDialogueEngine } from '../src/lib/adaptive-personality/adaptive-dialogue-engine.js';
import { adaptiveEmotionEngine } from '../src/lib/adaptive-personality/adaptive-emotion-engine.js';
import { adaptivePushEngine } from '../src/lib/adaptive-personality/adaptive-push-engine.js';
import { adaptivePhotoEngine } from '../src/lib/adaptive-personality/adaptive-photo-engine.js';

describe('adaptive personality config', () => {
  it('has 20 DNA traits labels', () => {
    expect(Object.keys(TRAIT_LABELS)).toHaveLength(20);
  });

  it('has yuna baseline preserving core personality', () => {
    const yuna = CORE_PERSONALITY_BASELINES.yuna;
    expect((yuna.CARE ?? 0)).toBeGreaterThan(70);
    expect((yuna.SHYNESS ?? 0)).toBeGreaterThan(50);
  });

  it('includes required adaptive rules', () => {
    expect(ADAPTIVE_RULES.compliment.CONFIDENCE).toBeDefined();
    expect(ADAPTIVE_RULES.playful_user.PLAYFULNESS).toBeDefined();
    expect(ADAPTIVE_RULES.late_reply.JEALOUSY).toBeDefined();
  });
});

describe('adaptive dialogue engine', () => {
  it('styles message with high expressive DNA', () => {
    const out = adaptiveDialogueEngine.styleMessage('오늘 뭐해', { EXPRESSIVENESS: 90, AEGYO: 80, HUMOR: 80 }, '은선');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('adaptive emotion engine', () => {
  it('returns sad on late reply with high jealousy', () => {
    const e = adaptiveEmotionEngine.adjustEmotion('happy', { JEALOUSY: 80 }, { lateReply: true });
    expect(e).toBe('sad');
  });
});

describe('adaptive push engine', () => {
  it('gives bonus when attachment high', () => {
    const b = adaptivePushEngine.contactProbabilityBonus({ ATTACHMENT: 80, CONFIDENCE: 70, PLAYFULNESS: 75 });
    expect(b).toBeGreaterThan(0);
  });
});

describe('adaptive photo engine', () => {
  it('raises selfie weight by dna and preference', () => {
    const adjusted = adaptivePhotoEngine.adjustCategoryWeight(
      { selfie: 0.2, coffee: 0.2 },
      { EXPRESSIVENESS: 80 },
      [{ preferenceKey: 'selfie_photo', likesScore: 2 }]
    );
    expect((adjusted.selfie ?? 0)).toBeGreaterThan(0.2);
  });
});
