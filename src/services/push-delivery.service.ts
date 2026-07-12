import { PrismaClient } from '@prisma/client';
import { pushNotificationService } from './push-notification.service.js';
import { webPushService } from './web-push.service.js';

const prisma = new PrismaClient();

export interface UnifiedPushPayload {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data: {
    type: string;
    pushLogId: string;
    characterId: string;
    photoUrl?: string;
    message: string;
    deepLink: string;
  };
}

export class PushDeliveryService {
  async sendToUser(payload: UnifiedPushPayload): Promise<{ success: boolean }> {
    const [deviceTokens, webSubscriptions] = await Promise.all([
      prisma.deviceToken.findMany({ where: { userId: payload.userId } }),
      prisma.webPushSubscription.findMany({ where: { userId: payload.userId } }),
    ]);

    if (deviceTokens.length === 0 && webSubscriptions.length === 0) {
      return { success: false };
    }

    const results: boolean[] = [];

    if (deviceTokens.length > 0) {
      const fcmResult = await pushNotificationService.sendPhotoPush({
        userId: payload.userId,
        deviceTokens: deviceTokens.map((t) => t.token),
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
        data: payload.data,
      });
      results.push(fcmResult.success);
    }

    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const dataWithBase = {
      ...payload.data,
      deepLink: payload.data.deepLink.startsWith('http')
        ? payload.data.deepLink
        : `${baseUrl}${payload.data.deepLink}`,
      apiBaseUrl: baseUrl,
    };

    for (const sub of webSubscriptions) {
      const result = await webPushService.send(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl?.startsWith('http')
            ? payload.imageUrl
            : `${baseUrl}${payload.imageUrl}`,
          data: Object.fromEntries(
            Object.entries(dataWithBase).map(([k, v]) => [k, String(v)])
          ),
        }
      );

      if (result.expired) {
        await prisma.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      results.push(result.success);
    }

    return { success: results.some(Boolean) };
  }
}

export const pushDeliveryService = new PushDeliveryService();
