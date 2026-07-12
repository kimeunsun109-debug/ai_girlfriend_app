import { describe, it, expect } from 'vitest';
import { classifyFromPath, prismaCategoryToSlug } from '../src/lib/photo-catalog/category-mapper.js';
import { PhotoCategory } from '@prisma/client';
import { resolveCharacterSlug, SUPPORTED_EXTENSIONS } from '../src/lib/photo-catalog/types.js';
import { photoCatalogRepository } from '../src/lib/photo-catalog/photo-repository.js';
import type { CharacterPhotoIndex } from '../src/lib/photo-catalog/types.js';

describe('category-mapper', () => {
  it('classifies hair from path', () => {
    const r = classifyFromPath('yuna/hair/salon_01.jpg');
    expect(r.categorySlug).toBe('hair');
    expect(r.prismaCategory).toBe(PhotoCategory.HAIR_SALON);
  });

  it('classifies coffee from filename', () => {
    const r = classifyFromPath('narin/coffee_morning.jpg');
    expect(r.categorySlug).toBe('coffee');
  });

  it('classifies tteok from keyword', () => {
    const r = classifyFromPath('eunha/food_tteokbokki_night.jpg');
    expect(r.categorySlug).toBe('tteokbokki');
  });

  it('detects sad emotion', () => {
    const r = classifyFromPath('narin/sad_pouty.jpg');
    expect(r.emotion).toBe('sad');
  });

  it('maps prisma category to slug', () => {
    expect(prismaCategoryToSlug(PhotoCategory.HAIR_SALON)).toBe('hair');
  });
});

describe('character resolver', () => {
  it('resolves Korean names', () => {
    expect(resolveCharacterSlug('유나')).toBe('yuna');
    expect(resolveCharacterSlug('나린')).toBe('narin');
  });

  it('resolves english slugs', () => {
    expect(resolveCharacterSlug('jiyu')).toBe('jiyu');
  });
});

describe('photo catalog selection', () => {
  const mockIndex: CharacterPhotoIndex = {
    character: 'yuna',
    characterId: '00000000-0000-0000-0000-000000000001',
    updatedAt: new Date().toISOString(),
    totalCount: 3,
    photos: [
      {
        id: '1',
        character: 'yuna',
        category: 'hair',
        emotion: 'shy',
        tags: ['머리'],
        filename: 'a.jpg',
        relativePath: 'yuna/hair/a.jpg',
        contentHash: 'hash1',
        importedAt: new Date().toISOString(),
      },
      {
        id: '2',
        character: 'yuna',
        category: 'hair',
        emotion: 'happy',
        tags: ['머리'],
        filename: 'b.jpg',
        relativePath: 'yuna/hair/b.jpg',
        contentHash: 'hash2',
        importedAt: new Date().toISOString(),
      },
      {
        id: '3',
        character: 'yuna',
        category: 'coffee',
        emotion: 'happy',
        tags: ['커피'],
        filename: 'c.jpg',
        relativePath: 'yuna/coffee/c.jpg',
        contentHash: 'hash3',
        importedAt: new Date().toISOString(),
      },
    ],
  };

  it('selects by character + category + emotion', () => {
    photoCatalogRepository.clearCache();
    photoCatalogRepository.registerIndex(mockIndex);

    const result = photoCatalogRepository.selectPhoto({
      characterSlug: 'yuna',
      categorySlug: 'hair',
      emotion: 'shy',
    });
    expect(result?.id).toBe('1');
  });

  it('falls back to category without emotion match', () => {
    photoCatalogRepository.clearCache();
    photoCatalogRepository.registerIndex(mockIndex);

    const result = photoCatalogRepository.selectPhoto({
      characterSlug: 'yuna',
      categorySlug: 'hair',
      emotion: 'sad',
    });
    expect(result?.category).toBe('hair');
  });
});

describe('supported extensions', () => {
  it('includes webp', () => {
    expect(SUPPORTED_EXTENSIONS.has('.webp')).toBe(true);
  });
});
