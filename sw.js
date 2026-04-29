const CACHE_NAME = "localflow-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/store.js",
  "./js/calendar.js",
  "./js/tasks.js",
  "./js/alarms.js",
  "./js/nlp.js",
  "./js/ui.js",
  "./js/app.js",
  "./assets/icon.svg",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first strategy for dynamic updates
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Update cache if successful
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(e.request);
      }),
  );
});
