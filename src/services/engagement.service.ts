import { PrismaClient } from '@prisma/client';
import { PUSH_CONFIG } from '../config/push.config.js';
import { getInactivityDays } from '../utils/push.utils.js';

const prisma = new PrismaClient();

export interface EngagementMetrics {
  pushClickRate: number;
  photoViewRate: number;
  replyRate: number;
  avgReplyLatencyMs: number;
  avgConversationLength: number;
  likeRate: number;
  emojiRate: number;
}

export class EngagementService {
  /** 최근 30일 참여도 메트릭 계산 */
  async calculateMetrics(userId: string): Promise<EngagementMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.pushLog.findMany({
      where: { userId, sentAt: { gte: thirtyDaysAgo } },
    });

    if (logs.length === 0) {
      return {
        pushClickRate: 0.5,
        photoViewRate: 0.5,
        replyRate: 0.5,
        avgReplyLatencyMs: 0,
        avgConversationLength: 0,
        likeRate: 0,
        emojiRate: 0,
      };
    }

    const total = logs.length;
    const clicked = logs.filter((l) => l.clicked).length;
    const viewed = logs.filter((l) => l.photoViewed).length;
    const replied = logs.filter((l) => l.replied).length;
    const liked = logs.filter((l) => l.liked).length;
    const emoji = logs.filter((l) => l.emojiUsed).length;

    const replyLatencies = logs
      .filter((l) => l.replyLatencyMs != null)
      .map((l) => l.replyLatencyMs!);

    const convLengths = logs
      .filter((l) => l.conversationLength > 0)
      .map((l) => l.conversationLength);

    return {
      pushClickRate: clicked / total,
      photoViewRate: viewed / total,
      replyRate: replied / total,
      avgReplyLatencyMs:
        replyLatencies.length > 0
          ? replyLatencies.reduce((a, b) => a + b, 0) / replyLatencies.length
          : 0,
      avgConversationLength:
        convLengths.length > 0
          ? convLengths.reduce((a, b) => a + b, 0) / convLengths.length
          : 0,
      likeRate: liked / total,
      emojiRate: emoji / total,
    };
  }

  /** 참여도 점수 계산 (0.0 ~ 1.0) */
  calculateEngagementScore(metrics: EngagementMetrics): number {
    const w = PUSH_CONFIG.ENGAGEMENT_WEIGHTS;
    const replySpeedScore =
      metrics.avgReplyLatencyMs > 0
        ? Math.max(0, 1 - metrics.avgReplyLatencyMs / (2 * 60 * 60 * 1000))
        : 0.5;
    const convScore = Math.min(1, metrics.avgConversationLength / 10);

    const score =
      metrics.pushClickRate * w.pushClick +
      metrics.photoViewRate * w.photoView +
      metrics.replyRate * w.reply +
      replySpeedScore * w.replySpeed +
      convScore * w.conversationLength +
      metrics.likeRate * w.like +
      metrics.emojiRate * w.emoji;

    return Math.max(0, Math.min(1, score));
  }

  /** 빈도 배율 계산 */
  async updateUserEngagement(userId: string): Promise<number> {
    const metrics = await this.calculateMetrics(userId);
    const score = this.calculateEngagementScore(metrics);

    let multiplier: number;
    if (score >= 0.7) {
      multiplier = 1.2 + (score - 0.7) * 1.0; // 최대 1.5
    } else if (score >= 0.4) {
      multiplier = 0.8 + (score - 0.4) * 1.33; // 0.8 ~ 1.2
    } else {
      multiplier = 0.5 + score * 0.75; // 0.5 ~ 0.8
    }

    multiplier = Math.max(
      PUSH_CONFIG.FREQUENCY_MULTIPLIER.min,
      Math.min(PUSH_CONFIG.FREQUENCY_MULTIPLIER.max, multiplier)
    );

    // 앱 미사용 기간 반영
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.lastActiveAt) {
      const inactiveDays = getInactivityDays(user.lastActiveAt);
      if (inactiveDays >= 15) {
        multiplier *= PUSH_CONFIG.INACTIVITY_STRATEGIES.DAYS_15_PLUS.frequencyMultiplier;
      } else if (inactiveDays >= 8) {
        multiplier *= PUSH_CONFIG.INACTIVITY_STRATEGIES.DAYS_8_14.frequencyMultiplier;
      } else if (inactiveDays >= 4) {
        multiplier *= PUSH_CONFIG.INACTIVITY_STRATEGIES.DAYS_4_7.frequencyMultiplier;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { engagementScore: score, frequencyMultiplier: multiplier },
    });

    return multiplier;
  }

  /** 오늘 발송할 횟수 결정 */
  async getDailyPushCount(userId: string, hasSpecialDay: boolean): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 0;

    const multiplier = user.frequencyMultiplier;

    // 기본: 0~2회, 평균 1~2회
    let baseCount: number;
    const rand = Math.random();
    if (multiplier >= 1.2) {
      baseCount = rand < 0.7 ? 2 : 1;
    } else if (multiplier >= 0.8) {
      baseCount = rand < 0.4 ? 2 : rand < 0.8 ? 1 : 0;
    } else {
      baseCount = rand < 0.3 ? 1 : 0;
    }

    // 금요일은 아무것도 안 보낼 확률 증가
  // handled in scheduler

    const maxAllowed = hasSpecialDay
      ? PUSH_CONFIG.MAX_DAILY_PUSHES + PUSH_CONFIG.SPECIAL_DAY_BONUS
      : PUSH_CONFIG.MAX_DAILY_PUSHES;

    const totalCount = hasSpecialDay ? baseCount + PUSH_CONFIG.SPECIAL_DAY_BONUS : baseCount;
    return Math.min(totalCount, maxAllowed);
  }

  /** 콘텐츠 스타일 결정 (무반응 사용자용) */
  getContentStyle(engagementScore: number, inactiveDays: number): string {
    if (inactiveDays >= 15) return 'miss_you';
    if (engagementScore < 0.3) return 'soft';
    if (engagementScore < 0.5) return 'gentle';
    return 'normal';
  }

  /** 무반응 사용자 쿨다운 여부 */
  async shouldTakeCooldown(userId: string): Promise<boolean> {
    const metrics = await this.calculateMetrics(userId);
    if (metrics.replyRate >= 0.2) return false;

    const recentLogs = await prisma.pushLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 5,
    });

    const noReplyStreak = recentLogs.filter((l) => !l.replied).length;
    return noReplyStreak >= 3;
  }
}

export const engagementService = new EngagementService();
