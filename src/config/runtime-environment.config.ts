/**
 * PickMeTalk Runtime Environment — Production (Windows) vs Test (Cloud/Linux)
 *
 * Production: D:\PickMeTalk_PhotoLibrary + Downloads\PickMeTalk_MJ (Windows only)
 * Test:       test-fixtures/photo-library + test-fixtures/mj-import (any OS)
 */
import { join } from 'path';

export type PickMeTalkRuntime = 'production' | 'test';

export const IS_WINDOWS = process.platform === 'win32';

/** Canonical Windows production paths — never concatenated with cwd on Linux */
export const WINDOWS_LIBRARY_ROOT = 'D:\\PickMeTalk_PhotoLibrary';
export const WINDOWS_IMPORT_WATCH_FOLDER = 'Downloads\\PickMeTalk_MJ';

export const TEST_LIBRARY_ROOT = join(process.cwd(), 'test-fixtures', 'photo-library');
export const TEST_IMPORT_WATCH_FOLDER = join(process.cwd(), 'test-fixtures', 'mj-import');

export function detectRuntime(): PickMeTalkRuntime {
  const explicit = process.env.PICKMETALK_RUNTIME?.toLowerCase();
  if (explicit === 'test' || explicit === 'production') return explicit;
  if (process.env.MJ_PRODUCTION_MODE === 'test') return 'test';
  return 'production';
}

export const PICKMETALK_RUNTIME: PickMeTalkRuntime = detectRuntime();

export function isWindowsDrivePath(raw: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(raw.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, '$1:\\'));
}

/**
 * Resolve PHOTO_LIBRARY_ROOT without creating /workspace/D:/... on Linux.
 */
export function resolvePhotoLibraryRoot(): string {
  const runtime = detectRuntime();
  const env = process.env.PHOTO_LIBRARY_ROOT ?? process.env.PICKMETALK_PHOTO_LIBRARY;
  if (env) {
    if (runtime === 'test' && !IS_WINDOWS && isWindowsDrivePath(env)) {
      return TEST_LIBRARY_ROOT;
    }
    return normalizeLibraryPath(env);
  }
  if (runtime === 'test') return TEST_LIBRARY_ROOT;
  return WINDOWS_LIBRARY_ROOT;
}

/**
 * Resolve MJ import watch folder.
 */
export function resolveImportWatchFolder(): string {
  const runtime = detectRuntime();
  const env = process.env.MJ_IMPORT_WATCH_FOLDER ?? process.env.PICKMETALK_MJ_IMPORT;
  if (env) {
    if (runtime === 'test' && !IS_WINDOWS && isWindowsDrivePath(env)) {
      return TEST_IMPORT_WATCH_FOLDER;
    }
    return normalizeLibraryPath(env);
  }
  if (runtime === 'test') return TEST_IMPORT_WATCH_FOLDER;
  if (IS_WINDOWS) {
    const profile = process.env.USERPROFILE ?? process.env.HOME ?? '';
    return join(profile, 'Downloads', 'PickMeTalk_MJ');
  }
  return WINDOWS_IMPORT_WATCH_FOLDER;
}

/** Normalize path separators for the current platform without cwd-prefixing drive letters */
export function normalizeLibraryPath(raw: string): string {
  if (IS_WINDOWS) {
    return raw.replace(/\//g, '\\');
  }
  if (isWindowsDrivePath(raw)) {
    return raw.replace(/\\/g, '/');
  }
  return raw.replace(/\\/g, '/');
}

/** Production operations require Windows — throws on Linux/macOS */
export function assertProductionRuntime(context: string): void {
  if (detectRuntime() !== 'production') return;
  if (!IS_WINDOWS) {
    throw new Error(
      `[PickMeTalk] Production mode requires Windows.\n` +
        `  Context: ${context}\n` +
        `  Current OS: ${process.platform}\n` +
        `  Use PICKMETALK_RUNTIME=test or MJ_PRODUCTION_MODE=test for Cloud/Linux testing.`
    );
  }
}

/** Warn when production paths look wrong (e.g. cwd-prefixed drive path) */
export function validateNoHybridPath(path: string, label: string): boolean {
  if (path.includes('/D:/') || path.includes('\\D:\\') && path.includes(process.cwd())) {
    console.warn(`[PickMeTalk] Invalid hybrid path for ${label}: ${path}`);
    return false;
  }
  if (!IS_WINDOWS && isWindowsDrivePath(path) && PICKMETALK_RUNTIME === 'production') {
    console.warn(`[PickMeTalk] Windows drive path on non-Windows for ${label}: ${path}`);
    return false;
  }
  return true;
}
