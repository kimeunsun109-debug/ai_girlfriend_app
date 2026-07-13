import { createHash, randomUUID } from 'crypto';
import { join } from 'path';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import {
  MJ_PHOTOS_PER_CHARACTER,
  MJ_PRODUCTION_PATHS,
  type ProductionJobStatus,
  type ProductionRunStatus,
  type FaceReviewStatus,
} from '../../config/midjourney-production.config.js';
import { applyPhotoProductionMigrations } from '../photo-universe/catalog-migrations.js';
import { ensureUniverseDirs } from '../photo-universe/paths.js';

const PRODUCTION_SCHEMA = `
CREATE TABLE IF NOT EXISTS production_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'created',
  photos_per_character INTEGER NOT NULL,
  character_order TEXT NOT NULL,
  current_character TEXT,
  current_job_index INTEGER NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS production_queue_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  character TEXT NOT NULL,
  folder_slug TEXT NOT NULL,
  catalog_category TEXT NOT NULL,
  catalog_index INTEGER NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  target_folder TEXT NOT NULL,
  midjourney_command TEXT,
  created_at TEXT NOT NULL,
  prompt_ready_at TEXT,
  import_ready_at TEXT,
  completed_at TEXT,
  ingested_photo_id TEXT,
  error_message TEXT,
  UNIQUE(run_id, character, catalog_category, catalog_index)
);

CREATE INDEX IF NOT EXISTS idx_jobs_run ON production_queue_jobs(run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON production_queue_jobs(run_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_character ON production_queue_jobs(run_id, character, status);

CREATE TABLE IF NOT EXISTS prompt_usage (
  character TEXT NOT NULL,
  catalog_category TEXT NOT NULL,
  catalog_index INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  job_id TEXT,
  used_at TEXT NOT NULL,
  PRIMARY KEY (character, catalog_category, catalog_index)
);

CREATE INDEX IF NOT EXISTS idx_prompt_usage_char ON prompt_usage(character);

CREATE TABLE IF NOT EXISTS face_references (
  character TEXT PRIMARY KEY,
  embedding TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1,
  source_path TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_queue (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  job_id TEXT,
  character TEXT NOT NULL,
  face_similarity REAL NOT NULL,
  relative_path TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_pending ON review_queue(status, character);

CREATE TABLE IF NOT EXISTS production_event_log (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  event TEXT NOT NULL,
  character TEXT,
  job_id TEXT,
  message TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_events_ts ON production_event_log(created_at DESC);

CREATE TABLE IF NOT EXISTS dynamic_prompt_registry (
  character TEXT NOT NULL,
  dynamic_index INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (character, dynamic_index)
);

CREATE INDEX IF NOT EXISTS idx_dynamic_hash ON dynamic_prompt_registry(character, prompt_hash);
`;

const JOB_COLUMN_MIGRATIONS = [
  `ALTER TABLE production_queue_jobs ADD COLUMN retry_count INTEGER DEFAULT 0`,
  `ALTER TABLE production_queue_jobs ADD COLUMN prompt_source TEXT DEFAULT 'catalog'`,
];

export interface ProductionRun {
  id: string;
  status: ProductionRunStatus;
  photosPerCharacter: number;
  characterOrder: string[];
  currentCharacter: string | null;
  currentJobIndex: number;
  totalJobs: number;
  completedJobs: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionQueueJob {
  id: string;
  runId: string;
  character: string;
  folderSlug: string;
  catalogCategory: string;
  catalogIndex: number;
  promptId: string;
  prompt: string;
  negativePrompt?: string;
  sequence: number;
  status: ProductionJobStatus;
  targetFolder: string;
  midjourneyCommand?: string;
  createdAt: string;
  ingestedPhotoId?: string;
  errorMessage?: string;
  retryCount?: number;
  promptSource?: 'catalog' | 'generated';
}

export interface CharacterProgress {
  character: string;
  target: number;
  completed: number;
  awaitingImport: number;
  failed: number;
  review: number;
  regenerate: number;
}

export class ProductionDb {
  private db: Database.Database;

  constructor(dbPath = PHOTO_UNIVERSE_PATHS.catalogDb) {
    ensureUniverseDirs();
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(PRODUCTION_SCHEMA);
    applyPhotoProductionMigrations(this.db);
    for (const sql of JOB_COLUMN_MIGRATIONS) {
      try {
        this.db.exec(sql);
      } catch {
        /* column exists */
      }
    }
  }

  close(): void {
    this.db.close();
  }

