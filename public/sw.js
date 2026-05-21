/**
 * POS System Service Worker
 *
 * Strategy summary:
 *  - /api/trpc/**       → Network Only  (always fresh, no caching)
 *  - /api/**            → Network Only  (auth, stripe — never cache)
 *  - /_next/static/**   → Cache First   (content-hashed, safe to cache forever)
 *  - Static files       → Cache First   (images, fonts, icons, manifest)
 *  - HTML navigation    → Network First with offline fallback to /offline
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE  = `pos-static-${CACHE_VERSION}`;
const PAGE_CACHE    = `pos-pages-${CACHE_VERSION}`;

/** Paths that must NEVER be served from cache */
const NETWORK_ONLY_PREFIXES = [
  "/api/trpc",
  "/api/auth",
  "/api/stripe",
  "/api/",
];

/** Assets to pre-cache on install */
const PRECACHE_URLS = [
  "/offline",
  "/manifest.json",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const KEEP = new Set([STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Network-only paths (tRPC, auth, stripe)
  if (NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. Next.js static assets — Cache First (content-hashed filenames)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 3. Public static files — Cache First
  if (/\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. HTML navigation — Network First with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

// ─── Strategies ───────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstWithFallback(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort: serve the offline page
    const offline = await caches.match("/offline");
    return offline ?? new Response("Offline", { status: 503 });
  }
}
