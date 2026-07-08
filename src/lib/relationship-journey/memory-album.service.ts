import { PrismaClient, AlbumCategory } from '@prisma/client';

const prisma = new PrismaClient();

const ALBUM_LABELS: Record<AlbumCategory, string> = {
  SELFIE: '📷 셀카',
  FOOD: '🍜 음식',
  CAFE: '☕ 카페',
  ANNIVERSARY: '🎂 기념일',
  GIFT: '🎁 선물',
  SPRING: '🌸 봄',
  RAIN: '☔ 비',
  CHRISTMAS: '🎄 크리스마스',
  NEW_YEAR: '🎆 새해',
  COUPLE: '💕 커플',
  TRAVEL: '✈️ 여행',
  OTHER: '📸 추억',
};

export interface AlbumPhotoInput {
  userCharacterId: string;
  albumCategory: AlbumCategory;
  photoId?: string;
  photoUrl: string;
  title?: string;
  timelineId?: string;
  capturedAt?: Date;
}

export class MemoryAlbumService {
  async addPhoto(input: AlbumPhotoInput) {
    return prisma.memoryAlbumItem.create({
      data: {
        userCharacterId: input.userCharacterId,
        albumCategory: input.albumCategory,
        photoId: input.photoId,
        photoUrl: input.photoUrl,
        title: input.title,
        timelineId: input.timelineId,
        capturedAt: input.capturedAt ?? new Date(),
      },
    });
  }

  async getAlbum(userCharacterId: string) {
    const items = await prisma.memoryAlbumItem.findMany({
      where: { userCharacterId },
      orderBy: { capturedAt: 'desc' },
    });

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.albumCategory;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return {
      total: items.length,
      categories: Object.entries(grouped).map(([category, photos]) => ({
        category,
        label: ALBUM_LABELS[category as AlbumCategory] ?? category,
        count: photos.length,
        photos: photos.slice(0, 20),
      })),
    };
  }

  async getByCategory(userCharacterId: string, category: AlbumCategory) {
    return prisma.memoryAlbumItem.findMany({
      where: { userCharacterId, albumCategory: category },
      orderBy: { capturedAt: 'desc' },
    });
  }
}

export const memoryAlbumService = new MemoryAlbumService();
