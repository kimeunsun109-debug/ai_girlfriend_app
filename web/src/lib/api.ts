import type { ConversationReactResponse, MeetHome } from '@/types/meet';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000010';

export function getDemoUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_ID;
  return localStorage.getItem('pickme_userId') ?? DEFAULT_USER_ID;
}

export function setDemoUserId(userId: string) {
  localStorage.setItem('pickme_userId', userId);
}

export async function fetchMeetHome(userId?: string): Promise<MeetHome> {
  const id = userId ?? getDemoUserId();
  const res = await fetch(`/api/meet/home?userId=${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load meet home');
  return res.json();
}

export async function linkCharacter(userId: string, characterId: string) {
  const res = await fetch(`/api/users/${userId}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to link character');
  }
  return res.json();
}

export async function ensureCharacterLink(userId: string, characterId: string) {
  const userRes = await fetch(`/api/users/${userId}`);
  if (userRes.ok) {
    const user = await userRes.json();
    const existing = user.characters?.find(
      (c: { characterId: string; id: string }) => c.characterId === characterId
    );
    if (existing) return existing;
  }
  return linkCharacter(userId, characterId);
}

export async function reactToMessage(
  userCharacterId: string,
  content: string
): Promise<ConversationReactResponse> {
  const res = await fetch('/api/conversation/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userCharacterId, content }),
  });
  if (!res.ok) throw new Error('Failed to get reaction');
  return res.json();
}

export function storeChatContext(slug: string, data: {
  userCharacterId: string;
  name: string;
  photoUrl: string;
  accent: string;
}) {
  sessionStorage.setItem(`pickme_chat_${slug}`, JSON.stringify(data));
}

export function getChatContext(slug: string) {
  const raw = sessionStorage.getItem(`pickme_chat_${slug}`);
  return raw ? (JSON.parse(raw) as {
    userCharacterId: string;
    name: string;
    photoUrl: string;
    accent: string;
  }) : null;
}
