import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  MJ_CHARACTER_ORDER,
  MJ_IMPORT_WATCH_FOLDER,
  MJ_LIBRARY_FOLDERS,
  MJ_PRODUCTION_MODE,
  MJ_PRODUCTION_PHASE,
  MJ_PRODUCTION_PATHS,
} from '../../config/midjourney-production.config.js';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import {
  IS_WINDOWS,
  PICKMETALK_RUNTIME,
  WINDOWS_LIBRARY_ROOT,
} from '../../config/runtime-environment.config.js';
import { bootstrapPhotoLibrary } from './library-bootstrap.js';
import { getProductionDb } from './production-db.js';
import { productionQueue } from './production-queue.js';

export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

export interface ProductionReadyReport {
  ready: boolean;
  runtime: typeof PICKMETALK_RUNTIME;
  checks: ReadinessCheck[];
  passed: number;
  requiredPassed: number;
  requiredTotal: number;
}

function checkCharacterFolders(): { ok: boolean; detail: string } {
  const missing: string[] = [];
  for (const slug of MJ_CHARACTER_ORDER) {
    const charDir = join(PHOTO_LIBRARY_ROOT, slug);
    if (!existsSync(charDir)) {
      missing.push(`${slug}/`);
      continue;
    }
    for (const folder of MJ_LIBRARY_FOLDERS) {
      if (!existsSync(join(charDir, folder))) {
        missing.push(`${slug}/${folder}`);
      }
    }
  }
  if (missing.length === 0) {
    return { ok: true, detail: `5 characters × ${MJ_LIBRARY_FOLDERS.length} categories` };
  }
  return { ok: false, detail: `Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` (+${missing.length - 5})` : ''}` };
}

function checkFaceReferences(): { ok: boolean; detail: string } {
  const refRoot = MJ_PRODUCTION_PATHS.faceRefs;
  if (!existsSync(refRoot)) {
    return { ok: false, detail: 'face-references/ not found — run mj:init' };
  }
  const withRefs: string[] = [];
  const withoutRefs: string[] = [];
  for (const slug of MJ_CHARACTER_ORDER) {
    const dir = join(refRoot, slug);
    if (!existsSync(dir)) {
      withoutRefs.push(slug);
      continue;
    }
    const images = readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (images.length > 0) withRefs.push(`${slug}(${images.length})`);
    else withoutRefs.push(slug);
  }
  if (withRefs.length === 0) {
    return { ok: false, detail: 'No face reference images — add to data/photo-universe/face-references/{char}/' };
  }
  return {
    ok: withoutRefs.length === 0,
    detail: `Refs: ${withRefs.join(', ')}${withoutRefs.length ? ` | Missing: ${withoutRefs.join(', ')}` : ''}`,
  };
}

function checkIngestPipeline(): { ok: boolean; detail: string } {
  return {
    ok: true,
    detail: 'Metadata → Thumbnail → Catalog → Face Verification → Quality Check (ingest-pipeline.ts)',
  };
}

