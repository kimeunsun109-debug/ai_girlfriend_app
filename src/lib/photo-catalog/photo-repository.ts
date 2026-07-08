import { randomUUID } from 'crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, extname, join, relative } from 'path';
import { PrismaClient, PhotoCategory } from '@prisma/client';
import {
  classifyFromPath,
  prismaCategoryToSlug,
} from './category-mapper.js';
import { hashFileContent, isValidImageFile } from './image-validator.js';
import {
  PHOTOS_ROOT,
  buildPhotoUrl,
  loadCharacterIndex,
  saveCharacterIndex,
  writePhotoMeta,
} from './index-manager.js';
import {
  CHARACTER_SLUG_MAP,
  SUPPORTED_EXTENSIONS,
  type CharacterPhotoIndex,
  type ImportStats,
  type PhotoEmotion,
  type PhotoMeta,
  resolveCharacterSlug,
} from './types.js';

const prisma = new PrismaClient();

export interface SelectPhotoQuery {
  characterSlug: string;
  categorySlug: string;
  emotion?: PhotoEmotion;
  excludeHashes?: string[];
}

export class PhotoCatalogRepository {
  private indexCache = new Map<string, CharacterPhotoIndex>();

  getIndex(characterSlug: string): CharacterPhotoIndex | null {
    if (!this.indexCache.has(characterSlug)) {
      const index = loadCharacterIndex(characterSlug);
      if (index) this.indexCache.set(characterSlug, index);
    }
    return this.indexCache.get(characterSlug) ?? loadCharacterIndex(characterSlug);
  }

  clearCache(): void {
    this.indexCache.clear();
  }

  /** Import/migrate 후 또는 테스트용 인덱스 등록 */
  registerIndex(index: CharacterPhotoIndex): void {
    this.indexCache.set(index.character, index);
  }

  /** 캐릭터 + 상황(category) + 감정(emotion) 기반 사진 선택 */
  selectPhoto(query: SelectPhotoQuery): PhotoMeta | null {
    const index = this.getIndex(query.characterSlug);
    if (!index || index.photos.length === 0) return null;

    const exclude = new Set(query.excludeHashes ?? []);
    const pool = index.photos.filter((p) => !exclude.has(p.contentHash));

    const byCategoryAndEmotion = pool.filter(
      (p) => p.category === query.categorySlug && (!query.emotion || p.emotion === query.emotion)
    );
    if (byCategoryAndEmotion.length > 0) {
      return byCategoryAndEmotion[Math.floor(Math.random() * byCategoryAndEmotion.length)];
    }

    const byCategory = pool.filter((p) => p.category === query.categorySlug);
    if (byCategory.length > 0) {
      return byCategory[Math.floor(Math.random() * byCategory.length)];
    }

    return null;
  }

  selectWithFallback(
    characterSlug: string,
    categorySlug: string,
    emotion: PhotoEmotion,
    excludeHashes: string[] = [],
    fallbackSlugs: string[] = []
  ): PhotoMeta | null {
    const direct = this.selectPhoto({ characterSlug, categorySlug, emotion, excludeHashes });
    if (direct) return direct;

    for (const slug of fallbackSlugs) {
      const found = this.selectPhoto({ characterSlug, categorySlug: slug, excludeHashes });
      if (found) return found;
    }

    return this.selectPhoto({ characterSlug, categorySlug, excludeHashes });
  }

  getPhotoById(characterSlug: string, photoId: string): PhotoMeta | null {
    const index = this.getIndex(characterSlug);
    return index?.photos.find((p) => p.id === photoId) ?? null;
  }
}

export class PhotoImportService {
  async importFromDirectory(sourceDir: string): Promise<ImportStats> {
    const stats: ImportStats = {
      byCharacter: {},
      duplicate: 0,
      skipped: 0,
      corrupt: 0,
      unsupported: 0,
      totalImported: 0,
    };

    const globalHashes = new Set<string>();
    for (const slug of Object.keys(CHARACTER_SLUG_MAP)) {
      const existing = loadCharacterIndex(slug);
      existing?.photos.forEach((p) => globalHashes.add(p.contentHash));
    }

    const files = this.collectFiles(sourceDir);
    const indexes = new Map<string, CharacterPhotoIndex>();

    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        stats.unsupported++;
        continue;
      }

      if (!isValidImageFile(filePath)) {
        stats.corrupt++;
        stats.skipped++;
        continue;
      }

      const relToSource = relative(sourceDir, filePath);
      const characterSlug = this.resolveCharacterFromPath(relToSource, basename(filePath));
      if (!characterSlug) {
        stats.skipped++;
        continue;
      }

