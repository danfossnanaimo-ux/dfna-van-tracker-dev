self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("dfna-cache-v2").then(cache => {
            return cache.addAll([
                "/dfna-van-tracker-dev/index.html",
                "/dfna-van-tracker-dev/manifest.json",
                "/dfna-van-tracker-dev/dfna_last_locations.js"
            ]);
        })
    );
});

self.addEventListener("fetch", event => {
    const url = event.request.url;

    // Never cache scanner pages
    if (
        url.includes("scan-driver.html") ||
        url.includes("scan-van.html") ||
        url.includes("greeting.html") ||
        url.includes("loading.html")
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