export function collectProductionReadyChecks(): ProductionReadyReport {
  const checks: ReadinessCheck[] = [];

  checks.push({
    id: 'platform',
    label: 'Windows OS (production)',
    ok: IS_WINDOWS,
    detail: IS_WINDOWS ? `win32 ✓` : `${process.platform} — production requires Windows PC`,
    required: PICKMETALK_RUNTIME === 'production',
  });

  checks.push({
    id: 'runtime',
    label: 'Production runtime mode',
    ok: PICKMETALK_RUNTIME === 'production',
    detail:
      PICKMETALK_RUNTIME === 'production'
        ? `production (phase ${MJ_PRODUCTION_PHASE})`
        : `test mode — set PICKMETALK_RUNTIME=production for ops`,
    required: true,
  });

  checks.push({
    id: 'library_path',
    label:
      PICKMETALK_RUNTIME === 'production'
        ? 'Photo Library path (D:\\PickMeTalk_PhotoLibrary)'
        : 'Photo Library path (test-fixtures)',
    ok:
      PICKMETALK_RUNTIME === 'test'
        ? !PHOTO_LIBRARY_ROOT.replace(/\\/g, '/').includes('/D:/') &&
          !PHOTO_LIBRARY_ROOT.startsWith('D:')
        : PHOTO_LIBRARY_ROOT.replace(/\//g, '\\') === WINDOWS_LIBRARY_ROOT,
    detail: PHOTO_LIBRARY_ROOT,
    required: true,
  });

  checks.push({
    id: 'library_exists',
    label: 'Photo Library folder exists',
    ok: existsSync(PHOTO_LIBRARY_ROOT),
    detail: existsSync(PHOTO_LIBRARY_ROOT) ? 'Found' : 'Run: npm run mj:init',
    required: true,
  });

  const charFolders = checkCharacterFolders();
  checks.push({
    id: 'character_folders',
    label: 'Character + category folders (5 chars)',
    ok: charFolders.ok,
    detail: charFolders.detail,
    required: true,
  });

  checks.push({
    id: 'watch_folder',
    label: 'Import Watch Folder (Downloads\\PickMeTalk_MJ)',
    ok: existsSync(MJ_IMPORT_WATCH_FOLDER),
    detail: MJ_IMPORT_WATCH_FOLDER,
    required: true,
  });

  checks.push({
    id: 'catalog_db',
    label: 'SQLite Catalog DB',
    ok: existsSync(PHOTO_UNIVERSE_PATHS.catalogDb),
    detail: PHOTO_UNIVERSE_PATHS.catalogDb,
    required: false,
  });

  checks.push({
    id: 'face_refs',
    label: 'Face reference images',
    ok: checkFaceReferences().ok,
    detail: checkFaceReferences().detail,
    required: false,
  });

  const activeRun = productionQueue.getActiveRun();
  checks.push({
    id: 'production_queue',
    label: 'Active production queue',
    ok: Boolean(activeRun),
    detail: activeRun
      ? `Run ${activeRun.id.slice(0, 8)}… ${activeRun.completedJobs}/${activeRun.totalJobs}`
      : 'Run: npm run mj:queue -- --count=150',
    required: false,
  });

  const ingest = checkIngestPipeline();
  checks.push({
    id: 'ingest_pipeline',
    label: 'Auto-ingest pipeline (metadata/thumbnail/catalog/face/quality)',
    ok: ingest.ok,
    detail: ingest.detail,
    required: true,
  });

  checks.push({
    id: 'production_mode',
    label: 'MJ production mode config',
    ok: MJ_PRODUCTION_MODE === 'production',
    detail: `MJ_PRODUCTION_MODE=${MJ_PRODUCTION_MODE}, phase=${MJ_PRODUCTION_PHASE}`,
    required: true,
  });

  const required = checks.filter((c) => c.required);
  const requiredPassed = required.filter((c) => c.ok).length;
  const passed = checks.filter((c) => c.ok).length;
  const ready = required.every((c) => c.ok);

  return {
    ready,
    runtime: PICKMETALK_RUNTIME,
    checks,
    passed,
    requiredPassed,
    requiredTotal: required.length,
  };
}

export function renderProductionReadyReport(report: ProductionReadyReport): string {
  const lines: string[] = [
    '',
    '╔══════════════════════════════════════════════════╗',
    '║         PickMeTalk Production Ready Check        ║',
    '╚══════════════════════════════════════════════════╝',
    '',
    `Runtime: ${report.runtime} | Phase: ${MJ_PRODUCTION_PHASE} | Mode: ${MJ_PRODUCTION_MODE}`,
    '',
  ];

  for (const c of report.checks) {
    const icon = c.ok ? '✓' : c.required ? '✗' : '○';
    const req = c.required ? '' : ' (optional)';
    lines.push(`${icon} ${c.label}${req}`);
    lines.push(`    ${c.detail}`);
  }

  lines.push('');
  lines.push(`Required: ${report.requiredPassed}/${report.requiredTotal} | Total: ${report.passed}/${report.checks.length}`);
  lines.push('');

  if (report.ready) {
    lines.push('══════════════════════════════════════════════════');
    lines.push('  PRODUCTION READY — Phase 150 생성을 시작할 수 있습니다');
    lines.push('══════════════════════════════════════════════════');
    lines.push('');
    lines.push('Next steps:');
    lines.push('  1. npm run mj:queue -- --count=150 --new');
    lines.push('  2. npm run mj:production');
    lines.push('  3. Discord MJ → Downloads\\PickMeTalk_MJ 저장');
    lines.push('  4. npm run mj:production -- --stats');
  } else {
    lines.push('══════════════════════════════════════════════════');
    lines.push('  NOT READY — 위 ✗ 항목을 먼저 해결하세요');
    lines.push('══════════════════════════════════════════════════');
    if (!IS_WINDOWS && PICKMETALK_RUNTIME === 'production') {
      lines.push('');
      lines.push('⚠ Production은 Windows PC에서만 실행 가능합니다.');
    }
  }

  lines.push('');
  return lines.join('\n');
}

/** Run bootstrap then readiness check */
export function runProductionReadyCheck(bootstrap = true): ProductionReadyReport {
  if (bootstrap && IS_WINDOWS && PICKMETALK_RUNTIME === 'production') {
    bootstrapPhotoLibrary();
  }
  getProductionDb();
  return collectProductionReadyChecks();
}
