document.addEventListener("DOMContentLoaded", () => {

    // Read van number
    let selectedVan = localStorage.getItem("dfnaVan");

    // Minimal debugging
    console.log("APP.JS DEBUG — selectedVan =", selectedVan);
    if (!selectedVan || selectedVan === "Unknown") {
        alert("APP.JS DEBUG:\nselectedVan = " + selectedVan);
    }

    // Load user
    const sessionBox = document.getElementById("sessionInfo");
    const user = JSON.parse(localStorage.getItem("dfnaUser") || "{}");
    const userName = user.name || "??";

    sessionBox.innerText = "User: " + userName + " | Van: " + (selectedVan || "??");

    // Initialize map
    const map = L.map("map").setView([49.1659, -123.9401], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const vanIcon = function (number, opacity, isSelected) {
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

    fetch("/dfna-van-tracker-dev/data/locations.json?v=11")
        .then(res => res.json())
        .then(vans => {

            let selectedLat = null;
            let selectedLng = null;

            vans.forEach(v => {
                const num = v.name.split(" ")[0];
                if (num === selectedVan) {
                    selectedLat = v.gps.latitude;
                    selectedLng = v.gps.longitude;
                }
            });

            if (!selectedLat || !selectedLng) return;

            window.selectedVanLat = selectedLat;
            window.selectedVanLng = selectedLng;

            map.setView([selectedLat, selectedLng], 17);

            vans.forEach(v => {
                const num = v.name.split(" ")[0];
                const lat = v.gps.latitude;
                const lng = v.gps.longitude;

                if (!lat || !lng) return;

                const dist = distanceMeters(selectedLat, selectedLng, lat, lng);

                if (num === selectedVan) {
                    L.marker([lat, lng], { icon: vanIcon(num, 1.0, true) }).addTo(map);
                    return;
                }

                if (dist <= 10) {
                    L.marker([lat, lng], { icon: vanIcon(num, 0.3, false) }).addTo(map);
                }
            });

            // MAP READY
            window.parent.postMessage("MAP_READY", "*");

        });

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (!userMarker) {
                userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
            } else {
                userMarker.setLatLng([lat, lng]);
            }

            if (window.selectedVanLat && window.selectedVanLng) {
                const bounds = L.latLngBounds([
                    [lat, lng],
                    [window.selectedVanLat, window.selectedVanLng]
                ]);
                map.fitBounds(bounds, { padding: [80, 80] });
            }

        });
    }

});
