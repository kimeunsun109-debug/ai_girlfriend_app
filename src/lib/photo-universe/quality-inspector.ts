import sharp from 'sharp';
import { UNIVERSE_QUALITY } from '../../config/photo-universe.config.js';
import type { QualityReport } from './types.js';

/** 64-bit dHash as 16 hex chars */
export async function computePerceptualHash(imagePath: string): Promise<string> {
  const size = 9;
  const { data, info } = await sharp(imagePath)
    .greyscale()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = 0n;
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const idx = y * info.width + x;
      const left = data[idx]!;
      const right = data[idx + 1]!;
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return hash.toString(16).padStart(16, '0').slice(-16);
}

export function hammingDistanceHex(a: string, b: string): number {
  const ai = BigInt('0x' + a.padStart(16, '0'));
  const bi = BigInt('0x' + b.padStart(16, '0'));
  let xor = ai ^ bi;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

/** Laplacian variance proxy via sharp — higher = sharper */
async function estimateBlurVariance(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath)
    .greyscale()
    .resize(256, 256, { fit: 'inside' })
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSq = 0;
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const v = data[i]!;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Heuristic "AI smoothness" — very low local variance in skin-tone regions */
async function estimateAiArtifactScore(imagePath: string): Promise<number> {
  const stats = await sharp(imagePath)
    .resize(128, 128, { fit: 'inside' })
    .stats();
  const ch = stats.channels;
  if (ch.length < 3) return 0;
  const avgStdev = (ch[0]!.stdev + ch[1]!.stdev + ch[2]!.stdev) / 3;
  // Extremely low channel variance can indicate over-smoothed AI skin
  if (avgStdev < 12) return 25;
  if (avgStdev < 18) return 10;
  return 0;
}

/** Center-region edge density as face-presence proxy (no ML) */
async function estimateFacePresenceScore(imagePath: string): Promise<number> {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 100 || h < 100) return 0;

  const left = Math.floor(w * 0.25);
  const top = Math.floor(h * 0.1);
  const width = Math.floor(w * 0.5);
  const height = Math.floor(h * 0.55);

  const { data } = await sharp(imagePath)
    .extract({ left, top, width, height })
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let edges = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i]! > 40) edges++;
  }
  const ratio = edges / data.length;
  if (ratio < 0.02) return -30;
  if (ratio < 0.04) return -10;
  return Math.min(20, Math.floor(ratio * 200));
}

export async function inspectImageQuality(
  imagePath: string,
  existingHashes: Map<string, string>
): Promise<QualityReport> {
  const rejectReasons: string[] = [];
  const meta = await sharp(imagePath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const shortEdge = Math.min(width, height);

  if (shortEdge < UNIVERSE_QUALITY.minShortEdge) {
    rejectReasons.push(`resolution_low:${shortEdge}px`);
  }

  const blurVariance = await estimateBlurVariance(imagePath);
  if (blurVariance < UNIVERSE_QUALITY.minBlurVariance) {
    rejectReasons.push(`too_blurry:${blurVariance.toFixed(1)}`);
  }

  const perceptualHash = await computePerceptualHash(imagePath);
  let duplicateOf: string | undefined;
  const similarTo: string[] = [];

  for (const [id, hash] of existingHashes) {
    const dist = hammingDistanceHex(perceptualHash, hash);
    if (dist === 0) {
      duplicateOf = id;
      rejectReasons.push('exact_perceptual_duplicate');
      break;
    }
    if (dist <= UNIVERSE_QUALITY.maxPerceptualDuplicateDistance) {
      similarTo.push(id);
    }
  }
  if (similarTo.length > 0 && !duplicateOf) {
    rejectReasons.push(`similar_composition:${similarTo.length}`);
  }

  const aiPenalty = await estimateAiArtifactScore(imagePath);
  const faceBonus = await estimateFacePresenceScore(imagePath);

  let qualityScore = 70;
  qualityScore += Math.min(15, Math.floor(shortEdge / 120));
  qualityScore += Math.min(15, Math.floor(blurVariance / 20));
  qualityScore += faceBonus;
  qualityScore -= aiPenalty;
  if (similarTo.length > 0) qualityScore -= 15;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const passed =
    rejectReasons.filter((r) => !r.startsWith('similar_composition')).length === 0 &&
    qualityScore >= UNIVERSE_QUALITY.minQualityScore;

  return {
    width,
    height,
    shortEdge,
    blurVariance,
    qualityScore,
    passed,
    rejectReasons,
    perceptualHash,
    duplicateOf,
    similarTo: similarTo.slice(0, 5),
  };
}