      const contentHash = hashFileContent(filePath);
      if (globalHashes.has(contentHash)) {
        stats.duplicate++;
        continue;
      }

      const classified = classifyFromPath(relToSource);
      const destFilename = `${contentHash}${ext}`;
      const relativePath = `${characterSlug}/${classified.categorySlug}/${destFilename}`;
      const destPath = join(PHOTOS_ROOT, relativePath);

      mkdirSync(join(PHOTOS_ROOT, characterSlug, classified.categorySlug), { recursive: true });
      copyFileSync(filePath, destPath);

      const charInfo = CHARACTER_SLUG_MAP[characterSlug];
      const meta: PhotoMeta = {
        id: randomUUID(),
        character: characterSlug,
        category: classified.categorySlug,
        emotion: classified.emotion,
        tags: classified.tags,
        filename: destFilename,
        relativePath,
        contentHash,
        importedAt: new Date().toISOString(),
      };

      writePhotoMeta(meta);
      globalHashes.add(contentHash);

      if (!indexes.has(characterSlug)) {
        const existing = loadCharacterIndex(characterSlug);
        indexes.set(characterSlug, existing ?? {
          character: characterSlug,
          characterId: charInfo.id,
          updatedAt: new Date().toISOString(),
          totalCount: 0,
          photos: [],
        });
      }
      indexes.get(characterSlug)!.photos.push(meta);

      stats.byCharacter[characterSlug] = (stats.byCharacter[characterSlug] ?? 0) + 1;
      stats.totalImported++;
    }

    for (const [slug, index] of indexes) {
      const existing = loadCharacterIndex(slug);
      if (existing) {
        index.photos = [...existing.photos, ...index.photos.filter(
          (np) => !existing.photos.some((ep) => ep.contentHash === np.contentHash)
        )];
      }
      index.totalCount = index.photos.length;
      saveCharacterIndex(index);
      photoCatalogRepository.registerIndex(index);
      if (process.env.PHOTOS_SKIP_DB_SYNC !== '1') {
        try {
          await this.syncIndexToDatabase(index);
        } catch (err) {
          console.warn(`DB sync skipped for ${slug}:`, (err as Error).message);
        }
      }
    }

    return stats;
  }

  private async syncIndexToDatabase(index: CharacterPhotoIndex): Promise<void> {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

    for (const photo of index.photos) {
      const classified = classifyFromPath(photo.relativePath);
      const existing = await prisma.characterPhoto.findFirst({
        where: { characterId: index.characterId, contentHash: photo.contentHash },
      });
      if (existing) continue;

      await prisma.characterPhoto.create({
        data: {
          id: photo.id,
          characterId: index.characterId,
          url: buildPhotoUrl(photo.relativePath, baseUrl),
          thumbnailUrl: buildPhotoUrl(photo.relativePath, baseUrl),
          category: classified.prismaCategory,
          categorySlug: photo.category,
          relativePath: photo.relativePath,
          emotion: photo.emotion,
          tags: photo.tags,
          expression: photo.emotion,
          contentHash: photo.contentHash,
          status: 'ACTIVE',
        },
      });
    }
  }

  private collectFiles(dir: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;

    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...this.collectFiles(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  private resolveCharacterFromPath(relativePath: string, filename: string): string | null {
    const parts = relativePath.replace(/\\/g, '/').split('/');
    for (const part of parts) {
      const slug = resolveCharacterSlug(part);
      if (slug) return slug;
    }
    return resolveCharacterSlug(filename);
  }
}

export function printImportReport(stats: ImportStats): void {
  console.log('\n====================================');
  console.log('Import Complete');
  console.log('====================================\n');

  const labels: Record<string, string> = {
    yuna: 'Yuna',
    narin: 'Narin',
    yunseo: 'Yunseo',
    eunha: 'Eunha',
    jiyu: 'Jiyu',
  };

  for (const [slug, label] of Object.entries(labels)) {
    const count = stats.byCharacter[slug] ?? 0;
    if (count > 0 || Object.keys(stats.byCharacter).length === 0) {
      console.log(`${label.padEnd(8)}: ${count}장`);
    }
  }

  console.log(`\nDuplicate : ${stats.duplicate}장`);
  console.log(`Skipped   : ${stats.skipped}장`);
  if (stats.corrupt > 0) console.log(`Corrupt   : ${stats.corrupt}장`);
  if (stats.unsupported > 0) console.log(`Unsupported: ${stats.unsupported}장`);
  console.log(`\nTotal Imported : ${stats.totalImported}장`);
  console.log('====================================\n');
}

export const photoCatalogRepository = new PhotoCatalogRepository();
