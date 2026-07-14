import { normalizeEmotion } from "@/lib/emotions";
import type {
  Conversation,
  Message,
  RelationshipLevel,
  UserCharacterState,
} from "@/types";

export interface CharacterRow {
  id: string;
  name: string;
  tagline: string;
  avatar_url: string;
  default_emotion: string;
  default_expression: string;
  is_active: boolean;
  is_premium_only: boolean;
  sort_order: number;
}

export function mapCharacter(row: CharacterRow) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    avatarUrl: row.avatar_url,
    defaultEmotion: normalizeEmotion(row.default_emotion),
    defaultExpression: (row.default_expression ?? "smile") as string,
    isActive: row.is_active,
    isPremiumOnly: row.is_premium_only,
    sortOrder: row.sort_order,
  };
}

export type MappedCharacter = ReturnType<typeof mapCharacter>;

export function mapCharacterState(row: Record<string, unknown>): UserCharacterState {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    characterId: row.character_id as string,
    affection: row.affection as number,
    relationshipLevel: row.relationship_level as RelationshipLevel,
    emotion: normalizeEmotion(row.emotion as string),
    lastSeenAt: row.last_seen_at as string,
    lastChatAt: (row.last_chat_at as string | null) ?? null,
    memorySummary: (row.memory_summary as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    characterId: row.character_id as string,
    conversationId: (row.conversation_id as string | null) ?? undefined,
    role: row.role as "user" | "assistant" | "system",
    content: row.content as string,
    emotion: row.emotion ? normalizeEmotion(row.emotion as string) : undefined,
    createdAt: row.created_at as string,
  };
}

export function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    characterId: row.character_id as string,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    emotion: normalizeEmotion(row.emotion as string),
    affection: row.affection as number,
    relationshipLevel: row.relationship_level as RelationshipLevel,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
  };
}
