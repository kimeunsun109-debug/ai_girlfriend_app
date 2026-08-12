/**
 * Profile candidate selection + Best Profile scoring for UI.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';
import { PHOTO_LIBRARY_ROOT } from '../../../config/photo-universe.config.js';
import { FACTORY_PATHS } from '../../../config/hybrid-factory.config.js';
import { listMasterImages } from '../master-dataset.js';
import { SUPPORTED_EXTENSIONS } from '../../photo-catalog/types.js';

export interface ProfileCandidate {
  rank: number;
  path: string;
  source: 'master' | 'library';
  score: number;
  reasons: string[];
}

export interface BestProfileResult {
  character: string;
  path: string;
  confidence: number;
  stars: number;
  reasons: string[];
  ab?: { a: string; b: string; aLabel: string; bLabel: string };
}

function collectLibraryImages(character: string, limit = 80): string[] {
  const root = join(PHOTO_LIBRARY_ROOT, character);
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith('_')) continue;
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full);
      else if (SUPPORTED_EXTENSIONS.has(extname(name.name).toLowerCase())) {
        out.push(full);
        if (out.length >= limit) return;
      }
    }
  };
  walk(root);
  return out;
}

async function scorePortrait(path: string): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 50;
  try {
    const meta = await sharp(path).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w >= 512 && h >= 512) {
      score += 10;
      reasons.push('resolution_ok');
    }
    if (h >= w) {
      score += 8;
      reasons.push('portrait_orientation');
    }
    // center brightness as proxy for face exposure
    const { data, info } = await sharp(path)
      .resize(64, 64, { fit: 'cover' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]!;
    const avg = sum / data.length;
    if (avg > 40 && avg < 220) {
      score += 12;
      reasons.push('exposure_ok');
    }
    // upper-center variance ≈ face detail
    let faceSum = 0;
    let faceN = 0;
    for (let y = 8; y < 36; y++) {
      for (let x = 16; x < 48; x++) {
        faceSum += data[y * info.width + x]!;
        faceN += 1;
      }
    }
    const faceAvg = faceSum / (faceN || 1);
    if (faceAvg > 50) {
      score += 15;
      reasons.push('face_region_visible');
    }
    reasons.push('ui_thumbnail_friendly');
    score += 5;
  } catch {
    reasons.push('score_error');
  }
  return { score: Math.min(100, score), reasons };
}

export async function selectProfileCandidates(
  character: string,
  topN = 5
): Promise<ProfileCandidate[]> {
  const masters = listMasterImages(character);
  const library = collectLibraryImages(character);
  const pool = [
    ...masters.map((p) => ({ path: p, source: 'master' as const })),
    ...library.map((p) => ({ path: p, source: 'library' as const })),
  ];

  const scored: ProfileCandidate[] = [];
  for (const item of pool) {
    const { score, reasons } = await scorePortrait(item.path);
    scored.push({
      rank: 0,
      path: item.path,
      source: item.source,
      score,
      reasons,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((c, i) => ({ ...c, rank: i + 1 }));
}

export async function selectBestProfile(character: string): Promise<BestProfileResult | null> {
  const candidates = await selectProfileCandidates(character, 5);
  if (!candidates.length) return null;
  const best = candidates[0]!;
  const second = candidates[1];
  const confidence = Math.round(best.score * 10) / 10;
  const stars = Math.max(1, Math.min(5, Math.round(best.score / 20)));

  const result: BestProfileResult = {
    character,
    path: best.path,
    confidence,
    stars,
    reasons: best.reasons,
    ab:
      second
        ? {
            a: best.path,
            b: second.path,
            aLabel: '웃는/고득점 얼굴',
            bLabel: '차선 후보',
          }
        : undefined,
  };

  const dir = join(FACTORY_PATHS.uiMockups, character);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'best-profile.json'), JSON.stringify(result, null, 2));
  writeFileSync(join(dir, 'profile-candidates.json'), JSON.stringify(candidates, null, 2));
  return result;
}
