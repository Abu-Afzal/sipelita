// sw.js - Service Worker untuk SIPELITA PWA
// ✅ UPDATE: Versi cache dinaikkan untuk memaksa refresh + notifikasi support
const CACHE_VERSION = 'v2.4';
const CACHE_NAME = `sipelita-cache-${CACHE_VERSION}`;

// Daftar aset penting yang perlu di-cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pages/supervisi.html',
  './pages/jadwal.html',
  './pages/sipena.html',
  './pages/jurnal.html',
  './pages/sican.html',           // ✅ TAMBAH
  './pages/jadwal-mengajar.html', // ✅ TAMBAH
  './pages/rekap-sican.html',     // ✅ TAMBAH
  './pages/sehat.html',           // ✅ TAMBAH
  './pages/edokumen.html',        // ✅ TAMBAH
  './css/home-style.css',
  './css/supervisi.css',
  './css/sehat.css',              // ✅ TAMBAH
  './js/home-auth.js',
  './js/berita.js',
  './js/load-galeri.js',
  './js/jurnal.js',
  './js/sehat-core.js',           // ✅ TAMBAH
  './assets/images/sipelita-app.png',
  './assets/images/icon-app.png',
  './assets/images/manbtg-app.png' // ✅ TAMBAH
];

// ══════════════════════════════════════════════
// INSTALL: Cache aset penting
// ══════════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ [SW] Cache dibuka:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.log('⚠️ [SW] Cache gagal:', err))
  );
  self.skipWaiting();
});

// ══════════════════════════════════════════════
// ACTIVATE: Hapus cache lama
// ══════════════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ [SW] Hapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ══════════════════════════════════════════════
// PUSH: Terima notifikasi dari server (FCM)
// ══════════════════════════════════════════════
self.addEventListener('push', event => {
  console.log('📩 [SW] Push diterima');
  
  let data = {
    title: 'SIPELITA',
    body: 'Ada notifikasi baru',
    icon: '/assets/images/manbtg-app.png',
    badge: '/assets/images/manbtg-app.png',
    tag: 'sipelita-push',
    requireInteraction: true,
    vibrate: [300, 150, 300]
  };
  
  if (event.data) {
    try {
      const jsonData = event.data.json();
      data = {
        title: jsonData.title || data.title,
        body: jsonData.body || data.body,
        icon: jsonData.icon || data.icon,
        badge: jsonData.badge || data.badge,
        tag: jsonData.tag || data.tag,
        requireInteraction: jsonData.requireInteraction !== false,
        vibrate: jsonData.vibrate || data.vibrate,
        data: jsonData.data || {}
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      vibrate: data.vibrate,
      data: data.data
    })
  );
});

// ══════════════════════════════════════════════
// NOTIFICATION CLICK: Buka aplikasi saat notif diklik
// ══════════════════════════════════════════════
self.addEventListener('notificationclick', event => {
  console.log('👆 [SW] Notifikasi diklik');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/pages/jadwal-mengajar.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Jika ada tab yang sudah buka, fokus ke tab itu
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Jika tidak ada, buka tab baru
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ══════════════════════════════════════════════
// FETCH: Strategi STALE-WHILE-REVALIDATE
// ══════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip request ke Firebase/Google (selalu ambil dari network)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('firebasestorage')) {
    return;
  }
  
  // Network-First untuk HTML & JS
  if (event.request.destination === 'document' || 
      event.request.url.endsWith('.js') ||
      event.request.url.endsWith('.html')) {
    
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('./index.html');
          });
        })
    );
    return;
  }
  
  // Stale-While-Revalidate untuk CSS & gambar
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      
      return cachedResponse || fetchPromise;
    })
  );
});
