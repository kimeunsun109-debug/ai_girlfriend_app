/**
 * PickMeTalk Photo Universe — external library + catalog configuration
 * Images live on USB (PHOTO_LIBRARY_ROOT). Project stores metadata, indexes, cache only.
 */
import { join } from 'path';

/** USB / external photo library root (Windows default) */
export const PHOTO_LIBRARY_ROOT =
  process.env.PHOTO_LIBRARY_ROOT ??
  process.env.PICKMETALK_PHOTO_LIBRARY ??
  'D:/PickMeTalk_PhotoLibrary';

/** Project-side universe data (indexes, SQLite, thumbnails) */
export const PHOTO_UNIVERSE_DATA_ROOT =
  process.env.PHOTO_UNIVERSE_DATA_ROOT ?? join(process.cwd(), 'data', 'photo-universe');

export const PHOTO_UNIVERSE_PATHS = {
  catalogDb: join(PHOTO_UNIVERSE_DATA_ROOT, 'catalog.db'),
  thumbnails: join(PHOTO_UNIVERSE_DATA_ROOT, 'cache', 'thumbnails'),
  indexes: join(PHOTO_UNIVERSE_DATA_ROOT, 'indexes'),
  rejected: join(PHOTO_UNIVERSE_DATA_ROOT, 'rejected'),
  watchState: join(PHOTO_UNIVERSE_DATA_ROOT, 'watch-state.json'),
} as const;

/** Enable universe catalog for photo selection (vs legacy assets/photos) */
export const PHOTO_UNIVERSE_ENABLED =
  process.env.PHOTO_UNIVERSE_ENABLED === '1' ||
  process.env.PHOTO_UNIVERSE_ENABLED === 'true';

/** Quality thresholds */
export const UNIVERSE_QUALITY = {
  /** Minimum shortest edge in pixels */
  minShortEdge: Number(process.env.UNIVERSE_MIN_SHORT_EDGE ?? 720),
  /** Minimum quality score 0–100 to accept */
  minQualityScore: Number(process.env.UNIVERSE_MIN_QUALITY ?? 55),
  /** Laplacian variance below this = too blurry */
  minBlurVariance: Number(process.env.UNIVERSE_MIN_BLUR ?? 80),
  /** Max hamming distance for perceptual duplicate (0–64) */
  maxPerceptualDuplicateDistance: Number(process.env.UNIVERSE_DHASH_DISTANCE ?? 6),
  /** Max file size (50MB) */
  maxFileBytes: 50 * 1024 * 1024,
} as const;

/** Watcher debounce ms */
export const UNIVERSE_WATCH_DEBOUNCE_MS = Number(process.env.UNIVERSE_WATCH_DEBOUNCE_MS ?? 1500);

/** Midjourney workflow — identity consistency suffix appended to prompts in docs/CLI */
export const MIDJOURNEY_IDENTITY_SUFFIX =
  '--style raw --ar 3:4 --v 6.1 --no cartoon, illustration, anime, 3d render, plastic skin, deformed face, extra fingers';

/** Folder names for Midjourney download drop zone (auto-ingest) */
export const MIDJOURNEY_INBOX_FOLDER = '_inbox';

/** Supported location folder slugs (maps to prompt catalog + Living AI) */
export const UNIVERSE_LOCATION_SLUGS = [
  'wake', 'brush_teeth', 'dry_hair', 'coffee', 'commute', 'subway', 'office', 'lunch',
  'leave', 'convenience', 'mart', 'cafe', 'home', 'drive', 'gym', 'pilates', 'walk',
  'shopping', 'travel', 'beach', 'camping', 'cherry', 'autumn', 'rain', 'snow',
  'cooking', 'movie', 'game', 'reading', 'selfie', 'mirror', 'bed', 'sleep', 'late_snack',
  'birthday', 'christmas', 'valentine', 'newyear', 'sick', 'hospital', 'date', 'friends',
  'dog', 'cat', 'hair', 'nail', 'tteokbokki', 'alcohol', 'morning', 'weekend', 'overtime',
  'exercise', 'dessert', 'happy', 'sad', 'bar', 'food', 'study', 'work',
] as const;

export type UniverseLocationSlug = (typeof UNIVERSE_LOCATION_SLUGS)[number];