  isPromptUsed(character: string, catalogCategory: string, catalogIndex: number): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 FROM prompt_usage WHERE character = ? AND catalog_category = ? AND catalog_index = ?'
      )
      .get(character, catalogCategory, catalogIndex);
    return Boolean(row);
  }

  markPromptUsed(
    character: string,
    catalogCategory: string,
    catalogIndex: number,
    promptHash: string,
    jobId: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO prompt_usage (character, catalog_category, catalog_index, prompt_hash, job_id, used_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(character, catalog_category, catalog_index) DO UPDATE SET
           prompt_hash = excluded.prompt_hash, job_id = excluded.job_id, used_at = excluded.used_at`
      )
      .run(character, catalogCategory, catalogIndex, promptHash, jobId, new Date().toISOString());
  }

  isPromptHashUsed(character: string, promptHash: string): boolean {
    const catalog = this.db
      .prepare('SELECT 1 FROM prompt_usage WHERE character = ? AND prompt_hash = ?')
      .get(character, promptHash);
    if (catalog) return true;
    const dynamic = this.db
      .prepare('SELECT 1 FROM dynamic_prompt_registry WHERE character = ? AND prompt_hash = ?')
      .get(character, promptHash);
    return Boolean(dynamic);
  }

  getNextDynamicIndex(character: string): number {
    const row = this.db
      .prepare(
        'SELECT COALESCE(MAX(dynamic_index), -1) + 1 as next_idx FROM dynamic_prompt_registry WHERE character = ?'
      )
      .get(character) as { next_idx: number };
    return row.next_idx;
  }

  registerDynamicPrompt(
    character: string,
    dynamicIndex: number,
    promptHash: string,
    prompt: string,
    negativePrompt?: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO dynamic_prompt_registry (character, dynamic_index, prompt_hash, prompt, negative_prompt, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(character, dynamicIndex, promptHash, prompt, negativePrompt ?? null, new Date().toISOString());
  }

  insertEventLog(row: {
    id: string;
    level: string;
    event: string;
    character?: string;
    jobId?: string;
    message: string;
    meta?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO production_event_log (id, level, event, character, job_id, message, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.level,
        row.event,
        row.character ?? null,
        row.jobId ?? null,
        row.message,
        row.meta ?? null,
        new Date().toISOString()
      );
  }

  getRecentEvents(limit = 50): Array<Record<string, unknown>> {
    return this.db
      .prepare('SELECT * FROM production_event_log ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;
  }

  getUsedPromptCount(character: string): number {
    return (
      this.db.prepare('SELECT COUNT(*) as c FROM prompt_usage WHERE character = ?').get(character) as {
        c: number;
      }
    ).c;
  }

  getPhotoQualityStatsByCharacter(): Array<{
    character: string;
    photoCount: number;
    avgFaceSimilarity: number | null;
    minFaceSimilarity: number | null;
    maxFaceSimilarity: number | null;
    avgQualityScore: number | null;
    approvedCount: number;
    reviewCount: number;
    rejectedCount: number;
  }> {
    const table = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='photos'")
      .get() as { name: string } | undefined;
    if (!table) return [];

    const rows = this.db
      .prepare(
        `SELECT character,
          COUNT(*) as photo_count,
          AVG(face_similarity) as avg_face,
          MIN(face_similarity) as min_face,
          MAX(face_similarity) as max_face,
          AVG(quality_score) as avg_quality,
          SUM(CASE WHEN review_status = 'APPROVED' OR face_verified = 1 THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN review_status = 'REVIEW' OR status = 'REVIEW' THEN 1 ELSE 0 END) as review,
          SUM(CASE WHEN status = 'REJECTED' OR review_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
         FROM photos GROUP BY character`
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      character: r.character as string,
      photoCount: r.photo_count as number,
      avgFaceSimilarity:
        r.avg_face != null ? Math.round((r.avg_face as number) * 1000) / 10 : null,
      minFaceSimilarity:
        r.min_face != null ? Math.round((r.min_face as number) * 1000) / 10 : null,
      maxFaceSimilarity:
        r.max_face != null ? Math.round((r.max_face as number) * 1000) / 10 : null,
      avgQualityScore:
        r.avg_quality != null ? Math.round((r.avg_quality as number) * 10) / 10 : null,
      approvedCount: (r.approved as number) ?? 0,
      reviewCount: (r.review as number) ?? 0,
      rejectedCount: (r.rejected as number) ?? 0,
    }));
  }

  createRun(
    characterOrder: string[],
    photosPerCharacter = MJ_PHOTOS_PER_CHARACTER
  ): ProductionRun {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO production_runs
         (id, status, photos_per_character, character_order, current_character, total_jobs, created_at, updated_at)
         VALUES (?, 'created', ?, ?, ?, 0, ?, ?)`
      )
      .run(id, photosPerCharacter, JSON.stringify(characterOrder), characterOrder[0] ?? null, now, now);
    return this.getRun(id)!;
  }

  getRun(id: string): ProductionRun | null {
    const row = this.db.prepare('SELECT * FROM production_runs WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToRun(row) : null;
  }

  getActiveRun(): ProductionRun | null {
    const row = this.db
      .prepare(`SELECT * FROM production_runs WHERE status IN ('created', 'running', 'paused') ORDER BY created_at DESC LIMIT 1`)
      .get() as Record<string, unknown> | undefined;
    return row ? this.rowToRun(row) : null;
  }

  updateRunStatus(id: string, status: ProductionRunStatus): void {
    this.db
      .prepare('UPDATE production_runs SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
  }

  insertJob(job: Omit<ProductionQueueJob, 'createdAt'> & { createdAt?: string }): void {
    const now = job.createdAt ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO production_queue_jobs
         (id, run_id, character, folder_slug, catalog_category, catalog_index, prompt_id, prompt,
          negative_prompt, sequence, status, target_folder, midjourney_command, created_at,
          retry_count, prompt_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.id,
        job.runId,
        job.character,
        job.folderSlug,
        job.catalogCategory,
        job.catalogIndex,
        job.promptId,
        job.prompt,
        job.negativePrompt ?? null,
        job.sequence,
        job.status,
        job.targetFolder,
        job.midjourneyCommand ?? null,
        now,
        job.retryCount ?? 0,
        job.promptSource ?? 'catalog'
      );
  }

  setRunTotalJobs(runId: string, total: number): void {
    this.db
      .prepare('UPDATE production_runs SET total_jobs = ?, updated_at = ? WHERE id = ?')
      .run(total, new Date().toISOString(), runId);
  }

  updateJobStatus(jobId: string, status: ProductionJobStatus, extra?: Partial<ProductionQueueJob>): void {
    const sets = ['status = @status'];
    const params: Record<string, unknown> = { jobId, status };
    if (status === 'prompt_ready') {
      sets.push('prompt_ready_at = @ts');
      params.ts = new Date().toISOString();
    }
    if (status === 'awaiting_import') {
      sets.push('import_ready_at = @ts');
      params.ts = new Date().toISOString();
    }
    if (status === 'completed') {
      sets.push('completed_at = @ts');
      params.ts = new Date().toISOString();
    }
    if (extra?.ingestedPhotoId) {
      sets.push('ingested_photo_id = @photoId');
      params.photoId = extra.ingestedPhotoId;
    }
    if (extra?.errorMessage) {
      sets.push('error_message = @err');
      params.err = extra.errorMessage;
    }
    this.db.prepare(`UPDATE production_queue_jobs SET ${sets.join(', ')} WHERE id = @jobId`).run(params);
  }

  getNextPendingJob(runId: string): ProductionQueueJob | null {
    const row = this.db
      .prepare(
        `SELECT * FROM production_queue_jobs
         WHERE run_id = ? AND status IN ('pending', 'regenerate')
         ORDER BY CASE status WHEN 'regenerate' THEN 0 ELSE 1 END, sequence ASC LIMIT 1`
      )
      .get(runId) as Record<string, unknown> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  getRegenerateJobs(runId: string): ProductionQueueJob[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM production_queue_jobs WHERE run_id = ? AND status = 'regenerate' ORDER BY sequence ASC`
      )
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToJob(r));
  }

  resetJobForRetry(jobId: string): void {
    this.db
      .prepare(
        `UPDATE production_queue_jobs
         SET status = 'pending', error_message = NULL, retry_count = COALESCE(retry_count, 0) + 1
         WHERE id = ?`
      )
      .run(jobId);
  }

  resetStuckIngestingJobs(runId: string): number {
    const result = this.db
      .prepare(
        `UPDATE production_queue_jobs SET status = 'awaiting_import'
         WHERE run_id = ? AND status = 'ingesting'`
      )
      .run(runId);
    return result.changes;
  }

  countCharacterJobs(runId: string, character: string): {
    total: number;
    completed: number;
    active: number;
    failed: number;
    regenerate: number;
  } {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as c FROM production_queue_jobs
         WHERE run_id = ? AND character = ? GROUP BY status`
      )
      .all(runId, character) as Array<{ status: string; c: number }>;
    const map = Object.fromEntries(rows.map((r) => [r.status, r.c]));
    const completed = map.completed ?? 0;
    const failed = map.failed ?? 0;
    const regenerate = map.regenerate ?? 0;
    const active =
      (map.pending ?? 0) +
      (map.prompt_ready ?? 0) +
      (map.awaiting_import ?? 0) +
      (map.ingesting ?? 0) +
      regenerate;
    const total = rows.reduce((s, r) => s + r.c, 0);
    return { total, completed, active, failed, regenerate };
  }

  getAwaitingImportJob(runId: string): ProductionQueueJob | null {
    const row = this.db
      .prepare(
        `SELECT * FROM production_queue_jobs
         WHERE run_id = ? AND status = 'awaiting_import'
         ORDER BY import_ready_at ASC LIMIT 1`
      )
      .get(runId) as Record<string, unknown> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  getJobById(jobId: string): ProductionQueueJob | null {
    const row = this.db.prepare('SELECT * FROM production_queue_jobs WHERE id = ?').get(jobId) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToJob(row) : null;
  }

  listJobsForRun(runId: string): ProductionQueueJob[] {
    const rows = this.db
      .prepare('SELECT * FROM production_queue_jobs WHERE run_id = ? ORDER BY sequence ASC')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToJob(r));
  }

  incrementCompletedJobs(runId: string): void {
    this.db
      .prepare(
        `UPDATE production_runs SET completed_jobs = completed_jobs + 1, updated_at = ? WHERE id = ?`
      )
      .run(new Date().toISOString(), runId);
    const run = this.getRun(runId);
    if (run && run.completedJobs + 1 >= run.totalJobs) {
      this.updateRunStatus(runId, 'completed');
    }
  }

  getCharacterProgress(runId: string): CharacterProgress[] {
    const run = this.getRun(runId);
    if (!run) return [];
    const chars = run.characterOrder;
    const result: CharacterProgress[] = [];

    for (const character of chars) {
      const completed = (
        this.db
          .prepare(
            `SELECT COUNT(*) as c FROM production_queue_jobs
             WHERE run_id = ? AND character = ? AND status = 'completed'`
          )
          .get(runId, character) as { c: number }
      ).c;
      const awaitingImport = (
        this.db
          .prepare(
            `SELECT COUNT(*) as c FROM production_queue_jobs
             WHERE run_id = ? AND character = ? AND status = 'awaiting_import'`
          )
          .get(runId, character) as { c: number }
      ).c;
      const failed = (
        this.db
          .prepare(
            `SELECT COUNT(*) as c FROM production_queue_jobs
             WHERE run_id = ? AND character = ? AND status = 'failed'`
          )
          .get(runId, character) as { c: number }
      ).c;
      const regenerate = (
        this.db
          .prepare(
            `SELECT COUNT(*) as c FROM production_queue_jobs
             WHERE run_id = ? AND character = ? AND status = 'regenerate'`
          )
          .get(runId, character) as { c: number }
      ).c;
      const review = (
        this.db
          .prepare(
            `SELECT COUNT(*) as c FROM review_queue rq
             JOIN production_queue_jobs j ON j.id = rq.job_id
             WHERE j.run_id = ? AND j.character = ? AND rq.status = 'pending'`
          )
          .get(runId, character) as { c: number }
      ).c;

      result.push({
        character,
        target: run.photosPerCharacter,
        completed,
        awaitingImport,
        failed,
        review,
        regenerate,
      });
    }
    return result;
  }

  saveFaceReference(character: string, embedding: number[], sourcePath?: string, merge = false): void {
    const existing = this.getFaceReference(character);
    let final = embedding;
    let count = 1;
    if (merge && existing) {
      count = existing.sampleCount + 1;
      final = existing.embedding.map((v, i) => (v * (count - 1) + (embedding[i] ?? 0)) / count);
    }
    this.db
      .prepare(
        `INSERT INTO face_references (character, embedding, sample_count, source_path, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(character) DO UPDATE SET
           embedding = excluded.embedding,
           sample_count = excluded.sample_count,
           source_path = excluded.source_path,
           updated_at = excluded.updated_at`
      )
      .run(character, JSON.stringify(final), count, sourcePath ?? null, new Date().toISOString());
  }

  getFaceReference(character: string): { embedding: number[]; sampleCount: number } | null {
    const row = this.db.prepare('SELECT * FROM face_references WHERE character = ?').get(character) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return {
      embedding: JSON.parse(row.embedding as string) as number[],
      sampleCount: row.sample_count as number,
    };
  }

  addReviewItem(item: {
    photoId: string;
    jobId?: string;
    character: string;
    faceSimilarity: number;
    relativePath: string;
    reason: string;
  }): string {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO review_queue (id, photo_id, job_id, character, face_similarity, relative_path, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        item.photoId,
        item.jobId ?? null,
        item.character,
        item.faceSimilarity,
        item.relativePath,
        item.reason,
        new Date().toISOString()
      );
    return id;
  }

  getPendingReviews(character?: string) {
    const sql = character
      ? `SELECT * FROM review_queue WHERE status = 'pending' AND character = ? ORDER BY created_at`
      : `SELECT * FROM review_queue WHERE status = 'pending' ORDER BY created_at`;
    const rows = character
      ? this.db.prepare(sql).all(character)
      : this.db.prepare(sql).all();
    return rows as Array<Record<string, unknown>>;
  }

  updatePhotoProductionFields(
    contentHash: string,
    fields: {
      faceSimilarity?: number;
      faceVerified?: boolean;
      reviewStatus?: FaceReviewStatus;
      promptId?: string;
      queueJobId?: string;
      noiseScore?: number;
      faceCount?: number;
      status?: string;
    }
  ): void {
    const sets: string[] = [];
    const params: Record<string, unknown> = { hash: contentHash };
    if (fields.faceSimilarity != null) {
      sets.push('face_similarity = @fs');
      params.fs = fields.faceSimilarity;
    }
    if (fields.faceVerified != null) {
      sets.push('face_verified = @fv');
      params.fv = fields.faceVerified ? 1 : 0;
    }
    if (fields.reviewStatus) {
      sets.push('review_status = @rs');
      params.rs = fields.reviewStatus;
    }
    if (fields.promptId) {
      sets.push('prompt_id = @pid');
      params.pid = fields.promptId;
    }
    if (fields.queueJobId) {
      sets.push('queue_job_id = @qj');
      params.qj = fields.queueJobId;
    }
    if (fields.noiseScore != null) {
      sets.push('noise_score = @ns');
      params.ns = fields.noiseScore;
    }
    if (fields.faceCount != null) {
      sets.push('face_count = @fc');
      params.fc = fields.faceCount;
    }
    if (fields.status) {
      sets.push('status = @st');
      params.st = fields.status;
    }
    if (sets.length === 0) return;
    this.db.prepare(`UPDATE photos SET ${sets.join(', ')} WHERE content_hash = @hash`).run(params);
  }

  static hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  }

  private rowToRun(row: Record<string, unknown>): ProductionRun {
    return {
      id: row.id as string,
      status: row.status as ProductionRunStatus,
      photosPerCharacter: row.photos_per_character as number,
      characterOrder: JSON.parse(row.character_order as string) as string[],
      currentCharacter: (row.current_character as string) ?? null,
      currentJobIndex: row.current_job_index as number,
      totalJobs: row.total_jobs as number,
      completedJobs: row.completed_jobs as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToJob(row: Record<string, unknown>): ProductionQueueJob {
    return {
      id: row.id as string,
      runId: row.run_id as string,
      character: row.character as string,
      folderSlug: row.folder_slug as string,
      catalogCategory: row.catalog_category as string,
      catalogIndex: row.catalog_index as number,
      promptId: row.prompt_id as string,
      prompt: row.prompt as string,
      negativePrompt: (row.negative_prompt as string) ?? undefined,
      sequence: row.sequence as number,
      status: row.status as ProductionJobStatus,
      targetFolder: row.target_folder as string,
      midjourneyCommand: (row.midjourney_command as string) ?? undefined,
      createdAt: row.created_at as string,
      ingestedPhotoId: (row.ingested_photo_id as string) ?? undefined,
      errorMessage: (row.error_message as string) ?? undefined,
      retryCount: (row.retry_count as number) ?? 0,
      promptSource: ((row.prompt_source as string) ?? 'catalog') as 'catalog' | 'generated',
    };
  }
}

let productionDbInstance: ProductionDb | null = null;

export function getProductionDb(): ProductionDb {
  if (!productionDbInstance) productionDbInstance = new ProductionDb();
  return productionDbInstance;
}

export function closeProductionDb(): void {
  productionDbInstance?.close();
  productionDbInstance = null;
}
