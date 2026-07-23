import { existsSync, readdirSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { FACTORY_CHARACTERS, FACTORY_PHASE } from '../../config/hybrid-factory.config.js';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { masterDatasetStats } from './master-dataset.js';
import { loadCharacterProfile } from './character-profile.js';

export interface FactoryDashboardRow {
  character: string;
  master: number;
  generated: number;
  active: number;
  review: number;
  rejected: number;
  avgFace: number | null;
  avgQuality: number | null;
  duplicateRate: number | null;
  profileReady: boolean;
}

function countImagesInDir(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) n += countImagesInDir(full);
    else if (SUPPORTED_EXTENSIONS.has(extname(name.name).toLowerCase())) n += 1;
  }
  return n;
}

function readCharacterIndex(character: string): { total: number } {
  const idx = join(PHOTO_UNIVERSE_PATHS.indexes, `${character}.json`);
  if (!existsSync(idx)) return { total: 0 };
  try {
    const data = JSON.parse(readFileSync(idx, 'utf-8')) as {
      totalCount?: number;
      photos?: unknown[];
    };
    return { total: data.totalCount ?? data.photos?.length ?? 0 };
  } catch {
    return { total: 0 };
  }
}

function collectSidecarStats(character: string): {
  avgFace: number | null;
  avgQuality: number | null;
} {
  const root = join(PHOTO_LIBRARY_ROOT, character);
  if (!existsSync(root)) return { avgFace: null, avgQuality: null };

  const faces: number[] = [];
  const qualities: number[] = [];

  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.name.endsWith('.json')) continue;
      // sidecars: image.png.json or similar — skip master-index
      if (name.name === 'master-index.json') continue;
      try {
        const raw = JSON.parse(readFileSync(full, 'utf-8')) as {
          faceSimilarity?: number;
          qualityScore?: number;
        };
        if (typeof raw.faceSimilarity === 'number') faces.push(raw.faceSimilarity);
        if (typeof raw.qualityScore === 'number') qualities.push(raw.qualityScore);
      } catch {
        /* ignore */
      }
    }
  };
  walk(root);

  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  return { avgFace: avg(faces), avgQuality: avg(qualities) };
}

export function collectFactoryDashboard(
  characters: string[] = FACTORY_CHARACTERS
): FactoryDashboardRow[] {
  const masters = masterDatasetStats(characters);

  return characters.map((character) => {
    const m = masters.find((x) => x.character === character)!;
    const profile = loadCharacterProfile(character);
    const { total } = readCharacterIndex(character);
    const review = countImagesInDir(join(PHOTO_LIBRARY_ROOT, character, '_review'));
    const rejected = countImagesInDir(join(PHOTO_LIBRARY_ROOT, character, '_rejected'));
    const { avgFace, avgQuality } = collectSidecarStats(character);

    return {
      character,
      master: m.count,
      generated: total + rejected,
      active: Math.max(0, total - review),
      review,
      rejected,
      avgFace,
      avgQuality,
      duplicateRate: null,
      profileReady: Boolean(profile?.metadata.readyForMassProduction),
    };
  });
}

export function renderFactoryDashboard(rows: FactoryDashboardRow[] = collectFactoryDashboard()): string {
  const lines = [
    '',
    'PickMeTalk Hybrid Photo Factory',
    '═'.repeat(42),
    `Phase target: ${FACTORY_PHASE}/character (local RTX mass production)`,
    'Midjourney = Master only (10–20) · RTX = Mass production',
    '',
  ];

  for (const r of rows) {
    const barLen = 10;
    const pct = Math.min(100, Math.round((r.generated / Math.max(FACTORY_PHASE, 1)) * 100));
    const filled = Math.round((pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    lines.push(`${r.character.padEnd(8)} ${bar}  Generated ${r.generated} / ${FACTORY_PHASE}`);
    lines.push(
      `         Master ${r.master}  ACTIVE ${r.active}  REVIEW ${r.review}  REJECT ${r.rejected}`
    );
    lines.push(
      `         Profile ${r.profileReady ? 'READY' : 'PENDING'}  AvgFace ${r.avgFace ?? 'n/a'}%  AvgQuality ${r.avgQuality ?? 'n/a'}`
    );
  }
  lines.push('');
  return lines.join('\n');
}
