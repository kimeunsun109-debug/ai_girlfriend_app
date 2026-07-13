import type Database from 'better-sqlite3';

/** Production pipeline columns on the shared `photos` table */
const PHOTO_PRODUCTION_COLUMNS: Array<{ name: string; sql: string }> = [
  { name: 'face_similarity', sql: 'ALTER TABLE photos ADD COLUMN face_similarity REAL' },
  { name: 'face_verified', sql: 'ALTER TABLE photos ADD COLUMN face_verified INTEGER DEFAULT 0' },
  { name: 'review_status', sql: "ALTER TABLE photos ADD COLUMN review_status TEXT DEFAULT 'PENDING'" },
  { name: 'prompt_id', sql: 'ALTER TABLE photos ADD COLUMN prompt_id TEXT' },
  { name: 'queue_job_id', sql: 'ALTER TABLE photos ADD COLUMN queue_job_id TEXT' },
  { name: 'noise_score', sql: 'ALTER TABLE photos ADD COLUMN noise_score REAL' },
  { name: 'face_count', sql: 'ALTER TABLE photos ADD COLUMN face_count INTEGER' },
];

export function applyPhotoProductionMigrations(db: Database.Database): void {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='photos'")
    .get() as { name: string } | undefined;
  if (!table) return;

  const existing = new Set(
    (db.prepare('PRAGMA table_info(photos)').all() as Array<{ name: string }>).map((c) => c.name)
  );
  for (const col of PHOTO_PRODUCTION_COLUMNS) {
    if (!existing.has(col.name)) {
      db.exec(col.sql);
      existing.add(col.name);
    }
  }
}
