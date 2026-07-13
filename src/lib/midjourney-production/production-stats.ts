import { MJ_PRODUCTION_PATHS, MJ_PRODUCTION_PHASE } from '../../config/midjourney-production.config.js';
import { MJ_CHARACTER_ORDER } from '../../config/midjourney-production.config.js';
import { getProductionDb } from './production-db.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface CharacterQualityStats {
  character: string;
  photoCount: number;
  avgFaceSimilarity: number | null;
  minFaceSimilarity: number | null;
  maxFaceSimilarity: number | null;
  avgQualityScore: number | null;
  approvedCount: number;
  reviewCount: number;
  rejectedCount: number;
}

export interface ProductionStatsReport {
  generatedAt: string;
  phase: number;
  characters: CharacterQualityStats[];
  gateRecommendation: string;
}

export class ProductionStats {
  collect(phaseTarget = MJ_PRODUCTION_PHASE): ProductionStatsReport {
    const db = getProductionDb();
    const byChar = new Map(db.getPhotoQualityStatsByCharacter().map((s) => [s.character, s]));

    const characters: CharacterQualityStats[] = MJ_CHARACTER_ORDER.map((character) => {
      const s = byChar.get(character);
      return (
        s ?? {
          character,
          photoCount: 0,
          avgFaceSimilarity: null,
          minFaceSimilarity: null,
          maxFaceSimilarity: null,
          avgQualityScore: null,
          approvedCount: 0,
          reviewCount: 0,
          rejectedCount: 0,
        }
      );
    });

    const minPhotos = Math.min(...characters.map((c) => c.photoCount));
    const faceSamples = characters
      .map((c) => c.avgFaceSimilarity)
      .filter((v): v is number => v != null);
    const avgFace =
      faceSamples.length > 0
        ? faceSamples.reduce((a, b) => a + b, 0) / faceSamples.length
        : 0;

    let gateRecommendation = 'Continue current phase — gather more data';
    if (minPhotos >= phaseTarget * 0.8 && avgFace >= 85) {
      gateRecommendation = 'Gate PASS — safe to increase MJ_PRODUCTION_PHASE to next tier';
    } else if (minPhotos >= phaseTarget * 0.5 && avgFace > 0 && avgFace < 75) {
      gateRecommendation = 'Gate HOLD — review face references and rejected folder before scaling';
    }

    return {
      generatedAt: new Date().toISOString(),
      phase: phaseTarget,
      characters,
      gateRecommendation,
    };
  }

  persist(report: ProductionStatsReport): void {
    mkdirSync(dirname(MJ_PRODUCTION_PATHS.stats), { recursive: true });
    writeFileSync(MJ_PRODUCTION_PATHS.stats, JSON.stringify(report, null, 2));
  }

  renderConsole(report: ProductionStatsReport): string {
    const lines: string[] = [
      '',
      'Production Quality Stats',
      '═'.repeat(40),
      `Phase target: ${report.phase} photos/character`,
      `Gate: ${report.gateRecommendation}`,
      '',
    ];
    for (const c of report.characters) {
      const face =
        c.avgFaceSimilarity != null ? `face ${c.avgFaceSimilarity}%` : 'face n/a';
      const qual =
        c.avgQualityScore != null ? `quality ${c.avgQualityScore}` : 'quality n/a';
      lines.push(
        `${c.character.padEnd(8)} ${String(c.photoCount).padStart(4)} photos  ${face}  ${qual}  ✓${c.approvedCount} ⚠${c.reviewCount} ✗${c.rejectedCount}`
      );
    }
    lines.push('');
    return lines.join('\n');
  }
}

export const productionStats = new ProductionStats();
