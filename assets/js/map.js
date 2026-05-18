// assets/js/map.js

let map;
let vanMarker;
let firstLoad = true;
let yardBoundaryLayer;

// Your yard boundary polygon (from your real coordinates)
const yardBoundaryCoords = [
    [49.04099970424841, -123.86796072616107],
    [49.04104856987419, -123.8678059019293],
    [49.041067364333145, -123.865328714224],
    [49.04103729319556, -123.86520256114628],
    [49.04099594535228, -123.86513948460765],
    [49.04029302675602, -123.86516242153071],
    [49.04014266854696, -123.86700310961727],
    [49.04099970424841, -123.86796072616107] // closing point
];

document.addEventListener("DOMContentLoaded", () => {
    console.log("Map page loaded");

    const driver = localStorage.getItem("driver");
    const van = localStorage.getItem("van");

    if (!driver || !van) {
        alert("Missing scan data. Please restart the app.");
        return;
    }

    // Update top banner
    const infoBar = document.getElementById("infoBar");
    infoBar.textContent = `Tracking Van ${van} — Driver: ${driver}`;

    // Initialize map
    map = L.map("map", {
        zoomControl: true,
        minZoom: 12,
        maxZoom: 20
    });

    // Tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20
    }).addTo(map);

    // Add yard boundary polygon
    yardBoundaryLayer = L.polygon(yardBoundaryCoords, {
        color: "#ff0000",
        weight: 3,
        fillOpacity: 0.15
    }).addTo(map);

    // Fit map to yard on first load
    map.fitBounds(yardBoundaryLayer.getBounds());

    // Start live tracking
    fetchAndUpdate(van);
    setInterval(()
