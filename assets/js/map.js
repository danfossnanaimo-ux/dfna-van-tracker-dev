function dbg(msg) {
    const box = document.getElementById("debug");
    if (box) box.textContent += msg + "\n";
    console.log(msg);
}

dbg("map.js loaded");

let map;
let vanMarker;
let firstLoad = true;
let yardBoundaryLayer;

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

document.addEventListener("DOMContentLoaded", () => {
    dbg("DOMContentLoaded fired");

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
});


function fetchAndUpdate(van) {
    dbg("fetchAndUpdate called for van=" + van);

    fetch("/dfna-van-tracker-dev/data/locations.json")
        .then(res => {
            dbg("Fetch response status=" + res.status);
            return res.json();
        })
        .then(locations => {
            dbg("JSON loaded, count=" + locations.length);

            const vanData = locations.find(v => v.van === van);
            dbg("vanData=" + JSON.stringify(vanData));

            if (!vanData) {
                dbg("ERROR: van not found in JSON");
                return;
            }

            const { lat, lng } = vanData;
            dbg("Van coords: " + lat + ", " + lng);

            if (!vanMarker) {
                dbg("Creating van marker…");
                vanMarker = L.marker([lat, lng]).addTo(map);
            } else {
                dbg("Updating van marker…");
                vanMarker.setLatLng([lat, lng]);
            }

            dbg("Van marker updated OK");
        })
        .catch(err => {
            dbg("FETCH ERROR: " + err);
        });
}
