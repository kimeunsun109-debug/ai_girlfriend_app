import sharp from 'sharp';
import type { QualityReport } from '../photo-universe/types.js';

/** Noise estimate via high-frequency energy in grayscale */
export async function estimateNoiseScore(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath)
    .greyscale()
    .resize(128, 128, { fit: 'inside' })
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]! - 128);
  const avg = sum / data.length;
  if (avg > 35) return -15;
  if (avg < 8) return -5;
  return 0;
}

export interface ExtendedQualityReport extends QualityReport {
  noiseScore: number;
  faceCount: number;
  aiArtifactPenalty: number;
}

export async function inspectExtendedQuality(
  imagePath: string,
  existingHashes: Map<string, string>,
  faceCount: number,
  baseReport: QualityReport
): Promise<ExtendedQualityReport> {
  const noiseScore = await estimateNoiseScore(imagePath);
  let qualityScore = baseReport.qualityScore + noiseScore;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  if (faceCount === 0) {
    baseReport.rejectReasons.push('no_face');
  }
  if (faceCount > 2) {
    baseReport.rejectReasons.push('too_many_faces');
    qualityScore -= 10;
  }

  const passed =
    baseReport.rejectReasons.filter((r) => !r.startsWith('similar_composition')).length === 0 &&
    qualityScore >= baseReport.qualityScore - 20 &&
    baseReport.passed;

  return {
    ...baseReport,
    qualityScore,
    passed,
    noiseScore,
    faceCount,
    aiArtifactPenalty: 0,
  };
}
