/* =========================================================
   CINEVAULT — SERVICE WORKER
   Phase 6: Offline support + Caching strategy
========================================================= */

const CACHE_VERSION = "cinevault-v1";
const CACHE_NAME = CACHE_VERSION;

// Files to cache for offline access
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  // Styles
  "./styles/main.css",
  "./styles/themes.css",
  "./styles/animations.css",
  "./styles/watch.css",
  "./styles/episodes.css",
  "./styles/reviews.css",
  "./styles/visuals.css",
  "./styles/discovery.css",
  "./styles/advanced.css",
  "./styles/pro.css",
  "./styles/custom.css",

  // Scripts
  "./scripts/config.js",
  "./scripts/api.js",
  "./scripts/auth.js",
  "./scripts/watch.js",
  "./scripts/app.js",
  "./scripts/episodes.js",
  "./scripts/reviews.js",
  "./scripts/visuals.js",
  "./scripts/sounds.js",
  "./scripts/discovery.js",
  "./scripts/advanced.js",
  "./scripts/pro.js",
  "./scripts/custom.js",
  "./scripts/features.js"
];

/* =========================================================
   INSTALL EVENT
   Cache static assets on install
========================================================= */
self.addEventListener("install", function (event) {
  console.log("🔧 Service Worker installing…");

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("📦 Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn("⚠️ Some assets failed to cache:", err);
        // Continue even if some fail
      });
    }).then(function () {
      console.log("✅ Service Worker installed");
      return self.skipWaiting();
    })
  );
});

/* =========================================================
   ACTIVATE EVENT
   Clean up old caches
========================================================= */
self.addEventListener("activate", function (event) {
  console.log("🔧 Service Worker activating…");

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (name) {
          if (name !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", name);
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      console.log("✅ Service Worker activated");
      return self.clients.claim();
    })
  );
});

/* =========================================================
   FETCH EVENT
   Strategy:
   - HTML pages: Network first, fallback to cache
   - Static assets (CSS/JS): Cache first, fallback to network
   - API calls (TMDB, Firebase): Network only (never cache)
   - Images: Cache first
========================================================= */
self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other schemes
  if (!url.protocol.startsWith("http")) return;

  // API calls: network only (TMDB, Firebase, iTunes, etc.)
  if (
    url.hostname.includes("api.themoviedb.org") ||
    url.hostname.includes("itunes.apple.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firestore") ||
    url.hostname.includes("actions.google.com")
  ) {
    // Let network handle it
    return;
  }

  // HTML navigation requests: network first
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Cache a copy
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          }).catch(function () {});
          return response;
        })
        .catch(function () {
          // Offline: serve cached
          return caches.match(request).then(function (cached) {
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // CSS / JS / Fonts: cache first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;

        return fetch(request).then(function (response) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          }).catch(function () {});
          return response;
        }).catch(function () {
          // Return empty on failure
          return new Response("", { status: 404 });
        });
      })
    );
    return;
  }

  // Images: cache first with network fallback
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;

        return fetch(request).then(function (response) {
          // Only cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            }).catch(function () {});
          }
          return response;
        }).catch(function () {
          // Return placeholder on failure
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#1a1030"/><text x="150" y="225" font-size="60" text-anchor="middle" fill="#ffb800" font-family="Arial">🎬</text></svg>',
            { headers: { "Content-Type": "image/svg+xml" } }
          );
        });
      })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          }).catch(function () {});
        }
        return response;
      })
      .catch(function () {
        return caches.match(request);
      })
  );
});

/* =========================================================
   MESSAGE EVENT
   Allow app to trigger cache updates
========================================================= */
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        return caches.delete(name);
      }));
    }).then(function () {
      console.log("🗑️ All caches cleared");
    });
  }
});

console.log("🎬 CineVault Service Worker loaded");