self.addEventListener('install', e => self.skipWaiting())
self.addEventListener('activate', e => clients.claim())
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))

self.addEventListener('push', (event) => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
  })
})
