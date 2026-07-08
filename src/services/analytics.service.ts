import { PrismaClient, PhotoCategory } from '@prisma/client';
import { engagementService } from './engagement.service.js';

const prisma = new PrismaClient();

export class AnalyticsService {
  /** 푸시 클릭 기록 */
  async recordClick(pushLogId: string): Promise<void> {
    await prisma.pushLog.update({
      where: { id: pushLogId },
      data: { clicked: true, clickedAt: new Date(), reconnectedAt: new Date() },
    });
  }

  /** 사진 열람 기록 */
  async recordPhotoView(pushLogId: string): Promise<void> {
    await prisma.pushLog.update({
      where: { id: pushLogId },
      data: { photoViewed: true, photoViewedAt: new Date() },
    });
  }

  /** 좋아요 기록 */
  async recordLike(pushLogId: string): Promise<void> {
    await prisma.pushLog.update({
      where: { id: pushLogId },
      data: { liked: true },
    });
  }

  /** 발송 시간 학습 */
  async recordPushTime(userId: string, sentAt: Date): Promise<void> {
    const hour = sentAt.getHours().toString();
    const day = sentAt.getDay().toString();

    const existing = await prisma.userOptimalTime.findUnique({ where: { userId } });
    const hourWeights = (existing?.hourWeights as Record<string, number>) ?? {};
    const dayWeights = (existing?.dayWeights as Record<string, number>) ?? {};

    hourWeights[hour] = (hourWeights[hour] ?? 0) + 0.1;
    dayWeights[day] = (dayWeights[day] ?? 0) + 0.1;

    await prisma.userOptimalTime.upsert({
      where: { userId },
      create: { userId, hourWeights, dayWeights },
      update: { hourWeights, dayWeights },
    });
  }

  /** 사용자별 분석 리포트 */
  async getUserAnalytics(userId: string, periodDays: number = 30) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const logs = await prisma.pushLog.findMany({
      where: { userId, sentAt: { gte: periodStart } },
    });

    const total = logs.length;
    if (total === 0) {
      return {
        totalPushes: 0,
        ctr: 0,
        replyRate: 0,
        avgReplyLatencyMs: 0,
        avgConversationLength: 0,
        photoCategoryStats: {},
        optimalPushHour: null,
        optimalPushDayOfWeek: null,
      };
    }

    const clicks = logs.filter((l) => l.clicked).length;
    const replies = logs.filter((l) => l.replied).length;
    const replyLatencies = logs.filter((l) => l.replyLatencyMs).map((l) => l.replyLatencyMs!);
    const convLengths = logs.filter((l) => l.conversationLength > 0).map((l) => l.conversationLength);

    // 카테고리별 통계
    const categoryStats: Record<string, { sent: number; clicks: number; replies: number }> = {};
    for (const log of logs) {
      const cat = log.photoCategory ?? 'UNKNOWN';
      if (!categoryStats[cat]) categoryStats[cat] = { sent: 0, clicks: 0, replies: 0 };
      categoryStats[cat].sent++;
      if (log.clicked) categoryStats[cat].clicks++;
      if (log.replied) categoryStats[cat].replies++;
    }

    const photoCategoryStats = Object.fromEntries(
      Object.entries(categoryStats).map(([cat, stats]) => [
        cat,
        {
          ...stats,
          ctr: stats.sent > 0 ? stats.clicks / stats.sent : 0,
          replyRate: stats.sent > 0 ? stats.replies / stats.sent : 0,
        },
      ])
    );

    const optimalTime = await prisma.userOptimalTime.findUnique({ where: { userId } });
    const hourWeights = (optimalTime?.hourWeights as Record<string, number>) ?? {};
    const dayWeights = (optimalTime?.dayWeights as Record<string, number>) ?? {};

