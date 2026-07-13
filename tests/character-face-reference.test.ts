import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  TEST_LIBRARY_ROOT,
  TEST_IMPORT_WATCH_FOLDER,
  resolvePhotoLibraryRoot,
  resolveImportWatchFolder,
  detectRuntime,
  isWindowsDrivePath,
} from '../src/config/runtime-environment.config.js';
import {
  CHARACTER_FACE_IDENTITIES,
  CHARACTER_SLUGS,
  buildCharacterMjCommand,
  getCharacterFaceIdentity,
} from '../src/config/character-face-reference.config.js';

describe('runtime-environment.config', () => {
  const origRuntime = process.env.PICKMETALK_RUNTIME;
  const origLibrary = process.env.PHOTO_LIBRARY_ROOT;

  afterEach(() => {
    if (origRuntime === undefined) delete process.env.PICKMETALK_RUNTIME;
    else process.env.PICKMETALK_RUNTIME = origRuntime;
    if (origLibrary === undefined) delete process.env.PHOTO_LIBRARY_ROOT;
    else process.env.PHOTO_LIBRARY_ROOT = origLibrary;
  });

  it('test runtime uses test-fixtures, not D: drive', () => {
    process.env.PICKMETALK_RUNTIME = 'test';
    delete process.env.PHOTO_LIBRARY_ROOT;
    expect(resolvePhotoLibraryRoot()).toBe(TEST_LIBRARY_ROOT);
    expect(resolvePhotoLibraryRoot()).not.toContain('/D:/');
    expect(resolveImportWatchFolder()).toBe(TEST_IMPORT_WATCH_FOLDER);
  });

  it('ignores Windows drive path env on Linux test runtime', () => {
    if (process.platform === 'win32') return;
    process.env.PICKMETALK_RUNTIME = 'test';
    process.env.PHOTO_LIBRARY_ROOT = 'D:/PickMeTalk_PhotoLibrary';
    expect(resolvePhotoLibraryRoot()).toBe(TEST_LIBRARY_ROOT);
  });

  it('detects production vs test runtime', () => {
    process.env.PICKMETALK_RUNTIME = 'production';
    expect(detectRuntime()).toBe('production');
    process.env.PICKMETALK_RUNTIME = 'test';
    expect(detectRuntime()).toBe('test');
  });

  it('identifies Windows drive paths', () => {
    expect(isWindowsDrivePath('D:/PickMeTalk_PhotoLibrary')).toBe(true);
    expect(isWindowsDrivePath('D:\\PickMeTalk_PhotoLibrary')).toBe(true);
    expect(isWindowsDrivePath('/tmp/photo-library')).toBe(false);
  });
});

describe('photo-universe paths (test runtime)', () => {
  it('libraryRelativePath returns correct path under test-fixtures', async () => {
    const { TEST_LIBRARY_ROOT: libRoot } = await import(
      '../src/config/runtime-environment.config.js'
    );
    const { libraryRelativePath: relPath } = await import('../src/lib/photo-universe/paths.js');
    const absolutePath = join(libRoot, 'yuna', 'cafe', 'abc123.jpg');
    const rel = relPath(absolutePath);
    expect(rel).toBe('yuna/cafe/abc123.jpg');
    expect(rel).not.toMatch(/^g\//);
    expect(rel).not.toContain('/D:/');
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
