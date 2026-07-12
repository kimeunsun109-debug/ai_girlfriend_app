import { join } from 'path';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import type { CharacterPhotoIndex } from '../photo-catalog/types.js';
import { CHARACTER_SLUG_MAP } from '../photo-catalog/types.js';
import { characterIndexPath, ensureUniverseDirs } from './paths.js';
import type { UniversePhotoMeta, UniverseSearchQuery } from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  universe_id TEXT UNIQUE NOT NULL,
  character TEXT NOT NULL,
  character_id TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  time TEXT,
  weather TEXT,
  season TEXT,
  emotion TEXT NOT NULL,
  pose TEXT,
  camera TEXT,
  lighting TEXT,
  outfit TEXT,
  generated_by TEXT NOT NULL DEFAULT 'Midjourney',
  prompt TEXT,
  negative_prompt TEXT,
  content_hash TEXT UNIQUE NOT NULL,
  perceptual_hash TEXT NOT NULL,
  relative_path TEXT UNIQUE NOT NULL,
  absolute_path TEXT NOT NULL,
  thumbnail_path TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  quality_score REAL NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_photos_character ON photos(character);
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(character, location);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(character, category);
CREATE INDEX IF NOT EXISTS idx_photos_emotion ON photos(character, emotion);
CREATE INDEX IF NOT EXISTS idx_photos_time ON photos(character, time);
CREATE INDEX IF NOT EXISTS idx_photos_weather ON photos(character, weather);
CREATE INDEX IF NOT EXISTS idx_photos_quality ON photos(quality_score);
CREATE INDEX IF NOT EXISTS idx_photos_perceptual ON photos(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_photos_content ON photos(content_hash);

CREATE TABLE IF NOT EXISTS character_counters (
  character TEXT PRIMARY KEY,
  next_seq INTEGER NOT NULL DEFAULT 1
);
`;

export class UniverseCatalogDb {
  private db: Database.Database;

  constructor(dbPath = PHOTO_UNIVERSE_PATHS.catalogDb) {
    ensureUniverseDirs();
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  getNextUniverseId(character: string): string {
    const row = this.db
      .prepare('SELECT next_seq FROM character_counters WHERE character = ?')
      .get(character) as { next_seq: number } | undefined;

    const seq = row?.next_seq ?? 1;
    this.db
      .prepare(
        `INSERT INTO character_counters (character, next_seq) VALUES (?, ?)
         ON CONFLICT(character) DO UPDATE SET next_seq = excluded.next_seq`
      )
      .run(character, seq + 1);

    return `${character}_${String(seq).padStart(6, '0')}`;
  }

  findByContentHash(hash: string): UniversePhotoMeta | null {
    const row = this.db.prepare('SELECT * FROM photos WHERE content_hash = ?').get(hash) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToMeta(row) : null;
  }

  getAllPerceptualHashes(): Map<string, string> {
    const rows = this.db.prepare('SELECT universe_id, perceptual_hash FROM photos').all() as Array<{
      universe_id: string;
      perceptual_hash: string;
    }>;
    return new Map(rows.map((r) => [r.universe_id, r.perceptual_hash]));
  }

  upsertPhoto(meta: UniversePhotoMeta): 'insert' | 'update' {
    const existing = this.db
      .prepare('SELECT id FROM photos WHERE content_hash = ?')
      .get(meta.contentHash);

    const data = this.metaToRow(meta);
    if (existing) {
      this.db
        .prepare(
          `UPDATE photos SET
            location=?, category=?, time=?, weather=?, season=?, emotion=?,
            pose=?, camera=?, lighting=?, outfit=?, prompt=?, negative_prompt=?,
            perceptual_hash=?, thumbnail_path=?, tags=?, quality_score=?,
            imported_at=?, status='ACTIVE'
           WHERE content_hash=?`
        )
        .run(
          data.location, data.category, data.time, data.weather, data.season, data.emotion,
          data.pose, data.camera, data.lighting, data.outfit, data.prompt, data.negative_prompt,
          data.perceptual_hash, data.thumbnail_path, data.tags, data.quality_score,
          data.imported_at, meta.contentHash
        );
      return 'update';
    }

    this.db
      .prepare(
        `INSERT INTO photos (
          id, universe_id, character, character_id, location, category, time, weather, season,
          emotion, pose, camera, lighting, outfit, generated_by, prompt, negative_prompt,
          content_hash, perceptual_hash, relative_path, absolute_path, thumbnail_path,
          tags, quality_score, favorite, used_count, created_at, imported_at, status
        ) VALUES (
          @id, @universe_id, @character, @character_id, @location, @category, @time, @weather, @season,
          @emotion, @pose, @camera, @lighting, @outfit, @generated_by, @prompt, @negative_prompt,
          @content_hash, @perceptual_hash, @relative_path, @absolute_path, @thumbnail_path,
          @tags, @quality_score, @favorite, @used_count, @created_at, @imported_at, @status
        )`
      )
      .run(data);
    return 'insert';
  }

  search(query: UniverseSearchQuery): UniversePhotoMeta[] {
    const conditions: string[] = ["status = 'ACTIVE'", 'character = @character'];
    const params: Record<string, unknown> = { character: query.character };

    const location = query.location ?? query.category;
    if (location) {
      conditions.push('(location = @location OR category = @location)');
      params.location = location;
    }
    if (query.time) {
      conditions.push('time = @time');
      params.time = query.time;
    }
    if (query.weather) {
      conditions.push('weather = @weather');
      params.weather = query.weather;
    }
    if (query.emotion) {
      conditions.push('emotion = @emotion');
      params.emotion = query.emotion;
    }
    if (query.outfit) {
      conditions.push('outfit LIKE @outfit');
      params.outfit = `%${query.outfit}%`;
    }
    if (query.camera) {
      conditions.push('camera = @camera');
      params.camera = query.camera;
    }
    if (query.season) {
      conditions.push('season = @season');
      params.season = query.season;
    }
    if (query.minQuality) {
      conditions.push('quality_score >= @minQuality');
      params.minQuality = query.minQuality;
    }
    if (query.excludeHashes?.length) {
      const placeholders = query.excludeHashes.map((_, i) => `@ex${i}`).join(',');
      conditions.push(`content_hash NOT IN (${placeholders})`);
      query.excludeHashes.forEach((h, i) => {
        params[`ex${i}`] = h;
      });
    }

    const limit = query.limit ?? 20;
    const sql = `
      SELECT * FROM photos
      WHERE ${conditions.join(' AND ')}
      ORDER BY quality_score DESC, used_count ASC, RANDOM()
      LIMIT ${limit}
    `;
    const rows = this.db.prepare(sql).all(params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToMeta(r));
  }

  searchFlexible(query: UniverseSearchQuery): UniversePhotoMeta[] {
    const strict = this.search(query);
    if (strict.length > 0) return strict;

    const relaxed = { ...query };
    delete relaxed.emotion;
    delete relaxed.weather;
    delete relaxed.time;
    const loc = relaxed.location ?? relaxed.category;
    if (loc) return this.search({ ...relaxed, location: loc, limit: query.limit ?? 10 });

    return this.search({ character: query.character, limit: query.limit ?? 5 });
  }

  incrementUsedCount(contentHash: string): void {
    this.db
      .prepare('UPDATE photos SET used_count = used_count + 1 WHERE content_hash = ?')
      .run(contentHash);
  }

  getStats(): {
    total: number;
    byCharacter: Record<string, number>;
    byLocation: Record<string, number>;
    rejected: number;
  } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM photos WHERE status = ?').get('ACTIVE') as { c: number }).c;
    const byChar = this.db
      .prepare('SELECT character, COUNT(*) as c FROM photos WHERE status = ? GROUP BY character')
      .all('ACTIVE') as Array<{ character: string; c: number }>;
    const byLoc = this.db
      .prepare('SELECT location, COUNT(*) as c FROM photos WHERE status = ? GROUP BY location ORDER BY c DESC LIMIT 30')
      .all('ACTIVE') as Array<{ location: string; c: number }>;

    let rejected = 0;
    if (existsSync(PHOTO_UNIVERSE_PATHS.rejected)) {
      try {
        const log = JSON.parse(readFileSync(joinRejectedLog(), 'utf-8')) as unknown[];
        rejected = Array.isArray(log) ? log.length : 0;
      } catch {
        rejected = 0;
      }
    }

    return {
      total,
      byCharacter: Object.fromEntries(byChar.map((r) => [r.character, r.c])),
      byLocation: Object.fromEntries(byLoc.map((r) => [r.location, r.c])),
      rejected,
    };
  }

  exportCharacterIndex(character: string): CharacterPhotoIndex {
    const rows = this.db
      .prepare('SELECT * FROM photos WHERE character = ? AND status = ? ORDER BY imported_at')
      .all(character, 'ACTIVE') as Record<string, unknown>[];
    const charInfo = CHARACTER_SLUG_MAP[character];
    const photos = rows.map((r) => {
      const m = this.rowToMeta(r);
      return {
        id: m.id,
        character: m.character,
        category: m.category,
        emotion: m.emotion,
        tags: m.tags,
        filename: m.filename,
        relativePath: m.relativePath,
        contentHash: m.contentHash,
        importedAt: m.importedAt,
      };
    });

    return {
      character,
      characterId: charInfo?.id ?? '',
      updatedAt: new Date().toISOString(),
      totalCount: photos.length,
      photos,
    };
  }

  syncJsonIndexes(): void {
    for (const slug of Object.keys(CHARACTER_SLUG_MAP)) {
      const index = this.exportCharacterIndex(slug);
      const path = characterIndexPath(slug);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(index, null, 2), 'utf-8');
    }
  }

  private metaToRow(meta: UniversePhotoMeta) {
    const charInfo = CHARACTER_SLUG_MAP[meta.character];
    return {
      id: meta.id,
      universe_id: meta.universeId,
      character: meta.character,
      character_id: charInfo?.id ?? '',
      location: meta.location,
      category: meta.category,
      time: meta.time,
      weather: meta.weather,
      season: meta.season,
      emotion: meta.emotion,
      pose: meta.pose,
      camera: meta.camera,
      lighting: meta.lighting,
      outfit: meta.outfit,
      generated_by: meta.generatedBy,
      prompt: meta.prompt ?? null,
      negative_prompt: meta.negativePrompt ?? null,
      content_hash: meta.contentHash,
      perceptual_hash: meta.perceptualHash,
      relative_path: meta.relativePath,
      absolute_path: meta.absolutePath ?? '',
      thumbnail_path: meta.thumbnailPath ?? null,
      tags: JSON.stringify(meta.tags),
      quality_score: meta.qualityScore,
      favorite: meta.favorite ? 1 : 0,
      used_count: meta.usedCount,
      created_at: meta.createdAt,
      imported_at: meta.importedAt,
      status: 'ACTIVE',
    };
  }

  private rowToMeta(row: Record<string, unknown>): UniversePhotoMeta {
    return {
      id: row.id as string,
      universeId: row.universe_id as string,
      character: row.character as string,
      category: row.category as string,
      location: row.location as string,
      emotion: row.emotion as UniversePhotoMeta['emotion'],
      tags: JSON.parse((row.tags as string) ?? '[]'),
      filename: (row.relative_path as string).split('/').pop() ?? '',
      relativePath: row.relative_path as string,
      contentHash: row.content_hash as string,
      importedAt: row.imported_at as string,
      time: (row.time as UniversePhotoMeta['time']) ?? 'afternoon',
      weather: (row.weather as UniversePhotoMeta['weather']) ?? 'indoor',
      season: (row.season as UniversePhotoMeta['season']) ?? 'spring',
      pose: (row.pose as string) ?? '',
      camera: (row.camera as UniversePhotoMeta['camera']) ?? 'iphone selfie',
      lighting: (row.lighting as string) ?? 'natural',
      outfit: (row.outfit as string) ?? '',
      generatedBy: (row.generated_by as UniversePhotoMeta['generatedBy']) ?? 'Midjourney',
      prompt: (row.prompt as string) ?? undefined,
      negativePrompt: (row.negative_prompt as string) ?? undefined,
      createdAt: row.created_at as string,
      favorite: Boolean(row.favorite),
      usedCount: row.used_count as number,
      qualityScore: row.quality_score as number,
      perceptualHash: row.perceptual_hash as string,
      absolutePath: row.absolute_path as string,
      thumbnailPath: (row.thumbnail_path as string) ?? undefined,
    };
  }
}

function joinRejectedLog(): string {
  return join(PHOTO_UNIVERSE_PATHS.rejected, 'rejected-log.json');
}

let catalogInstance: UniverseCatalogDb | null = null;

export function getUniverseCatalog(): UniverseCatalogDb {
  if (!catalogInstance) catalogInstance = new UniverseCatalogDb();
  return catalogInstance;
}

export function closeUniverseCatalog(): void {
  catalogInstance?.close();
  catalogInstance = null;
}
