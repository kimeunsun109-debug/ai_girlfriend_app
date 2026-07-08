/**
 * FCM/APNs 푸시 알림 서비스
 * 실제 환경에서는 firebase-admin으로 FCM 발송
 */
export interface PhotoPushPayload {
  userId: string;
  deviceTokens: string[];
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

export class PushNotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const admin = await import('firebase-admin');
        if (!admin.default.apps.length) {
          admin.default.initializeApp({
            credential: admin.default.credential.cert({
              projectId,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
          });
        }
        this.initialized = true;
      } catch (err) {
        console.warn('Firebase init failed, using mock push:', err);
      }
    }
  }

  /**
   * 사진 푸시 발송
   * - 타이틀 없이 메시지만 (광고 느낌 방지)
   * - 이미지 첨부로 '사진이 도착했다' 느낌
   * - 딥링크로 채팅 화면 이동
   */
  async sendPhotoPush(payload: PhotoPushPayload): Promise<{ success: boolean; messageId?: string }> {
    await this.initialize();

    if (!this.initialized) {
      console.log('[MOCK PUSH]', {
        userId: payload.userId,
        body: payload.body,
        imageUrl: payload.imageUrl,
        deepLink: payload.data.deepLink,
      });
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const admin = await import('firebase-admin');
      const messaging = admin.default.messaging();

      const results = await Promise.allSettled(
        payload.deviceTokens.map((token) =>
          messaging.send({
            token,
            notification: {
              title: payload.title || undefined,
              body: payload.body,
              imageUrl: payload.imageUrl,
            },
            data: {
              ...Object.fromEntries(
                Object.entries(payload.data).map(([k, v]) => [k, String(v)])
              ),
            },
            android: {
              priority: 'high',
              notification: {
                imageUrl: payload.imageUrl,
                channelId: 'photo_push',
              },
            },
            apns: {
              payload: {
                aps: {
                  'mutable-content': 1,
                  sound: 'default',
                },
              },
              fcmOptions: {
                imageUrl: payload.imageUrl,
              },
            },
          })
        )
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { success: succeeded > 0 };
    } catch (err) {
      console.error('Push send failed:', err);
      return { success: false };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
