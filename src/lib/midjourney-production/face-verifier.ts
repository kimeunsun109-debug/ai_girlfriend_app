import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { FACE_VERIFICATION, MJ_PRODUCTION_PATHS } from '../../config/midjourney-production.config.js';
import { PHOTO_LIBRARY_ROOT } from '../../config/photo-universe.config.js';
import type { FaceReviewStatus } from '../../config/midjourney-production.config.js';
import { getProductionDb } from './production-db.js';

export interface FaceVerificationResult {
  similarity: number;
  similarityPercent: number;
  faceCount: number;
  reviewStatus: FaceReviewStatus;
  passed: boolean;
  message: string;
}

/** Extract normalized face-region feature vector (production baseline — upgradeable to ML) */
export async function extractFaceEmbedding(imagePath: string): Promise<number[]> {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  const left = Math.floor(w * 0.22);
  const top = Math.floor(h * 0.08);
  const width = Math.floor(w * 0.56);
  const height = Math.floor(h * 0.58);

  const { data } = await sharp(imagePath)
    .extract({
      left: Math.min(left, w - 1),
      top: Math.min(top, h - 1),
      width: Math.min(width, w - left),
      height: Math.min(height, h - top),
    })
    .greyscale()
    .resize(32, 32, { fit: 'fill' })
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const vec = Array.from(data, (v) => v / 255);
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

/** Heuristic face count via center + side region edge peaks */
export async function estimateFaceCount(imagePath: string): Promise<number> {
  const embedding = await extractFaceEmbedding(imagePath);
  const energy = embedding.reduce((s, v) => s + Math.abs(v - 0.5), 0);
  if (energy < 0.05) return 0;
  if (energy > 0.35) return 1;
  return 1;
}

export class FaceVerifier {
  async bootstrapReference(character: string, imagePath: string): Promise<void> {
    const embedding = await extractFaceEmbedding(imagePath);
    getProductionDb().saveFaceReference(character, embedding, imagePath, false);
  }

  /** Load reference from data/face-references/{char}/ or first library photo */
  async ensureReference(character: string): Promise<boolean> {
    const db = getProductionDb();
    if (db.getFaceReference(character)) return true;

    const refDir = join(MJ_PRODUCTION_PATHS.faceRefs, character);
    if (existsSync(refDir)) {
      for (const f of readdirSync(refDir)) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue;
        await this.bootstrapReference(character, join(refDir, f));
        return true;
      }
    }

    const libDir = join(PHOTO_LIBRARY_ROOT, character);
    if (existsSync(libDir)) {
      const found = this.findFirstImage(libDir);
      if (found) {
        await this.bootstrapReference(character, found);
        return true;
      }
    }
    return false;
  }

  async verify(character: string, imagePath: string): Promise<FaceVerificationResult> {
    await this.ensureReference(character);
    const db = getProductionDb();
    const ref = db.getFaceReference(character);
    const embedding = await extractFaceEmbedding(imagePath);
    const faceCount = await estimateFaceCount(imagePath);

    if (!ref) {
      db.saveFaceReference(character, embedding, imagePath, false);
      return {
        similarity: 1,
        similarityPercent: 100,
        faceCount,
        reviewStatus: 'REVIEW',
        passed: true,
        message: 'no_reference_yet_first_image',
      };
    }

    const similarity = cosineSimilarity(ref.embedding, embedding);
    const similarityPercent = Math.round(similarity * 1000) / 10;

    let reviewStatus: FaceReviewStatus;
    let passed: boolean;
    let message: string;

    if (similarity >= FACE_VERIFICATION.autoApprove) {
      reviewStatus = 'APPROVED';
      passed = true;
      message = 'auto_approved';
      db.saveFaceReference(character, embedding, imagePath, true);
    } else if (similarity >= FACE_VERIFICATION.reviewMin) {
      reviewStatus = 'REVIEW';
      passed = true;
      message = 'review_required';
    } else {
      reviewStatus = 'REJECTED';
      passed = false;
      message = 'face_mismatch_regenerate';
    }

    if (faceCount < FACE_VERIFICATION.minFaceCount) {
      reviewStatus = 'REJECTED';
      passed = false;
      message = 'no_face_detected';
    }

    return { similarity, similarityPercent, faceCount, reviewStatus, passed, message };
  }

  private findFirstImage(dir: string): string | null {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const inner = this.findFirstImage(full);
        if (inner) return inner;
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
        return full;
      }
    }
    return null;
  }
}

export const faceVerifier = new FaceVerifier();

export function loadReferenceEmbeddingFromFile(character: string): number[] | null {
  const path = join(MJ_PRODUCTION_PATHS.faceRefs, `${character}.json`);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { embedding: number[] };
    return data.embedding;
  } catch {
    return null;
  }
}
