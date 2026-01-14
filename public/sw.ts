/// <reference lib="webworker" />

/**
 * Nexon EV Range - Service Worker
 * Provides offline support, caching, and background sync
 */

const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `nexon-ev-cache-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/route",
  "/settings",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Map tile cache settings
const MAP_TILE_CACHE = "nexon-ev-map-tiles";
const MAX_MAP_TILES = 500; // Limit cached tiles

// API cache settings
const API_CACHE = "nexon-ev-api-cache";
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Maharashtra bounding box for priority caching
const MAHARASHTRA_BOUNDS = {
  north: 22.0,
  south: 15.6,
  east: 80.9,
  west: 72.6,
};

declare const self: ServiceWorkerGlobalScope;

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("nexon-ev-") && name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle map tiles
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
    return;
  }

  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and navigation
  event.respondWith(handleStaticRequest(request));
});

// Check if URL is a map tile request
function isMapTileRequest(url: URL): boolean {
  return (
    url.hostname.includes("openstreetmap.org") ||
    url.hostname.includes("tile.osm.org") ||
    url.pathname.includes("/tiles/")
  );
}

// Check if URL is an API request
function isApiRequest(url: URL): boolean {
  return (
    url.pathname.startsWith("/api/") || url.hostname.includes("localhost:7071")
  );
}

// Handle map tile requests with cache-first strategy
async function handleMapTileRequest(request: Request): Promise<Response> {
  const cache = await caches.open(MAP_TILE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Refresh in background if stale
    refreshMapTileInBackground(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone and cache
      const responseToCache = networkResponse.clone();

      // Limit cache size
      await limitCacheSize(cache, MAX_MAP_TILES);
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Return placeholder tile if offline
    return createPlaceholderTile();
  }
}

// Refresh map tile in background
async function refreshMapTileInBackground(
  request: Request,
  cache: Cache
): Promise<void> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
    }
  } catch {
    // Ignore background refresh failures
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log("[SW] Serving API from cache:", request.url);
      return cachedResponse;
    }

    // Return offline error
    return new Response(
      JSON.stringify({ error: "Offline - no cached data available" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlinePage = await cache.match("/");
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response("Offline", { status: 503 });
  }
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cache: Cache, maxItems: number): Promise<void> {
  const keys = await cache.keys();

  if (keys.length >= maxItems) {
    // Remove oldest 10% of entries
    const toDelete = Math.floor(maxItems * 0.1);
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Create a placeholder tile for offline
function createPlaceholderTile(): Response {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="256" height="256" fill="#E5E5EA"/>
      <text x="128" y="128" text-anchor="middle" fill="#8E8E93" font-size="14">
        Offline
      </text>
    </svg>
  `;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

// Background sync for trip data
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-trips") {
    event.waitUntil(syncTripsInBackground());
  }
});

// Sync trips when back online
async function syncTripsInBackground(): Promise<void> {
  console.log("[SW] Syncing trips in background...");

  // Get pending trips from IndexedDB
  // This would be implemented with IndexedDB integration
  // For now, just log
  console.log("[SW] Background sync completed");
}

// Push notifications (optional)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: data.tag || "nexon-ev-notification",
      data: data.data,
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Periodic background sync for crowd data updates
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-crowd-data") {
    event.waitUntil(updateCrowdDataInBackground());
  }
});

async function updateCrowdDataInBackground(): Promise<void> {
  console.log("[SW] Updating crowd data in background...");
  // Implementation would fetch latest crowd segments
}

export {};
