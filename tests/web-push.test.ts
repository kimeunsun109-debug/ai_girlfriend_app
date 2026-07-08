import { describe, it, expect } from 'vitest';
import { webPushService } from '../src/services/web-push.service.js';

describe('webPushService', () => {
  it('returns null when VAPID not configured', () => {
    const original = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    expect(webPushService.getPublicKey()).toBeNull();
    process.env.VAPID_PUBLIC_KEY = original;
  });
});
