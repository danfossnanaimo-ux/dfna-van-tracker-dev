// ============================================================
// DFNA VAN TRACKER — OPTIMIZED APP.JS
// Fast tile loading, smooth animation, stable refresh
// ============================================================

// ---------- CONFIG ----------
const DATA_URL = `/dfna-van-tracker-dev/data/locations.json?v=${Date.now()}`;
const REFRESH_INTERVAL = 5000; // 5 seconds
const INITIAL_ZOOM = 17;

// ---------- MAP INITIALIZATION ----------
let map = L.map("map", {
    center: [49.1659, -123.9401], // Nanaimo default
    zoom: INITIAL_ZOOM,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    preferCanvas: true
});

// ---------- FASTEST TILE SERVER (CARTO CDN) ----------
L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap &copy; CARTO"
    }
).addTo(map);

// ---------- MARKER STORAGE ----------
let vanMarkers = {};
let userMarker = null;

// ---------- USER LOCATION ----------
function trackUserLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (!userMarker) {
                userMarker = L.circleMarker([lat, lng], {
                    radius: 10,
                    color: "#00ff00",
                    fillColor: "#00ff00",
                    fillOpacity: 0.8
                }).addTo(map);
            } else {
                userMarker.setLatLng([lat, lng]);
            }
        },
        err => console.warn("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}

// ---------- FETCH VAN DATA ----------
async function fetchVanData() {
    try {
        const response = await fetch(DATA_URL);
        return await response.json();
    } catch (err) {
        console.error("Error loading van data:", err);
        return [];
    }
}

// ---------- UPDATE MARKERS ----------
function updateMarkers(vans) {
    vans.forEach(van => {
        const { VIN, lat, lng } = van;
        if (!lat || !lng) return;

        if (!vanMarkers[VIN]) {
            // Create marker
            vanMarkers[VIN] = L.marker([lat, lng], {
                title: VIN
            }).addTo(map);
        } else {
            // Update marker
            vanMarkers[VIN].setLatLng([lat, lng]);
        }
    });
}

// ---------- VAN-CENTERED ANIMATION ----------
function animateToVan(vans) {
    if (vans.length === 0) return;

    const firstVan = vans[0];
    if (!firstVan.lat || !firstVan.lng) return;

    map.flyTo([firstVan.lat, firstVan.lng], INITIAL_ZOOM, {
        animate: true,
        duration: 1.2
    });

    // Pulse the van marker
    const marker = vanMarkers[firstVan.VIN];
    if (marker && marker._icon) {
        marker._icon.style.transition = "transform 0.4s ease";
        marker._icon.style.transform = "scale(1.3)";
        setTimeout(() => {
            marker._icon.style.transform = "scale(1)";
        }, 400);
    }
}

// ---------- MAIN REFRESH LOOP ----------
async function refresh() {
    const vans = await fetchVanData();
    updateMarkers(vans);
}

// ---------- INITIAL LOAD ----------
(async function init() {
    trackUserLocation();

    const vans = await fetchVanData();
    updateMarkers(vans);
    animateToVan(vans);

    setInterval(refresh, REFRESH_INTERVAL);
})();
