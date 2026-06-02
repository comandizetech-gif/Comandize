/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Novo pedido COMANDIZE', body: event.data?.text() || 'Você recebeu um novo pedido.' };
  }

  const title = data.title || 'Novo pedido COMANDIZE';
  const options = {
    body: data.body || 'Você recebeu um novo pedido.',
    icon: data.icon || '/icons/Comandize.png',
    badge: data.badge || '/icons/Comandize.png',
    vibrate: data.vibrate || [400, 200, 400, 200, 400],
    tag: data.tag || 'comandize-new-order',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/login#Delivery',
      orderId: data.orderId || '',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/login#Delivery';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    })
  );
});
