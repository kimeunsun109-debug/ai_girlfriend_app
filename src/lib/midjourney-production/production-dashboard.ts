import { getProductionDb, type CharacterProgress } from './production-db.js';
import { productionQueue } from './production-queue.js';
import { promptSelector } from './prompt-selector.js';

export interface DashboardSnapshot {
  runId: string | null;
  runStatus: string | null;
  totalJobs: number;
  completedJobs: number;
  progress: CharacterProgress[];
  pendingReviews: number;
  nextJob: {
    character: string;
    folder: string;
    promptPreview: string;
    targetFolder: string;
    midjourneyCommand?: string;
  } | null;
}

export class ProductionDashboard {
  getSnapshot(): DashboardSnapshot {
    const db = getProductionDb();
    const run = productionQueue.getActiveRun();

    if (!run) {
      return {
        runId: null,
        runStatus: null,
        totalJobs: 0,
        completedJobs: 0,
        progress: [],
        pendingReviews: db.getPendingReviews().length,
        nextJob: null,
      };
    }

    const next = db.getNextPendingJob(run.id) ?? db.getAwaitingImportJob(run.id);

    return {
      runId: run.id,
      runStatus: run.status,
      totalJobs: run.totalJobs,
      completedJobs: run.completedJobs,
      progress: db.getCharacterProgress(run.id),
      pendingReviews: db.getPendingReviews().length,
      nextJob: next
        ? {
            character: next.character,
            folder: next.folderSlug,
            promptPreview: next.prompt.slice(0, 120) + (next.prompt.length > 120 ? '...' : ''),
            targetFolder: next.targetFolder,
            midjourneyCommand: next.midjourneyCommand,
          }
        : null,
    };
  }

  renderConsole(): string {
    const snap = this.getSnapshot();
    const lines: string[] = [];
    lines.push('');
    lines.push('PickMeTalk Midjourney Production');
    lines.push('═'.repeat(40));

    if (!snap.runId) {
      lines.push('No active run. Start with: npm run mj:queue');
      lines.push(`Pending reviews: ${snap.pendingReviews}`);
      return lines.join('\n');
    }

    lines.push(`Run: ${snap.runId.slice(0, 8)}…  ${snap.completedJobs}/${snap.totalJobs}  (${snap.runStatus})`);
    lines.push('');

    for (const p of snap.progress) {
      const pct = p.target > 0 ? Math.min(100, Math.round((p.completed / p.target) * 100)) : 0;
      const barLen = 10;
      const filled = Math.round((pct / 100) * barLen);
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      const regen = p.regenerate > 0 ? ` ↻${p.regenerate}` : '';
      const extra =
        p.awaitingImport > 0 ? ` ⏳${p.awaitingImport}` : p.review > 0 ? ` ⚠️${p.review}` : '';
      lines.push(
        `${p.character.padEnd(8)} ${bar}  ${p.completed} / ${p.target}${extra}${regen}`
      );
    }

    lines.push('');
    if (snap.nextJob) {
      lines.push(`Next: ${snap.nextJob.character} → ${snap.nextJob.folder}`);
      lines.push(`Save: ${snap.nextJob.targetFolder}`);
      if (snap.pendingReviews > 0) {
        lines.push(`Review queue: ${snap.pendingReviews} pending`);
      }
    } else {
      lines.push('Queue complete for current run ✓');
    }

    for (const slug of ['yuna', 'narin', 'yunseo', 'eunha', 'jiyu']) {
      const remaining = promptSelector.remainingCount(slug);
      if (remaining < 1000) {
        lines.push(`  ${slug}: ${remaining} prompts unused`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }
}

export const productionDashboard = new ProductionDashboard();

export function printProgressBar(progress: CharacterProgress[]): void {
  console.log(productionDashboard.renderConsole());
}
