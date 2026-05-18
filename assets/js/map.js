function dbg(msg) {
    const box = document.getElementById("debug");
    if (box) box.textContent += msg + "\n";
    console.log(msg);
}

dbg("map.js loaded");

let map;
let vanMarker;
let userMarker;
let yardBoundaryLayer;

/* ---------------------------------------------------------
   CUSTOM MARKERS
--------------------------------------------------------- */

// Blue circular van marker with number
function vanIcon(number, opacity = 1.0, isSelected = false) {
    return L.divIcon({
        html: `
            <div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: ${isSelected ? "#00c853" : "#1976d2"};
                opacity: ${opacity};
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                border: 2px solid white;
                box-shadow: 0 0 6px rgba(0,0,0,0.4);
            ">
                ${number}
            </div>
        `,
        className: "",
        iconSize: [34, 34]
    });
}

// Pulsing green user marker
const userIcon = L.divIcon({
    html: `
        <div style="position: relative; width: 34px; height: 34px;">
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                background: #00e676;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px rgba(0, 230, 118, 0.8);
            "></div>

            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: rgba(0, 230, 118, 0.25);
                transform: translate(-50%, -50%);
                animation: pulse 1.5s infinite;
            "></div>
        </div>

        <style>
        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
        </style>
    `,
    className: "",
    iconSize: [34, 34]
});

/* ---------------------------------------------------------
   YARD BOUNDARY
--------------------------------------------------------- */

dbg("Defining yard boundary…");

const yardBoundaryCoords = [
    [49.04099970424841, -123.86796072616107],
    [49.04104856987419, -123.8678059019293],
    [49.041067364333145, -123.865328714224],
    [49.04103729319556, -123.86520256114628],
    [49.04099594535228, -123.86513948460765],
    [49.04029302675602, -123.86516242153071],
    [49.04014266854696, -123.86700310961727],
    [49.04099970424841, -123.86796072616107]
];

/* ---------------------------------------------------------
   BULLETPROOF INITIALIZER
--------------------------------------------------------- */

(function init() {
    if (document.readyState === "loading") {
        dbg("DOM not ready yet — waiting…");
        document.addEventListener("DOMContentLoaded", init);
        return;
    }

    dbg("DOMContentLoaded fired (safe init)");

    const user = JSON.parse(localStorage.getItem("dfnaUser") || "{}");
    const driver = user.name || "Unknown";
    const van = localStorage.getItem("dfnaVIN");

    dbg("driver=" + driver);
    dbg("van=" + van);

    if (!driver || !van) {
        dbg("ERROR: Missing scan data");
        alert("Missing scan data. Please restart the app.");
        return;
    }

    dbg("Initializing map…");

    if (typeof L === "undefined") {
        dbg("ERROR: Leaflet L is undefined");
        return;
    }

    map = L.map("map", {
        zoomControl: true,
        minZoom: 12,
        maxZoom: 20
    });

    dbg("Adding tile layer…");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20
    }).addTo(map);

    dbg("Adding yard boundary polygon…");
    try {
        yardBoundaryLayer = L.polygon(yardBoundaryCoords, {
            color: "#ff0000",
            weight: 3,
            fillOpacity: 0.15
        }).addTo(map);
        dbg("Yard boundary added");
    } catch (e) {
        dbg("ERROR adding yard boundary: " + e);
    }

    dbg("Fitting bounds…");
    try {
        map.fitBounds(yardBoundaryLayer.getBounds());
        dbg("Bounds fit OK");
    } catch (e) {
        dbg("ERROR fitting bounds: " + e);
    }

    dbg("Starting fetchAndUpdate…");
    fetchAndUpdate(van);

    dbg("Starting interval…");
    setInterval(() => fetchAndUpdate(van), 10000);
})();

/* ---------------------------------------------------------
   FETCH + UPDATE MARKERS
--------------------------------------------------------- */

function fetchAndUpdate(van) {
    dbg("fetchAndUpdate called for van=" + van);

    fetch("/dfna-van-tracker-dev/data/locations.json")
        .then(res => {
            dbg("Fetch response status=" + res.status);
            return res.json();
        })
        .then(locations => {
            dbg("JSON loaded, count=" + locations.length);

            const vanData = locations.find(v => v.vin === van);
            dbg("vanData=" + JSON.stringify(vanData));

            if (!vanData) {
                dbg("ERROR: van not found in JSON");
                return;
            }

            const lat = vanData.gps.latitude;
            const lng = vanData.gps.longitude;

            // Extract van number from "209 DFNA"
            const vanNumber = (vanData.name || "").split(" ")[0];

            dbg("Van coords: " + lat + ", " + lng);

            // VAN MARKER
            if (!vanMarker) {
                dbg("Creating van marker…");
                vanMarker = L.marker([lat, lng], {
                    icon: vanIcon(vanNumber)
                }).addTo(map);
            } else {
                dbg("Updating van marker…");
                vanMarker.setLatLng([lat, lng]);
                vanMarker.setIcon(vanIcon(vanNumber));
            }

            // USER MARKER
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;

                    if (!userMarker) {
                        dbg("Creating user marker…");
                        userMarker = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
                    } else {
                        userMarker.setLatLng([uLat, uLng]);
                    }

                    // ALWAYS FIT BOTH USER + VAN
                    const group = L.featureGroup([vanMarker, userMarker]);
                    map.fitBounds(group.getBounds(), { padding: [50, 50] });
                });
            }

            dbg("Van marker updated OK");
        })
        .catch(err => {
            dbg("FETCH ERROR: " + err);
        });
}
