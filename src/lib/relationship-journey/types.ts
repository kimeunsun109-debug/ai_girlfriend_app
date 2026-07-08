import type {
  TimelineEventType,
  AlbumCategory,
  LivingEmotion,
} from '@prisma/client';

export interface TimelineEntryInput {
  userCharacterId: string;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  emoji?: string;
  photoId?: string;
  photoUrl?: string;
  pushLogId?: string;
  albumCategory?: AlbumCategory;
  emotionalIntensity?: number;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SharedMemoryInput {
  userCharacterId: string;
  title: string;
  content: string;
  recallPhrase: string;
  emotionalIntensity?: number;
  occurredAt?: Date;
  tags?: string[];
}

export interface StageInfo {
  level: number;
  name: string;
  nameKo: string;
  description: string;
  speechStyle: string;
  rewards: readonly string[];
}

export type { TimelineEventType, AlbumCategory, LivingEmotion };
