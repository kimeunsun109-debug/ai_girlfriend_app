import webpush from 'web-push';

export interface WebPushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data: Record<string, string>;
}

export class WebPushService {
  private configured = false;

  configure(): boolean {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:support@pickmetalk.com';

    if (!publicKey || !privateKey) return false;

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    return true;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  isConfigured(): boolean {
    if (!this.configured) this.configure();
    return this.configured;
  }

  async send(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: WebPushPayload
  ): Promise<{ success: boolean; expired?: boolean }> {
    if (!this.isConfigured()) {
      console.log('[MOCK WEB PUSH]', { endpoint: subscription.endpoint.slice(0, 40), ...payload });
      return { success: true };
    }

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      image: payload.imageUrl,
      data: payload.data,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        notification,
        {
          TTL: 3600,
          urgency: 'high',
        }
      );
      return { success: true };
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        return { success: false, expired: true };
      }
      console.error('Web push failed:', err);
      return { success: false };
    }
  }
}

export const webPushService = new WebPushService();
