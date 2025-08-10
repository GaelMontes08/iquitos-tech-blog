// Service Worker for Iquitos Tech
// Cache static assets and implement smart caching strategies

const CACHE_NAME = 'iquitos-tech-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  // Font files are handled by @fontsource-variable/onest package
  // No need to manually cache specific font files
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Handle different types of requests
  if (request.url.includes('/_astro/') || request.url.includes('.woff2')) {
    // Static assets - cache first strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.url.includes('/api/')) {
    // API requests - network first
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (request.url.includes('/posts/') || request.url.includes('/categoria/')) {
    // Content pages - stale while revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else {
    // Default - network first with fallback
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}
