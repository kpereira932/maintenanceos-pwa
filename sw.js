// ============================================================
// MaintenanceOS Service Worker
// Handles push notifications + offline caching
// ============================================================

const CACHE_NAME = 'maintenanceos-v1';
const OFFLINE_URLS = ['/'];

// Install — cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache when offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification received
self.addEventListener('push', event => {
  let data = { title: 'MaintenanceOS', body: 'You have a new notification', icon: '/icon-192.png', badge: '/badge.png', tag: 'mtos-' + Date.now() };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag,
      vibrate: [200, 100, 200],
      data: data,
      actions: data.actions || [],
      requireInteraction: data.priority === 'High',
    })
  );
});

// Notification clicked — open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tickets') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // When back online, sync any queued actions
  const cache = await caches.open('mtos-offline-queue');
  const keys = await cache.keys();
  for (const req of keys) {
    try {
      const data = await (await cache.match(req)).json();
      await fetch(req, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
      await cache.delete(req);
    } catch(e) {}
  }
}
