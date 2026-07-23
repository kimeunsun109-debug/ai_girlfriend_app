/**
 * Map free-form catalog / factory fields onto Photo Universe enums.
 */
import type { PhotoEmotion } from '../photo-catalog/types.js';
import type {
  GeneratedBy,
  UniverseCamera,
  UniverseSeason,
  UniverseWeather,
} from '../photo-universe/types.js';

export function mapEmotion(raw: string): PhotoEmotion {
  const v = raw.toLowerCase();
  if (/(happy|smile|laugh|joy|신나|행복|웃음)/.test(v)) return 'happy';
  if (/(sad|우울|눈물)/.test(v)) return 'sad';
  if (/(sleep|sleepy|drowsy)/.test(v)) return 'sleepy';
  if (/(excit|신남|설렘)/.test(v)) return 'excited';
  if (/(shy|수줍|부끄)/.test(v)) return 'shy';
  if (/(tired|피곤)/.test(v)) return 'tired';
  if (/(lov|애정|다정|caring)/.test(v)) return 'loving';
  return 'neutral';
}

export function mapWeather(raw: string): UniverseWeather {
  const v = raw.toLowerCase();
  if (/(rain|비)/.test(v)) return 'rainy';
  if (/(snow|눈)/.test(v)) return 'snowy';
  if (/(cloud|흐림)/.test(v)) return 'cloudy';
  if (/(overcast|흐린)/.test(v)) return 'overcast';
  if (/(indoor|실내|cafe|집|bedroom|office)/.test(v)) return 'indoor';
  if (/(sun|맑|clear)/.test(v)) return 'sunny';
  return 'indoor';
}

export function mapSeason(raw: string): UniverseSeason {
  const v = raw.toLowerCase();
  if (/(winter|겨울)/.test(v)) return 'winter';
  if (/(autumn|fall|가을)/.test(v)) return 'autumn';
  if (/(summer|여름)/.test(v)) return 'summer';
  return 'spring';
}

export function mapCamera(raw: string): UniverseCamera {
  const v = raw.toLowerCase();
  if (/(mirror)/.test(v)) return 'mirror selfie';
  if (/(friend|someone took)/.test(v)) return 'friend took photo';
  if (/(candid)/.test(v)) return 'candid';
  if (/(portrait)/.test(v)) return 'iphone portrait';
  return 'iphone selfie';
}

export function mapGeneratedBy(engineId: string): GeneratedBy {
  const v = engineId.toLowerCase();
  if (v.includes('midjourney') || v === 'mj') return 'Midjourney';
  if (v.includes('flux')) return 'flux';
  if (v.includes('sdxl')) return 'sdxl';
  if (v.includes('comfy') || v.includes('a1111') || v === 'stub') return 'local_ai';
  return 'local_ai';
}
