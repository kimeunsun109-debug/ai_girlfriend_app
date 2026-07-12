/**
 * 사진 카탈로그 타입 — 장기 운영용 메타데이터 스키마
 */

export type PhotoEmotion =
  | 'happy'
  | 'sad'
  | 'sleepy'
  | 'neutral'
  | 'excited'
  | 'shy'
  | 'tired'
  | 'loving';

export interface PhotoMeta {
  id: string;
  character: string;
  category: string;
  emotion: PhotoEmotion;
  tags: string[];
  filename: string;
  relativePath: string;
  contentHash: string;
  importedAt: string;
}

export interface CharacterPhotoIndex {
  character: string;
  characterId: string;
  updatedAt: string;
  totalCount: number;
  photos: PhotoMeta[];
}

export interface ImportStats {
  byCharacter: Record<string, number>;
  duplicate: number;
  skipped: number;
  corrupt: number;
  unsupported: number;
  totalImported: number;
}

export const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export const CHARACTER_SLUG_MAP: Record<string, { slug: string; id: string; names: string[] }> = {
  yuna: {
    slug: 'yuna',
    id: '00000000-0000-0000-0000-000000000001',
    names: ['yuna', '유나', '윤아'],
  },
  narin: {
    slug: 'narin',
    id: '00000000-0000-0000-0000-000000000002',
    names: ['narin', '나린', '나리'],
  },
  yunseo: {
    slug: 'yunseo',
    id: '00000000-0000-0000-0000-000000000003',
    names: ['yunseo', '윤서', '윤세'],
  },
  eunha: {
    slug: 'eunha',
    id: '00000000-0000-0000-0000-000000000004',
    names: ['eunha', '은하'],
  },
  jiyu: {
    slug: 'jiyu',
    id: '00000000-0000-0000-0000-000000000005',
    names: ['jiyu', '지유', '지유u'],
  },
};

export function getCharacterBySlug(slug: string) {
  return CHARACTER_SLUG_MAP[slug];
}

export function resolveCharacterSlug(input: string): string | null {
  const lower = input.toLowerCase().trim();
  for (const entry of Object.values(CHARACTER_SLUG_MAP)) {
    if (entry.slug === lower || entry.names.some((n) => lower.includes(n.toLowerCase()))) {
      return entry.slug;
    }
  }
  return null;
}
