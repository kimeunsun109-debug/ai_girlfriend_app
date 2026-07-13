import { PrismaClient } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CHARACTER_SPECS } from '../data/character-specs.js';
import {
  ACTIVITY_STATUS_MAP,
  EMOTIONAL_STATE_MAP,
  GREETING_BY_HOUR,
  GREETING_SUB_BY_HOUR,
  getMeetTheme,
  getTimeOfDay,
  pickTodaysHero,
  specTagline,
} from '../config/character-meet.config.js';
import { dailyLifeGenerator } from '../lib/living-ai/daily-life-generator.js';
import { emotionStateManager } from '../lib/living-ai/emotion-state-manager.js';
import { LIVING_EMOTION_TO_SLUG } from '../lib/living-ai/types.js';
import { formatInTimeZone, getUserTodayStart, randomPick } from '../utils/push.utils.js';
import { resolveMeetPhotos } from './meet-photo-resolver.js';
import type { RoutineActivity } from '../lib/living-ai/types.js';

const prisma = new PrismaClient();

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000010';

const FALLBACK_LAST_MESSAGES: Record<string, string[]> = {
  yuna: ['오늘 하루 어땠어?', '사진 하나 보여줄까?', '계속 기다리고 있었어.'],
  narin: ['뭐 해.', '심심한데.', '답장 안 하네.'],
  yunseo: ['비 오는데 창밖 봐.', '오늘 좀 피곤해.', '잠깐 얘기할래?'],
  eunha: ['카페 왔어ㅋㅋ', '갑자기 보고 싶다', '오늘 뭐 했어?'],
  jiyu: ['게임 한 판만...', '배고파 죽겠어', '나 지금 밖이야'],
};

export interface MeetCharacterCard {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mood: string;
  photoUrl: string;
  ambientPhotoUrl?: string;
  gradient: string;
  accent: string;
  status: { emoji: string; label: string };
  emotionalState: { emoji: string; label: string };
  activityKey?: string;
  emotionKey?: string;
  lastMessage: { text: string; relativeTime: string };
  userCharacterId: string | null;
  linked: boolean;
}

export interface MeetHomeResponse {
  greeting: string;
  greetingSub: string;
  timeOfDay: string;
  todaysPickSlug: string;
  characters: MeetCharacterCard[];
  userId: string;
}

