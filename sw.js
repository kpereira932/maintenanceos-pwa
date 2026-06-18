// MaintenanceOS Service Worker v4
// Network-only - no HTML caching

const CACHE_NAME = 'maintenanceos-v4';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Delete every single old cache
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Never cache HTML - always go to network
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // For everything else, network first
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener('push', event => {
  let data = { title: 'MaintenanceOS', body: 'New notification', tag: 'mtos-' + Date.now() };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: '/icon-192.svg', tag: data.tag, vibrate: [200,100,200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) { if (c.url.includes(self.location.origin)) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
