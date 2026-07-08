import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { param } from '../utils/route.utils.js';
import { analyticsService } from '../services/analytics.service.js';
import { followUpService } from '../services/followup.service.js';
import { engagementService } from '../services/engagement.service.js';
import { webPushService } from '../services/web-push.service.js';
import { Platform } from '@prisma/client';

export const pushRouter = Router();

// ─── Web Push VAPID 공개키 ──────────────────────────────────
pushRouter.get('/vapid-public-key', (_req: Request, res: Response) => {
  const publicKey = webPushService.getPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Web Push not configured' });
  }
  res.json({ publicKey });
});

const webSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().optional(),
});

pushRouter.post('/web-subscription', async (req: Request, res: Response) => {
  const parsed = webSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, subscription, userAgent } = parsed.data;

  await prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
  });

  res.json({ success: true });
});

pushRouter.delete('/web-subscription', async (req: Request, res: Response) => {
  const endpoint = req.body?.endpoint as string | undefined;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  await prisma.webPushSubscription.deleteMany({ where: { endpoint } });
  res.json({ success: true });
});

// ─── 디바이스 토큰 등록 ───────────────────────────────────
const registerTokenSchema = z.object({
  userId: z.string().uuid(),
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
});

pushRouter.post('/device-token', async (req: Request, res: Response) => {
  const parsed = registerTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, token, platform } = parsed.data;

  await prisma.deviceToken.upsert({
    where: { token },
    create: { userId, token, platform: platform as Platform },
    update: { userId, platform: platform as Platform },
  });

  res.json({ success: true });
});

// ─── 푸시 클릭 (앱에서 호출) ────────────────────────────────
pushRouter.post('/click/:pushLogId', async (req: Request, res: Response) => {
  const pushLogId = param(req.params.pushLogId);
  await analyticsService.recordClick(pushLogId);
  res.json({ success: true });
});

// ─── 사진 열람 ──────────────────────────────────────────────
pushRouter.post('/view/:pushLogId', async (req: Request, res: Response) => {
  const pushLogId = param(req.params.pushLogId);
  await analyticsService.recordPhotoView(pushLogId);
  res.json({ success: true });
});

// ─── 답장 ───────────────────────────────────────────────────
const replySchema = z.object({
  userCharacterId: z.string().uuid(),
  content: z.string().min(1),
});

pushRouter.post('/reply/:pushLogId', async (req: Request, res: Response) => {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pushLogId = param(req.params.pushLogId);
  const { userCharacterId, content } = parsed.data;

  await followUpService.handleUserReply(pushLogId, userCharacterId, content);
  res.json({ success: true });
});

// ─── 좋아요 ─────────────────────────────────────────────────
pushRouter.post('/like/:pushLogId', async (req: Request, res: Response) => {
  await analyticsService.recordLike(param(req.params.pushLogId));
  res.json({ success: true });
});

// ─── 사용자 활동 기록 ───────────────────────────────────────
pushRouter.post('/activity/:userId', async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: param(req.params.userId) },
    data: { lastActiveAt: new Date() },
  });
  res.json({ success: true });
});

// ─── 사용자 분석 ────────────────────────────────────────────
pushRouter.get('/analytics/:userId', async (req: Request, res: Response) => {
  const periodDays = parseInt(req.query.period as string) || 30;
  const analytics = await analyticsService.getUserAnalytics(param(req.params.userId), periodDays);
  res.json(analytics);
});

// ─── 대시보드 통계 ──────────────────────────────────────────
pushRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const stats = await analyticsService.getDashboardStats();
  res.json(stats);
});

// ─── 참여도 업데이트 ────────────────────────────────────────
pushRouter.post('/engagement/:userId/refresh', async (req: Request, res: Response) => {
  const multiplier = await engagementService.updateUserEngagement(param(req.params.userId));
  res.json({ frequencyMultiplier: multiplier });
});
