import {
  MJ_PRODUCTION_PHASE,
  MJ_PRODUCTION_MODE,
  PRODUCTION_SCALE_TIERS,
  MJ_CATALOG_LOW_WATERMARK,
} from '../../config/midjourney-production.config.js';
import { MJ_CHARACTER_ORDER } from '../../config/midjourney-production.config.js';
import { bootstrapPhotoLibrary } from './library-bootstrap.js';
import { productionQueue } from './production-queue.js';
import { productionDashboard } from './production-dashboard.js';
import { productionStats } from './production-stats.js';
import { promptSelector } from './prompt-selector.js';
import { logProduction } from './production-logger.js';
import { getProductionDb } from './production-db.js';

export interface OrchestratorTickResult {
  runId: string | null;
  topUpAdded: number;
  regenProcessed: number;
  stuckRecovered: number;
  statsReport: ReturnType<typeof productionStats.collect>;
}

/**
 * Long-term production orchestrator — grows Photo Library per phase tier.
 * Does not replace manual Midjourney; manages queue health and stats gates.
 */
export class ProductionOrchestrator {
  ensureRun(targetPerCharacter = MJ_PRODUCTION_PHASE): string {
    bootstrapPhotoLibrary();
    let run = productionQueue.getActiveRun();
    if (!run) {
      run = productionQueue.createRun({ photosPerCharacter: targetPerCharacter });
      productionQueue.activateNextJob(run.id);
      return run.id;
    }
    productionQueue.topUpRun(run.id, targetPerCharacter);
    productionQueue.activateNextJob(run.id);
    return run.id;
  }

  tick(targetPerCharacter = MJ_PRODUCTION_PHASE): OrchestratorTickResult {
    const runId = this.ensureRun(targetPerCharacter);
    const db = getProductionDb();

    const stuckRecovered = productionQueue.recoverStuckJobs(runId);
    const regenProcessed = productionQueue.processRegenerationQueue(runId);
    const topUpAdded = productionQueue.topUpRun(runId, targetPerCharacter);
    productionQueue.activateNextJob(runId);

    for (const slug of MJ_CHARACTER_ORDER) {
      const remaining = promptSelector.remainingCount(slug);
      if (remaining < MJ_CATALOG_LOW_WATERMARK) {
        logProduction({
          level: 'warn',
          event: 'catalog_low',
          character: slug,
          message: `${remaining} prompts remaining — runtime scene generation active`,
        });
      }
    }

    const statsReport = productionStats.collect(targetPerCharacter);
    productionStats.persist(statsReport);

    const run = db.getRun(runId);
    if (run && run.completedJobs >= run.totalJobs && run.totalJobs > 0) {
      db.updateRunStatus(runId, 'completed');
      logProduction({
        level: 'info',
        event: 'run_completed',
        message: `Run ${runId.slice(0, 8)} finished ${run.completedJobs}/${run.totalJobs}`,
      });
    }

    return { runId, topUpAdded, regenProcessed, stuckRecovered, statsReport };
  }

  renderStatus(): string {
    const dash = productionDashboard.renderConsole();
    const stats = productionStats.renderConsole(productionStats.collect());
    const mode = `Mode: ${MJ_PRODUCTION_MODE} | Phase: ${MJ_PRODUCTION_PHASE} | Tiers: ${PRODUCTION_SCALE_TIERS.join(' → ')}`;
    return [mode, dash, stats].join('\n');
  }

  recommendNextPhase(): number {
    const report = productionStats.collect();
    const current = MJ_PRODUCTION_PHASE;
    const idx = PRODUCTION_SCALE_TIERS.findIndex((t) => t >= current);
    if (idx < 0) return current;

    const minPhotos = Math.min(...report.characters.map((c) => c.photoCount));
    const avgFace =
      report.characters
        .map((c) => c.avgFaceSimilarity)
        .filter((v): v is number => v != null)
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || 0;

    if (minPhotos >= current * 0.8 && avgFace >= 85 && idx < PRODUCTION_SCALE_TIERS.length - 1) {
      return PRODUCTION_SCALE_TIERS[idx + 1]!;
    }
    return current;
  }
}

export const productionOrchestrator = new ProductionOrchestrator();
