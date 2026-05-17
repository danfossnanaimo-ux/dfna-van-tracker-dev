self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  caches.keys().then(keys => {
    return Promise.all(keys.map(k => caches.delete(k)));
  }).then(() => {
    self.clients.claim();
  });
});

// Do NOT cache anything
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
