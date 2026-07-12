import { getUniverseCatalog } from './catalog-db.js';
import { buildLibraryUrl, buildThumbnailUrl } from './paths.js';
import type { CacheLookupResult, UniverseSearchQuery } from './types.js';
import { prepareMidjourneyPrompt } from './midjourney-workflow.js';

export class PhotoCacheService {
  /** Cache-first lookup — hit returns existing photo, miss returns MJ prompt suggestion */
  lookup(query: UniverseSearchQuery): CacheLookupResult {
    const catalog = getUniverseCatalog();
    const results = catalog.searchFlexible({
      ...query,
      minQuality: query.minQuality ?? 55,
      limit: 1,
    });

    if (results.length > 0) {
      const photo = results[0]!;
      catalog.incrementUsedCount(photo.contentHash);
      const base = process.env.PUBLIC_BASE_URL;
      return {
        hit: true,
        photo: {
          photo,
          url: buildLibraryUrl(photo.relativePath, base),
          thumbnailUrl: photo.thumbnailPath
            ? buildThumbnailUrl(photo.thumbnailPath, base)
            : buildLibraryUrl(photo.relativePath, base),
          cacheHit: true,
        },
      };
    }

    const location = query.location ?? query.category ?? 'cafe';
    const suggestedPrompt = prepareMidjourneyPrompt({
      characterSlug: query.character,
      category: location,
      emotion: query.emotion,
      time: query.time,
      weather: query.weather,
    });

    return { hit: false, suggestedPrompt };
  }

  search(query: UniverseSearchQuery) {
    const catalog = getUniverseCatalog();
    return catalog.searchFlexible(query).map((photo) => ({
      photo,
      url: buildLibraryUrl(photo.relativePath),
      thumbnailUrl: photo.thumbnailPath
        ? buildThumbnailUrl(photo.thumbnailPath)
        : buildLibraryUrl(photo.relativePath),
      cacheHit: true,
    }));
  }

  getStats() {
    return getUniverseCatalog().getStats();
  }
}

export const photoCacheService = new PhotoCacheService();