export class MeetService {
  async getHome(userId?: string): Promise<MeetHomeResponse> {
    const resolvedUserId = userId ?? DEMO_USER_ID;
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      include: {
        characters: { include: { character: true } },
      },
    });

    const timezone = user?.timezone ?? 'Asia/Seoul';
    const now = new Date();
    const hour = parseInt(formatInTimeZone(now, timezone, 'H'), 10);
    const timeOfDay = getTimeOfDay(hour);
    const dateKey = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
    const slugs = CHARACTER_SPECS.map((s) => s.slug);
    const todaysPickSlug = pickTodaysHero(slugs, `${resolvedUserId}:${dateKey}`);

    const linkByCharacterId = new Map(
      (user?.characters ?? []).map((uc) => [uc.characterId, uc])
    );

    const characters: MeetCharacterCard[] = [];

    for (const spec of CHARACTER_SPECS) {
      const uc = linkByCharacterId.get(spec.id);
      const theme = getMeetTheme(spec.slug);

      let status = this.fallbackStatus(spec.slug, hour);
      let emotionalState = EMOTIONAL_STATE_MAP.waiting!;
      let activityKey = getTimeOfDay(hour);
      let emotionKey = 'waiting';
      let lastText = randomPick(FALLBACK_LAST_MESSAGES[spec.slug] ?? ['안녕']);
      let lastAt = new Date(now.getTime() - (2 + Math.floor(Math.random() * 8)) * 60 * 60 * 1000);

      if (uc) {
        const live = await this.resolveLiveStatus(uc.id, timezone, now);
        status = live.status;
        activityKey = live.activityKey;
        const emotional = await this.resolveEmotionalState(uc.id, hour);
        emotionalState = emotional.state;
        emotionKey = emotional.key;
        const lastMsg = await prisma.chatMessage.findFirst({
          where: { userCharacterId: uc.id, sender: 'CHARACTER' },
          orderBy: { sentAt: 'desc' },
        });
        if (lastMsg) {
          lastText = lastMsg.content;
          lastAt = lastMsg.sentAt;
        }
      } else {
        emotionalState = this.fallbackEmotionalState(spec.slug, hour);
        emotionKey = ['jiyu', 'eunha'].includes(spec.slug) ? 'happy' : 'waiting';
        activityKey = getTimeOfDay(hour);
      }

      const photos = resolveMeetPhotos(spec.slug, activityKey, emotionKey);

      characters.push({
        id: spec.id,
        slug: spec.slug,
        name: spec.name,
        tagline: specTagline(spec),
        mood: theme.mood,
        photoUrl: photos.photoUrl,
        ambientPhotoUrl: photos.ambientPhotoUrl,
        gradient: theme.gradient,
        accent: theme.accent,
        status,
        emotionalState,
        lastMessage: {
          text: lastText,
          relativeTime: formatDistanceToNow(lastAt, { addSuffix: true, locale: ko }),
        },
        userCharacterId: uc?.id ?? null,
        linked: Boolean(uc),
      });
    }

    // Hero first, then rest
    characters.sort((a, b) => {
      if (a.slug === todaysPickSlug) return -1;
      if (b.slug === todaysPickSlug) return 1;
      return 0;
    });

    return {
      greeting: GREETING_BY_HOUR[timeOfDay],
      greetingSub: randomPick(GREETING_SUB_BY_HOUR[timeOfDay]),
      timeOfDay,
      todaysPickSlug,
      characters,
      userId: resolvedUserId,
    };
  }

  private async resolveLiveStatus(
    userCharacterId: string,
    timezone: string,
    now: Date
  ): Promise<{ status: { emoji: string; label: string }; activityKey: string }> {
    const today = getUserTodayStart(timezone);
    let routine = await dailyLifeGenerator.getTodayRoutine(userCharacterId, timezone);
    if (!routine) {
      const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId } });
      if (!uc) {
        return { status: ACTIVITY_STATUS_MAP.default!, activityKey: 'default' };
      }
      await dailyLifeGenerator.generateForUserCharacter(
        userCharacterId,
        uc.characterId,
        today,
        timezone
      );
      routine = await dailyLifeGenerator.getTodayRoutine(userCharacterId, timezone);
    }

    if (!routine?.activities?.length) {
      return { status: ACTIVITY_STATUS_MAP.default!, activityKey: 'default' };
    }

    const current = this.findCurrentActivity(routine.activities, now);
    if (!current) {
      return { status: ACTIVITY_STATUS_MAP.default!, activityKey: 'default' };
    }

    const activityKey = current.categorySlug ?? current.activity ?? 'default';
    const status =
      ACTIVITY_STATUS_MAP[current.activity] ??
      ACTIVITY_STATUS_MAP[current.categorySlug] ??
      { emoji: '💭', label: current.label };

    return { status, activityKey };
  }

  private findCurrentActivity(activities: RoutineActivity[], now: Date): RoutineActivity | null {
    const sorted = [...activities].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (new Date(sorted[i]!.scheduledAt) <= now) return sorted[i]!;
    }
    return sorted[0] ?? null;
  }

  private async resolveEmotionalState(
    userCharacterId: string,
    hour: number
  ): Promise<{ state: { emoji: string; label: string }; key: string }> {
    const state = await emotionStateManager.getState(userCharacterId);
    if (!state) {
      const fb = this.fallbackEmotionalState('yuna', hour);
      return { state: fb, key: 'neutral' };
    }

    const slug = LIVING_EMOTION_TO_SLUG[state.emotion];
    if (slug === 'love') return { state: EMOTIONAL_STATE_MAP.love!, key: 'love' };
    if (slug === 'sleepy' || slug === 'tired') return { state: EMOTIONAL_STATE_MAP.sleepy!, key: 'sleepy' };
    if (slug === 'sad') return { state: EMOTIONAL_STATE_MAP.sad!, key: 'sad' };
    if (slug === 'happy' || slug === 'excited') return { state: EMOTIONAL_STATE_MAP.happy!, key: 'happy' };
    if (slug === 'bored') return { state: EMOTIONAL_STATE_MAP.bored!, key: 'bored' };
    if (slug === 'hungry') return { state: EMOTIONAL_STATE_MAP.hungry!, key: 'hungry' };

    const recentUserMsg = await prisma.chatMessage.findFirst({
      where: { userCharacterId, sender: 'USER' },
      orderBy: { sentAt: 'desc' },
    });
    if (recentUserMsg) {
      const hoursSince =
        (Date.now() - recentUserMsg.sentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 12) {
        return { state: EMOTIONAL_STATE_MAP.waiting!, key: 'waiting' };
      }
    }

    return { state: EMOTIONAL_STATE_MAP.neutral!, key: 'neutral' };
  }

  private fallbackStatus(slug: string, hour: number): { emoji: string; label: string } {
    const presets: Record<string, Record<string, { emoji: string; label: string }>> = {
      yuna: {
        morning: { emoji: '📚', label: '등교 준비 중' },
        afternoon: { emoji: '☕', label: '카페에서 쉬는 중' },
        evening: { emoji: '🍜', label: '저녁 먹는 중' },
        night: { emoji: '🌙', label: '잠들 준비 중' },
      },
      narin: {
        morning: { emoji: '💄', label: '출근 준비 중' },
        afternoon: { emoji: '☕', label: '카페에서 쉬는 중' },
        evening: { emoji: '🛍️', label: '쇼핑 중' },
        night: { emoji: '😴', label: '자는 중' },
      },
      yunseo: {
        morning: { emoji: '🚗', label: '출근 중' },
        afternoon: { emoji: '📚', label: '일하는 중' },
        evening: { emoji: '🌧️', label: '창밖 보는 중' },
        night: { emoji: '🌙', label: '잠들 준비 중' },
      },
      eunha: {
        morning: { emoji: '☕', label: '카페에서 쉬는 중' },
        afternoon: { emoji: '🎨', label: '뭔가 그리는 중' },
        evening: { emoji: '🍰', label: '디저트 먹는 중' },
        night: { emoji: '🌙', label: '잠들 준비 중' },
      },
      jiyu: {
        morning: { emoji: '🎮', label: '게임 중' },
        afternoon: { emoji: '⛳', label: '밖에 나와 있어' },
        evening: { emoji: '🍜', label: '저녁 먹는 중' },
        night: { emoji: '😴', label: '자는 중' },
      },
    };
    const tod = getTimeOfDay(hour);
    return presets[slug]?.[tod] ?? ACTIVITY_STATUS_MAP.default!;
  }

  private fallbackEmotionalState(
    slug: string,
    hour: number
  ): { emoji: string; label: string } {
    if (hour >= 23 || hour < 6) return EMOTIONAL_STATE_MAP.sleepy!;
    const eager = ['jiyu', 'eunha'];
    const cool = ['narin', 'yunseo'];
    if (eager.includes(slug)) return EMOTIONAL_STATE_MAP.happy!;
    if (cool.includes(slug)) return EMOTIONAL_STATE_MAP.waiting!;
    return EMOTIONAL_STATE_MAP.love!;
  }
}

export const meetService = new MeetService();
