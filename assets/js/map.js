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
function vanIcon(number, opacity, isSelected) {
    if (opacity === undefined) opacity = 1.0;
    if (isSelected === undefined) isSelected = false;

    var bg = isSelected ? "#00c853" : "#1976d2";

    var html =
        '<div style="' +
            'width:34px;' +
            'height:34px;' +
            'border-radius:50%;' +
            'background:' + bg + ';' +
            'opacity:' + opacity + ';' +
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

// Pulsing green user marker (no <style> tag, just simple glow)
function makeUserIcon() {
    var html =
        '<div style="position:relative;width:34px;height:34px;">' +
            '<div style="' +
                'position:absolute;' +
                'top:50%;' +
                'left:50%;' +
                'width:20px;' +
                'height:20px;' +
                'background:#00e676;' +
                'border-radius:50%;' +
                'transform:translate(-50%,-50%);' +
                'box-shadow:0 0 10px rgba(0,230,118,0.8);' +
            '"></div>' +
            '<div style="' +
                'position:absolute;' +
                'top:50%;' +
                'left:50%;' +
                'width:34px;' +
                'height:34px;' +
                'border-radius:50%;' +
                'background:rgba(0,230,118,0.25);' +
                'transform:translate(-50%,-50%);' +
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
   INIT (SIMPLE, BULLETPROOF)
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
        dbg("ERROR: Missing scan data");
        alert("Missing scan data. Please restart the app.");
        return;
    }

    if (typeof L === "undefined") {
        dbg("ERROR: Leaflet L is undefined");
        return;
    }

    dbg("Initializing map…");

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

    dbg("Fitting bounds to yard…");
    try {
        map.fitBounds(yardBoundaryLayer.getBounds());
        dbg("Bounds fit OK");
    } catch (e) {
        dbg("ERROR fitting bounds: " + e);
    }

    dbg("Starting fetchAndUpdate…");
    fetchAndUpdate(van);

    dbg("Starting interval…");
    setInterval(function () {
        fetchAndUpdate(van);
    }, 10000);
}

/* ---------------------------------------------------------
   FETCH + UPDATE MARKERS
--------------------------------------------------------- */

function fetchAndUpdate(van) {
    dbg("fetchAndUpdate called for van=" + van);

    fetch("./data/locations.json")
        .then(function (res) {
            dbg("Fetch response status=" + res.status);
            return res.json();
        })
        .then(function (locations) {
            dbg("JSON loaded, count=" + locations.length);

            var vanData = locations.find(function (v) {
                return v.vin === van;
            });

            dbg("vanData=" + JSON.stringify(vanData));

            if (!vanData) {
                dbg("ERROR: van not found in JSON");
                return;
            }

            var lat = vanData.gps.latitude;
            var lng = vanData.gps.longitude;

            // Extract van number from "209 DFNA"
            var name = vanData.name || "";
            var vanNumber = name.split(" ")[0] || "??";

            dbg("Van coords: " + lat + ", " + lng + " number=" + vanNumber);

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

            // UPDATE USER + FIT VIEW
            updateUserAndFit(lat, lng);
        })
        .catch(function (err) {
            dbg("FETCH ERROR: " + err);
        });
}

/* ---------------------------------------------------------
   USER + AUTO-FIT
--------------------------------------------------------- */

function updateUserAndFit(vanLat, vanLng) {
    if (!navigator.geolocation) {
        dbg("Geolocation not available; centering on van only");
        if (vanMarker) {
            map.setView([vanLat, vanLng], 18);
        }
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            var uLat = pos.coords.latitude;
            var uLng = pos.coords.longitude;

            if (!userMarker) {
                dbg("Creating user marker…");
                userMarker = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
            } else {
                userMarker.setLatLng([uLat, uLng]);
            }

            // ALWAYS FIT BOTH USER + VAN
            if (vanMarker && userMarker) {
                var group = L.featureGroup([vanMarker, userMarker]);
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
                dbg("Fitted bounds to user + van");
            }
        },
        function (err) {
            dbg("Geolocation error: " + err.message);
            if (vanMarker) {
                map.setView([vanLat, vanLng], 18);
            }
        }
    );
}
