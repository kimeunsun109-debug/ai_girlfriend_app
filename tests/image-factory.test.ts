import { describe, it, expect } from 'vitest';
import { characterImageFactory } from '../src/lib/photo-catalog/image-factory.js';
import { CHARACTER_SPECS } from '../src/data/character-specs.js';

describe('Character Image Factory', () => {
  it('lists all 5 characters with DNA', () => {
    const list = characterImageFactory.listCharacters();
    expect(list).toHaveLength(5);
    expect(list.map((c) => c.slug).sort()).toEqual(
      ['eunha', 'jiyu', 'narin', 'yuna', 'yunseo'].sort()
    );
    for (const spec of CHARACTER_SPECS) {
      const found = list.find((c) => c.slug === spec.slug);
      expect(found?.characterDNA).toBe(spec.characterDNA);
    }
  });

  it('generates prompt with identity lock for yuna', () => {
    const result = characterImageFactory.generate('yuna', { seed: 42 });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('yuna');
    expect(result!.characterDNA).toBe('편안한 생활여친');
    expect(result!.prompt).toContain('SAME PERSON ALWAYS');
    expect(result!.prompt).toContain('유나');
    expect(result!.prompt).toContain('iPhone 16 Pro');
    expect(result!.negativePrompt).toContain('plastic skin');
    expect(result!.scenario.time).toBeTruthy();
    expect(result!.scenario.location).toBeTruthy();
  });

  it('is deterministic with same seed', () => {
    const a = characterImageFactory.generate('narin', { seed: 100 });
    const b = characterImageFactory.generate('narin', { seed: 100 });
    expect(a!.scenario).toEqual(b!.scenario);
    expect(a!.prompt).toBe(b!.prompt);
  });

  it('generates different scenarios with different seeds', () => {
    const a = characterImageFactory.generate('eunha', { seed: 1 });
    const b = characterImageFactory.generate('eunha', { seed: 2 });
    expect(a!.scenario).not.toEqual(b!.scenario);
  });

  it('maps category slug to scene override', () => {
    const override = characterImageFactory.scenarioFromCategory('hair', 'shy');
    expect(override.location).toContain('hair salon');
    expect(override.camera).toBe('mirror selfie');
  });

  it('generateBatch returns requested count', () => {
    const batch = characterImageFactory.generateBatch('jiyu', 3, { seed: 7 });
    expect(batch).toHaveLength(3);
    expect(new Set(batch.map((b) => b.seed)).size).toBe(3);
  });

  it('returns null for unknown character', () => {
    expect(characterImageFactory.generate('unknown')).toBeNull();
  });
});
