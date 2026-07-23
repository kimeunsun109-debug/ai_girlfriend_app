/**
 * Master Dataset — immutable reference faces per character.
 * Path: {PHOTO_LIBRARY_ROOT}/master/{character}/
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { basename, extname, join } from 'path';
import { FACTORY_CHARACTERS, FACTORY_PATHS } from '../../config/hybrid-factory.config.js';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { hashFileContent } from '../photo-catalog/image-validator.js';
import { MASTER_SHOT_SPECS } from './master-shot-spec.js';

export interface MasterImageMeta {
  photoId: string;
  character: string;
  shotId: string;
  filename: string;
  contentHash: string;
  registeredAt: string;
  immutable: true;
}

export interface MasterDatasetIndex {
  character: string;
  count: number;
  immutable: true;
  images: MasterImageMeta[];
  updatedAt: string;
}

export function masterDir(character: string): string {
  return join(FACTORY_PATHS.masterRoot, character);
}

export function bootstrapMasterDataset(characters: string[] = FACTORY_CHARACTERS): {
  characters: string[];
  foldersCreated: number;
} {
  mkdirSync(FACTORY_PATHS.masterRoot, { recursive: true });
  let foldersCreated = 0;
  for (const c of characters) {
    const dir = masterDir(c);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      foldersCreated += 1;
    }
    const inbox = join(dir, '_inbox');
    if (!existsSync(inbox)) {
      mkdirSync(inbox, { recursive: true });
      foldersCreated += 1;
    }
  }
  return { characters, foldersCreated };
}

export function listMasterImages(character: string): string[] {
  const dir = masterDir(character);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase()))
    .map((f) => join(dir, f));
}

export function loadMasterIndex(character: string): MasterDatasetIndex {
  const path = join(masterDir(character), 'master-index.json');
  if (!existsSync(path)) {
    return {
      character,
      count: 0,
      immutable: true,
      images: [],
      updatedAt: new Date().toISOString(),
    };
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as MasterDatasetIndex;
}

function saveMasterIndex(index: MasterDatasetIndex): void {
  const dir = masterDir(index.character);
  mkdirSync(dir, { recursive: true });
  index.count = index.images.length;
  index.updatedAt = new Date().toISOString();
  index.immutable = true;
  writeFileSync(join(dir, 'master-index.json'), JSON.stringify(index, null, 2));
}

/**
 * Register a QA-passed image into Master Dataset.
 * Copies into master/{char}/ — never modifies existing master files.
 */
export function registerMasterImage(options: {
  character: string;
  sourcePath: string;
  shotId?: string;
}): MasterImageMeta {
  const { character, sourcePath } = options;
  if (!existsSync(sourcePath)) throw new Error(`Master source not found: ${sourcePath}`);

  const dir = masterDir(character);
  mkdirSync(dir, { recursive: true });

  const hash = hashFileContent(sourcePath);
  const index = loadMasterIndex(character);
  if (index.images.some((i) => i.contentHash === hash)) {
    throw new Error(`Duplicate master image hash ${hash}`);
  }

  const shotId = options.shotId ?? `manual_${index.images.length + 1}`;
  const ext = extname(sourcePath).toLowerCase() || '.jpg';
  const filename = `${shotId}_${hash.slice(0, 12)}${ext}`;
  const dest = join(dir, filename);
  copyFileSync(sourcePath, dest);

  const meta: MasterImageMeta = {
    photoId: `master_${character}_${hash.slice(0, 16)}`,
    character,
    shotId,
    filename,
    contentHash: hash,
    registeredAt: new Date().toISOString(),
    immutable: true,
  };
  index.images.push(meta);
  saveMasterIndex(index);

  // Sidecar — mark immutable
  writeFileSync(
    dest + '.master.json',
    JSON.stringify({ ...meta, note: 'IMMUTABLE Master Dataset — do not edit' }, null, 2)
  );

  return meta;
}

export function masterDatasetStats(
  characters: string[] = FACTORY_CHARACTERS
): Array<{ character: string; count: number; target: number; ready: boolean }> {
  const target = MASTER_SHOT_SPECS.length;
  return characters.map((character) => {
    const count = listMasterImages(character).length;
    return {
      character,
      count,
      target,
      ready: count >= 10,
    };
  });
}

export function assertMasterNotModified(character: string, filename: string): boolean {
  const index = loadMasterIndex(character);
  return index.images.some((i) => i.filename === filename && i.immutable);
}

export function importInboxToMaster(character: string): MasterImageMeta[] {
  const inbox = join(masterDir(character), '_inbox');
  if (!existsSync(inbox)) return [];
  const registered: MasterImageMeta[] = [];
  for (const f of readdirSync(inbox)) {
    if (!SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase())) continue;
    const src = join(inbox, f);
    try {
      registered.push(
        registerMasterImage({
          character,
          sourcePath: src,
          shotId: basename(f, extname(f)).slice(0, 40),
        })
      );
    } catch (e) {
      console.warn(`[master] skip ${f}:`, e instanceof Error ? e.message : e);
    }
  }
  return registered;
}
