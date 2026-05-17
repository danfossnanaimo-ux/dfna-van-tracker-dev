document.addEventListener("DOMContentLoaded", () => {

    // --- GET VIN FROM LOCAL STORAGE & SANITIZE ---
    let selectedVIN = (localStorage.getItem("dfnaVIN") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .trim();

    console.log("Selected VIN:", selectedVIN);

    // --- SESSION INFO BAR ---
    const sessionBox = document.getElementById("sessionInfo");
    const user = JSON.parse(localStorage.getItem("dfnaUser") || "{}");
    const userName = user.name || "??";
    sessionBox.innerText = "User: " + userName + " | VIN: " + (selectedVIN || "??");

    // --- MAP INIT ---
    window.map = L.map("map", {
        zoomControl: true,
        attributionControl: false
    }).setView([49.1659, -123.9401], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(window.map);

    // Force Leaflet to size correctly inside iframe
    setTimeout(() => {
        window.map.invalidateSize();
    }, 400);

    // --- ICONS ---
    const vanIcon = function (label, opacity, isSelected) {
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
                    font-size: 12px;
                    border: 2px solid white;
                    box-shadow: 0 0 6px rgba(0,0,0,0.4);
                ">
                    ${label}
                </div>
            `,
            className: "",
            iconSize: [34, 34]
        });
    };

    const userIcon = L.divIcon({
        html: `
            <div class="user-pulse">
                <div class="pulse-ring"></div>
                <div class="inner-dot"></div>
            </div>
        `,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    let userMarker = null;

    // --- DISTANCE HELPER ---
    function distanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // --- VAN NUMBER EXTRACTOR ---
    function extractVanNumber(name) {
        const match = name.match(/\b\d+\b/);
        return match ? match[0] : "Unknown";
    }

    // --- LOAD VAN LOCATIONS ---
    fetch("data/locations.json?v=999")
        .then(res => res.json())
        .then(vans => {

            console.log("Available VINs:");
            vans.forEach(v => console.log(v.vin));

            let selectedLat = null;
            let selectedLng = null;
            let vanNumber = "Unknown";

            // --- FIND MATCHING VIN ---
            vans.forEach(v => {
                if (!v.vin) return;

                const cleanVIN = v.vin.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

                if (cleanVIN === selectedVIN) {
                    selectedLat = v.gps.latitude;
                    selectedLng = v.gps.longitude;
                    vanNumber = extractVanNumber(v.name || "");
                }
            });

            // --- IF NO MATCH, STOP ---
            if (!selectedLat || !selectedLng) {
                console.error("VIN not found in locations.json");
                return;
            }

            // --- SEND MAP_READY TO loading.html ---
            window.parent.postMessage({
                type: "MAP_READY",
                vanNumber: vanNumber
            }, "*");

            // --- CENTER MAP ON SELECTED VAN ---
            window.selectedVanLat = selectedLat;
            window.selectedVanLng = selectedLng;
            window.map.setView([selectedLat, selectedLng], 17);

            // --- DRAW ALL VANS ---
            vans.forEach(v => {
                const lat = v.gps.latitude;
                const lng = v.gps.longitude;
                if (!lat || !lng) return;

                const label = extractVanNumber(v.name || "");
                const cleanVIN = v.vin.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

                if (cleanVIN === selectedVIN) {
                    L.marker([lat, lng], { icon: vanIcon(label, 1.0, true) }).addTo(window.map);
                    return;
                }

                const dist = distanceMeters(selectedLat, selectedLng, lat, lng);
                if (dist <= 10) {
                    L.marker([lat, lng], { icon: vanIcon(label, 0.3, false) }).addTo(window.map);
                }
            });

        });

    // --- USER LOCATION TRACKING ---
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (!userMarker) {
                userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(window.map);
            } else {
                userMarker.setLatLng([lat, lng]);
            }

            if (window.selectedVanLat && window.selectedVanLng) {
                const bounds = L.latLngBounds([
                    [lat, lng],
                    [window.selectedVanLat, window.selectedVanLng]
                ]);
                window.map.fitBounds(bounds, { padding: [80, 80] });
            }

        });
    }

});
