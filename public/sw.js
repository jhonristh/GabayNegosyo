// GabayNegosyo service worker (L13, fixes K3).
//
// K3 was a real privacy bug: the previous version precached authenticated
// routes (/dashboard, /account, ...) and cached EVERY GET response,
// including cross-origin Supabase auth/API calls, with no per-user
// scoping. On a shared device, or on any flaky-network fetch failure (the
// old fetch handler fell back to cache on ANY rejected fetch, not only
// true offline), that could serve one person's cached authenticated page
// or API response to whoever opens the app next.
//
// This version:
//   - precaches ONLY the offline fallback page and static icons — nothing
//     that could contain a specific person's data;
//   - never touches cross-origin requests, /api/*, anything with an
//     Authorization header, or Next.js RSC payload requests — those go
//     straight to the network, untouched, every time;
//   - cache-first for /_next/static/* (immutable, safe to cache hard);
//   - network-first for page navigations, falling back to /offline only
//     when the network genuinely fails;
//   - supports a "purge" message so the app can clear runtime caches on
//     logout (see components/ServiceWorkerRegistration.tsx).

const CACHE_VERSION = "gn-v2";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ["/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Let the app tell us to drop everything we cached at runtime — called on
// logout so nothing from that session can be served to whoever uses this
// device next.
self.addEventListener("message", (event) => {
  if (event.data === "purge-runtime-cache") {
    event.waitUntil(caches.delete(RUNTIME));
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNeverCached(request, url) {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true; // cross-origin: Supabase, analytics, anything else
  if (url.pathname.startsWith("/api/")) return true;
  if (request.headers.has("authorization")) return true;
  if (url.searchParams.has("_rsc")) return true; // Next.js RSC payload request
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isNeverCached(request, url)) {
    return; // do not intercept — plain network request, every time
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline")))
    );
    return;
  }

  // Everything else same-origin (icons, manifest, etc.): network-first,
  // runtime-cache fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(RUNTIME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
