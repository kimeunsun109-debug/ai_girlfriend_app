/* PickMeTalk Photo Push Service Worker */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '', body: event.data.text(), data: {} };
  }

  const title = payload.title || '';
  const options = {
    body: payload.body || '',
    icon: '/assets/photos/icon-192.png',
    badge: '/assets/photos/icon-192.png',
    image: payload.image || undefined,
    data: payload.data || {},
    tag: payload.data?.pushLogId || 'photo-push',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const apiBase = data.apiBaseUrl || self.location.origin;
  const deepLink = data.deepLink || '/';

  if (data.pushLogId) {
    fetch(`${apiBase}/api/push/click/${data.pushLogId}`, { method: 'POST' }).catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(deepLink) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(deepLink);
      }
    })
  );
});
