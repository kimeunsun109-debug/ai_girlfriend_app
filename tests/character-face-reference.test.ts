import { describe, it, expect } from 'vitest';
import { join, resolve } from 'path';
import { normalizePhotoLibraryRoot } from '../src/config/photo-universe.config.js';
import { libraryRelativePath } from '../src/lib/photo-universe/paths.js';
import {
  CHARACTER_FACE_IDENTITIES,
  CHARACTER_SLUGS,
  buildCharacterMjCommand,
  getCharacterFaceIdentity,
} from '../src/config/character-face-reference.config.js';

describe('photo-universe path normalization', () => {
  it('maps Windows drive path under cwd on non-Windows', () => {
    if (process.platform === 'win32') return;
    const normalized = normalizePhotoLibraryRoot('D:/PickMeTalk_PhotoLibrary');
    expect(normalized).toBe(resolve(process.cwd(), 'D:/PickMeTalk_PhotoLibrary'));
  });

  it('libraryRelativePath returns correct relative path on Linux D: root', () => {
    if (process.platform === 'win32') return;
    const libRoot = normalizePhotoLibraryRoot('D:/PickMeTalk_PhotoLibrary');
    const absolutePath = join(libRoot, 'yuna', 'cafe', 'abc123.jpg');
    const rel = libraryRelativePath(absolutePath);
    expect(rel).toBe('yuna/cafe/abc123.jpg');
    expect(rel).not.toMatch(/^g\//);
  });

  it('libraryRelativePath handles nested character folders', () => {
    const libRoot = normalizePhotoLibraryRoot('D:/PickMeTalk_PhotoLibrary');
    const absolutePath = join(libRoot, 'narin', 'mirror', 'hash.webp');
    const rel = libraryRelativePath(absolutePath);
    expect(rel).toBe('narin/mirror/hash.webp');
  });
});

describe('character-face-reference.config', () => {
  it('defines all 5 character identities', () => {
    expect(CHARACTER_SLUGS).toHaveLength(5);
    for (const slug of CHARACTER_SLUGS) {
      const identity = CHARACTER_FACE_IDENTITIES[slug];
      expect(identity).toBeDefined();
      expect(identity!.identityPrompt).toContain('SAME PERSON');
      expect(identity!.identityNegative).toContain('different person');
    }
  });

  it('yuna identity includes puppy-like face', () => {
    const yuna = getCharacterFaceIdentity('yuna')!;
    expect(yuna.identityPrompt).toContain('강아지상');
    expect(yuna.name).toBe('유나');
  });

  it('narin identity includes cat-like features', () => {
    const narin = getCharacterFaceIdentity('narin')!;
    expect(narin.identityPrompt).toContain('고양이상');
    expect(narin.name).toBe('나린');
  });

  it('buildCharacterMjCommand includes identity lock and MJ suffix', () => {
    const cmd = buildCharacterMjCommand('yunseo', 'cafe window seat, rainy day', 'studio lighting');
    expect(cmd).toContain('/imagine prompt:');
    expect(cmd).toContain('SAME PERSON');
    expect(cmd).toContain('윤서');
    expect(cmd).toContain('--style raw');
    expect(cmd).toContain('--no');
  });
});
