// Service Worker for Currency PWA
const CACHE_NAME = 'currency-pwa-v1';
const RUNTIME_CACHE = 'currency-runtime-v1';

// Files to cache on install
const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching core files');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cross-origin requests
    if (url.origin !== location.origin && !url.href.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    // Network first for API calls
    if (request.url.includes('/api/') || 
        request.url.includes('exchangerate-api.com') ||
        request.url.includes('coingecko.com') ||
        request.url.includes('nbp.pl')) {
        
        event.respondWith(
            networkFirst(request)
        );
        return;
    }
    
    // Cache first for assets
    event.respondWith(
        cacheFirst(request)
    );
});

// Cache first strategy
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Fetch failed:', error);
        
        // Return offline page if available
        const offlineResponse = await cache.match('/index.html');
        return offlineResponse || new Response('Offline - brak połączenia', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Network first strategy
async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Network request failed, trying cache:', error);
        
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        return new Response(JSON.stringify({
            error: 'Offline - dane z cache niedostępne'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered');
    
    if (event.tag === 'sync-currency-data') {
        event.waitUntil(syncCurrencyData());
    }
});

async function syncCurrencyData() {
    console.log('Syncing currency data...');
    // Implementation for syncing data when back online
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Kursy Walut';
    const options = {
        body: data.body || 'Nowe dane dostępne',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            {
                action: 'open',
                title: 'Otwórz'
            },
            {
                action: 'close',
                title: 'Zamknij'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

// Message handler
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('Service Worker loaded');