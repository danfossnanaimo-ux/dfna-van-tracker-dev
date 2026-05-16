self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("dfna-cache").then(cache => {
      return cache.addAll([
        "index.html",
        "manifest.json",
        "dfna_last_locations.js"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
    const url = event.request.url;

    // Always fetch fresh copies of scanner pages
    if (url.includes("van-scan.html") || url.includes("driver-scan.html")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Default: cache-first for everything else
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

