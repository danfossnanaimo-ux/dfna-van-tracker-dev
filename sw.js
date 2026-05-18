self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // BYPASS SW FOR ALL MAP TILES
  if (
    url.hostname.includes("tile") ||
    url.hostname.includes("openstreetmap") ||
    url.pathname.match(/\.(png|jpg|jpeg)$/)
  ) {
    return; // Let browser fetch normally
  }

  // Everything else: network only
  event.respondWith(fetch(event.request));
});
