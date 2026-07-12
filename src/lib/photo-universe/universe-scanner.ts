import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { SUPPORTED_EXTENSIONS } from '../photo-catalog/types.js';
import { PHOTO_LIBRARY_ROOT, PHOTO_UNIVERSE_PATHS } from '../../config/photo-universe.config.js';
import { getUniverseCatalog } from './catalog-db.js';
import { buildUniverseMetadata, metaToSidecarJson } from './metadata-builder.js';
import { ensureUniverseDirs, isLibraryAvailable, libraryRelativePath } from './paths.js';
import { inspectImageQuality } from './quality-inspector.js';
import { generateThumbnail, readSidecarMeta, writeSidecarMeta } from './thumbnail-service.js';
import { hashFileContent } from '../photo-catalog/image-validator.js';
import type { UniverseScanStats } from './types.js';

export class UniverseScanner {
  async scanLibrary(options: { full?: boolean } = {}): Promise<UniverseScanStats> {
    ensureUniverseDirs();
    const stats: UniverseScanStats = {
      scanned: 0,
      registered: 0,
      updated: 0,
      duplicate: 0,
      rejected: 0,
      skipped: 0,
      byCharacter: {},
    };

    if (!isLibraryAvailable()) {
      console.warn(`Photo library not found: ${PHOTO_LIBRARY_ROOT}`);
      return stats;
    }

    const catalog = getUniverseCatalog();
    const perceptualMap = options.full ? new Map<string, string>() : catalog.getAllPerceptualHashes();
    const files = this.collectImageFiles(PHOTO_LIBRARY_ROOT);

    for (const absolutePath of files) {
      stats.scanned++;
      const rel = libraryRelativePath(absolutePath);

      if (rel.startsWith('_') || rel.includes('/_')) {
        stats.skipped++;
        continue;
      }

      const existing = catalog.findByContentHash(hashFileContent(absolutePath));
      if (existing && !options.full) {
        stats.skipped++;
        continue;
      }

      const quality = await inspectImageQuality(absolutePath, perceptualMap);
      if (!quality.passed) {
        stats.rejected++;
        this.logRejected(rel, quality.rejectReasons);
        continue;
      }

      if (quality.duplicateOf) {
        stats.duplicate++;
        continue;
      }

      const meta = buildUniverseMetadata({
        absolutePath,
        universeId: existing?.universeId ?? catalog.getNextUniverseId(
          rel.split('/')[0] ?? 'yuna'
        ),
        quality,
      });

      if (!meta) {
        stats.skipped++;
        continue;
      }

      if (!readSidecarMeta(absolutePath)) {
        writeSidecarMeta(absolutePath, metaToSidecarJson(meta));
      }

      try {
        meta.thumbnailPath = await generateThumbnail(absolutePath, meta.relativePath);
      } catch (err) {
        console.warn('Thumbnail failed:', rel, (err as Error).message);
      }

      const action = catalog.upsertPhoto(meta);
      perceptualMap.set(meta.universeId, meta.perceptualHash);

      if (action === 'insert') {
        stats.registered++;
        stats.byCharacter[meta.character] = (stats.byCharacter[meta.character] ?? 0) + 1;
      } else {
        stats.updated++;
      }
    }

    catalog.syncJsonIndexes();
    return stats;
  }

  async ingestFile(absolutePath: string): Promise<'registered' | 'duplicate' | 'rejected' | 'skipped'> {
    if (!existsSync(absolutePath)) return 'skipped';
    const ext = extname(absolutePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return 'skipped';

    const catalog = getUniverseCatalog();
    const hash = hashFileContent(absolutePath);
    if (catalog.findByContentHash(hash)) return 'duplicate';

    const quality = await inspectImageQuality(absolutePath, catalog.getAllPerceptualHashes());
    if (!quality.passed) {
      this.logRejected(libraryRelativePath(absolutePath), quality.rejectReasons);
      return 'rejected';
    }

    const rel = libraryRelativePath(absolutePath);
    const meta = buildUniverseMetadata({
      absolutePath,
      universeId: catalog.getNextUniverseId(rel.split('/')[0] ?? 'yuna'),
      quality,
    });
    if (!meta) return 'skipped';

    writeSidecarMeta(absolutePath, metaToSidecarJson(meta));
    meta.thumbnailPath = await generateThumbnail(absolutePath, meta.relativePath);
    catalog.upsertPhoto(meta);
    catalog.syncJsonIndexes();
    return 'registered';
  }

  private collectImageFiles(dir: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;

    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...this.collectImageFiles(full));
      } else {
        const ext = extname(entry).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) results.push(full);
      }
    }
    return results;
  }

  private logRejected(relativePath: string, reasons: string[]): void {
    mkdirSync(PHOTO_UNIVERSE_PATHS.rejected, { recursive: true });
    const logPath = join(PHOTO_UNIVERSE_PATHS.rejected, 'rejected-log.json');
    let log: Array<{ path: string; reasons: string[]; at: string }> = [];
    if (existsSync(logPath)) {
      try {
        log = JSON.parse(readFileSync(logPath, 'utf-8'));
      } catch {
        log = [];
      }
    }
    log.push({ path: relativePath, reasons, at: new Date().toISOString() });
    if (log.length > 5000) log = log.slice(-5000);
    writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
    appendFileSync(
      join(PHOTO_UNIVERSE_PATHS.rejected, 'rejected.log'),
      `${new Date().toISOString()}\t${relativePath}\t${reasons.join(',')}\n`
    );
  }
}

export const universeScanner = new UniverseScanner();

export function printScanReport(stats: UniverseScanStats): void {
  console.log('\n====================================');
  console.log('Photo Universe Scan Complete');
  console.log('====================================\n');
  console.log(`Library   : ${PHOTO_LIBRARY_ROOT}`);
  console.log(`Scanned   : ${stats.scanned}`);
  console.log(`Registered: ${stats.registered}`);
  console.log(`Updated   : ${stats.updated}`);
  console.log(`Duplicate : ${stats.duplicate}`);
  console.log(`Rejected  : ${stats.rejected}`);
  console.log(`Skipped   : ${stats.skipped}`);
  for (const [slug, count] of Object.entries(stats.byCharacter)) {
    console.log(`  ${slug}: +${count}`);
  }
  console.log('====================================\n');
}