    const optimalPushHour = Object.entries(hourWeights).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
    const optimalPushDayOfWeek = Object.entries(dayWeights).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    return {
      totalPushes: total,
      ctr: clicks / total,
      replyRate: replies / total,
      avgReplyLatencyMs:
        replyLatencies.length > 0
          ? replyLatencies.reduce((a, b) => a + b, 0) / replyLatencies.length
          : 0,
      avgConversationLength:
        convLengths.length > 0
          ? convLengths.reduce((a, b) => a + b, 0) / convLengths.length
          : 0,
      photoCategoryStats,
      optimalPushHour: optimalPushHour ? parseInt(optimalPushHour) : null,
      optimalPushDayOfWeek: optimalPushDayOfWeek ? parseInt(optimalPushDayOfWeek) : null,
    };
  }

  /** 7일/30일 유지율 스냅샷 생성 */
  async createRetentionSnapshot(userId: string, periodDays: 7 | 30): Promise<void> {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const logs = await prisma.pushLog.findMany({
      where: { userId, sentAt: { gte: periodStart, lte: periodEnd } },
    });

    const total = logs.length;
    const clicks = logs.filter((l) => l.clicked).length;
    const replies = logs.filter((l) => l.replied).length;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const retentionRate = user?.lastActiveAt && user.lastActiveAt >= periodStart ? 1 : 0;

    // skip day 이후 재접속률
    const skipDays = await prisma.skipDay.findMany({
      where: { userId, skipDate: { gte: periodStart, lte: periodEnd } },
    });

    let skipDayReconnectRate = 0;
    if (skipDays.length > 0) {
      const reconnected = skipDays.filter((sd) => {
        const nextDay = new Date(sd.skipDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return user?.lastActiveAt && user.lastActiveAt >= nextDay;
      }).length;
      skipDayReconnectRate = reconnected / skipDays.length;
    }

    const analytics = await this.getUserAnalytics(userId, periodDays);

    await prisma.analyticsSnapshot.create({
      data: {
        userId,
        periodStart,
        periodEnd,
        periodDays,
        totalPushesSent: total,
        totalClicks: clicks,
        totalReplies: replies,
        ctr: total > 0 ? clicks / total : 0,
        replyRate: total > 0 ? replies / total : 0,
        avgReplyLatencyMs: analytics.avgReplyLatencyMs
          ? Math.round(analytics.avgReplyLatencyMs)
          : null,
        avgConversationLength: analytics.avgConversationLength,
        retentionRate,
        skipDayReconnectRate,
        optimalPushHour: analytics.optimalPushHour,
        optimalPushDayOfWeek: analytics.optimalPushDayOfWeek,
        topPhotoCategory: this.getTopCategory(logs),
      },
    });

    // 참여도 점수 업데이트
    await engagementService.updateUserEngagement(userId);
  }

  private getTopCategory(logs: Array<{ photoCategory: PhotoCategory | null; clicked: boolean }>): PhotoCategory | null {
    const stats: Partial<Record<PhotoCategory, number>> = {};
    for (const log of logs) {
      if (log.photoCategory && log.clicked) {
        stats[log.photoCategory] = (stats[log.photoCategory] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(stats).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
    return sorted.length > 0 ? (sorted[0][0] as PhotoCategory) : null;
  }

  /** 전체 대시보드 통계 */
  async getDashboardStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, totalPushes, clickedPushes, repliedPushes] = await Promise.all([
      prisma.user.count({ where: { pushEnabled: true } }),
      prisma.pushLog.count({ where: { sentAt: { gte: thirtyDaysAgo } } }),
      prisma.pushLog.count({ where: { sentAt: { gte: thirtyDaysAgo }, clicked: true } }),
      prisma.pushLog.count({ where: { sentAt: { gte: thirtyDaysAgo }, replied: true } }),
    ]);

    return {
      totalUsers,
      totalPushes,
      ctr: totalPushes > 0 ? clickedPushes / totalPushes : 0,
      replyRate: totalPushes > 0 ? repliedPushes / totalPushes : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
