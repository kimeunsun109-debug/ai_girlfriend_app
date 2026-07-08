import { PrismaClient, PersonalityTrait } from '@prisma/client';
import {
  ADAPTIVE_RULES,
  CORE_LOCKED_TRAITS,
  DAILY_DNA_LIMIT,
  SPECIAL_EVENT_DNA_LIMIT,
  TRAIT_LABELS,
} from '../../config/adaptive-personality.config.js';
import type { DnaUpdateInput } from './types.js';
import { growthTimeline } from './growth-timeline.js';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

export class DNAEvolutionEngine {
  async applyRule(
    userCharacterId: string,
    characterSlug: string,
    ruleKey: keyof typeof ADAPTIVE_RULES,
    reason: string,
    isSpecialEvent = false
  ): Promise<void> {
    const deltas = ADAPTIVE_RULES[ruleKey];
    if (!deltas) return;

    await this.applyDelta(
      {
        userCharacterId,
        sourceType: ruleKey,
        reason,
        traitDeltas: deltas,
        maxDelta: isSpecialEvent ? SPECIAL_EVENT_DNA_LIMIT : DAILY_DNA_LIMIT,
      },
      characterSlug
    );
  }

  async applyDelta(input: DnaUpdateInput, characterSlug: string): Promise<void> {
    const rows = await prisma.personalityDNA.findMany({
      where: { userCharacterId: input.userCharacterId },
    });
    if (!rows.length) return;

    const locked = new Set(CORE_LOCKED_TRAITS[characterSlug] ?? []);
    const maxDelta = input.maxDelta ?? DAILY_DNA_LIMIT;

    // Global per-day cap (not per-trait/per-call): enforce by counting history entries for "today"
    const tz =
      (
        await prisma.userCharacter.findUnique({
          where: { id: input.userCharacterId },
          select: { user: { select: { timezone: true } } },
        })
      )?.user.timezone ?? 'Asia/Seoul';

    const now = new Date();
    const localNow = toZonedTime(now, tz);
    const localStart = startOfDay(localNow);
    const localEnd = addDays(localStart, 1);
    const dayStartUtc = fromZonedTime(localStart, tz);
    const dayEndUtc = fromZonedTime(localEnd, tz);

    const already = await prisma.personalityHistory.count({
      where: {
        userCharacterId: input.userCharacterId,
        createdAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
    });

    const dailyLimit = maxDelta; // maxDelta already encodes DAILY vs SPECIAL caps
    let remaining = Math.max(0, dailyLimit - already);
    if (remaining <= 0) return;

    for (const [trait, raw] of Object.entries(input.traitDeltas)) {
      if (remaining <= 0) break;
      if (!raw) continue;
      const traitKey = trait as PersonalityTrait;
      const row = rows.find((r) => r.traitKey === traitKey);
      if (!row) continue;

      let delta = Math.max(-maxDelta, Math.min(maxDelta, raw));
      let next = row.adaptiveValue + delta;

      if (locked.has(traitKey)) {
        const range = 12;
        next = Math.max(row.coreValue - range, Math.min(row.coreValue + range, next));
      }

      next = Math.max(0, Math.min(100, next));
      delta = next - row.adaptiveValue;
      if (delta === 0) continue;

      await prisma.personalityDNA.update({
        where: { id: row.id },
        data: { adaptiveValue: next, lastUpdatedReason: input.reason },
      });

      await prisma.personalityHistory.create({
        data: {
          userCharacterId: input.userCharacterId,
          traitKey,
          previousValue: row.adaptiveValue,
          delta,
          newValue: next,
          reason: input.reason,
          sourceType: input.sourceType,
        },
      });

      await growthTimeline.record(input.userCharacterId, {
        title: `${TRAIT_LABELS[traitKey]} 변화`,
        description: `${input.reason}로 ${TRAIT_LABELS[traitKey]} ${delta > 0 ? '+' : ''}${delta}`,
        traitKey,
        delta,
      });

      remaining -= 1;
    }
  }
}

export const dnaEvolutionEngine = new DNAEvolutionEngine();
