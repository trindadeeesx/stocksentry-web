self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'StockSentry', body: 'Alerta de estoque!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon.png',
      badge: '/assets/badge.png',
      tag: 'stocksentry-alert',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
