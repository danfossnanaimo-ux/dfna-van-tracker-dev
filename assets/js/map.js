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
let firstFitDone = false;

/* ---------------------------------------------------------
   UI CLEANUP
--------------------------------------------------------- */

function hideLoadingAndDebug() {
    var loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";

    var debugBox = document.getElementById("debug");
    if (debugBox) debugBox.style.display = "none";
}

/* ---------------------------------------------------------
   CUSTOM MARKERS
--------------------------------------------------------- */

// Blue circular van marker with number
function vanIcon(number) {
    var html =
        '<div style="' +
            'width:34px;' +
            'height:34px;' +
            'border-radius:50%;' +
            'background:#1976d2;' +
            'display:flex;' +
            'align-items:center;' +
            'justify-content:center;' +
            'color:white;' +
            'font-weight:bold;' +
            'font-size:14px;' +
            'border:2px solid white;' +
            'box-shadow:0 0 6px rgba(0,0,0,0.4);' +
        '">' +
            number +
        '</div>';

    return L.divIcon({
        html: html,
        className: "",
        iconSize: [34, 34]
    });
}

// Pulsing green user marker (simple glow)
function makeUserIcon() {
    var html =
        '<div style="position:relative;width:34px;height:34px;">' +
            '<div style="' +
                'position:absolute;' +
                'top:50%;left:50%;' +
                'width:20px;height:20px;' +
                'background:#00e676;' +
                'border-radius:50%;' +
                'transform:translate(-50%,-50%);' +
                'box-shadow:0 0 12px rgba(0,230,118,0.9);' +
            '"></div>' +
        '</div>';

    return L.divIcon({
        html: html,
        className: "",
        iconSize: [34, 34]
    });
}

var userIcon = makeUserIcon();

/* ---------------------------------------------------------
   YARD BOUNDARY
--------------------------------------------------------- */

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
   INIT (SAFE, SIMPLE)
--------------------------------------------------------- */

window.addEventListener("load", init);

function init() {
    dbg("window.load fired (init)");

    const user = JSON.parse(localStorage.getItem("dfnaUser") || "{}");
    const driver = user.name || "Unknown";
    const van = localStorage.getItem("dfnaVIN");

    dbg("driver=" + driver);
    dbg("van=" + van);

    if (!driver || !van) {
        alert("Missing scan data. Please restart the app.");
        return;
    }

    if (typeof L === "undefined") {
        dbg("ERROR: Leaflet L is undefined");
        return;
    }

    map = L.map("map", {
        zoomControl: true,
        minZoom: 12,
        maxZoom: 20
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20
    }).addTo(map);

    yardBoundaryLayer = L.polygon(yardBoundaryCoords, {
        color: "#ff0000",
        weight: 3,
        fillOpacity: 0.15
    }).addTo(map);

    map.fitBounds(yardBoundaryLayer.getBounds());

    fetchAndUpdate(van);
    setInterval(function () { fetchAndUpdate(van); }, 10000);
}

/* ---------------------------------------------------------
   FETCH + UPDATE MARKERS
--------------------------------------------------------- */

function fetchAndUpdate(van) {
    fetch("/dfna-van-tracker-dev/data/locations.json")
        .then(function (res) { return res.json(); })
        .then(function (locations) {

            var vanData = locations.find(function (v) { return v.vin === van; });
            if (!vanData) return;

            var lat = vanData.gps.latitude;
            var lng = vanData.gps.longitude;

            // Extract van number from "209 DFNA"
            var vanNumber = (vanData.name || "").split(" ")[0] || "??";

            // VAN MARKER
            if (!vanMarker) {
                vanMarker = L.marker([lat, lng], { icon: vanIcon(vanNumber) }).addTo(map);
            } else {
                vanMarker.setLatLng([lat, lng]);
                vanMarker.setIcon(vanIcon(vanNumber));
            }

            updateUserAndFit(lat, lng);
        });
}

/* ---------------------------------------------------------
   USER + AUTO-FIT BOTH MARKERS
--------------------------------------------------------- */

function updateUserAndFit(vanLat, vanLng) {
    if (!navigator.geolocation) {
        map.setView([vanLat, vanLng], 18);
        hideLoadingAndDebug();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            var uLat = pos.coords.latitude;
            var uLng = pos.coords.longitude;

            if (!userMarker) {
                userMarker = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
            } else {
                userMarker.setLatLng([uLat, uLng]);
            }

            // ALWAYS FIT BOTH USER + VAN
            if (vanMarker && userMarker) {
                var group = L.featureGroup([vanMarker, userMarker]);
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }

            hideLoadingAndDebug();
        },
        function () {
            // If geolocation fails, center on van
            if (vanMarker) map.setView([vanLat, vanLng], 18);
            hideLoadingAndDebug();
        }
    );
}
