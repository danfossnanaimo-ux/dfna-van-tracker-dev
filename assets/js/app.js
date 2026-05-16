document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------
    // LOAD SESSION (NO OPTIONAL CHAINING)
    // -------------------------------
    let session = {};
    try {
        session = JSON.parse(localStorage.getItem("dfnaSession") || "{}");
    } catch (e) {
        console.warn("Failed to parse session:", e);
        session = {};
    }

    let selectedVan = null;
    if (session && session.vanNumber) {
        selectedVan = String(session.vanNumber);
    }

    const sessionBox = document.getElementById("sessionInfo");
    const userName =
        session && session.user && session.user.name
            ? session.user.name
            : "??";

    sessionBox.innerText = "User: " + userName + " | Van: " + (selectedVan || "??");


    // -------------------------------
    // INITIALIZE MAP
    // -------------------------------
    const map = L.map("map").setView([49.1659, -123.9401], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);


    // -------------------------------
    // MARKER ICONS
    // -------------------------------
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


    // -------------------------------
    // DISTANCE FUNCTION
    // -------------------------------
    function distanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }


    // -------------------------------
    // LOAD VAN LOCATIONS
    // -------------------------------
    fetch("/dfna-van-tracker-dev/data/locations.json?v=9")
        .then(function (res) {
            if (!res.ok) throw new Error("Failed to fetch JSON: " + res.status);
            return res.json();
        })
        .then(function (vans) {

            let selectedLat = null;
            let selectedLng = null;

            // Find selected van
            vans.forEach(function (van) {
                const vanNum = van.name.split(" ")[0];
                if (vanNum === selectedVan) {
                    selectedLat = van.gps.latitude;
                    selectedLng = van.gps.longitude;
                }
            });

            if (!selectedLat || !selectedLng) {
                console.error("Selected van not found in JSON");
                return;
            }

            window.selectedVanLat = selectedLat;
            window.selectedVanLng = selectedLng;

            map.setView([selectedLat, selectedLng], 17);

            // Render vans
            vans.forEach(function (van) {
                const vanNum = van.name.split(" ")[0];
                const lat = van.gps.latitude;
                const lng = van.gps.longitude;

                if (!lat || !lng) return;

                const dist = distanceMeters(selectedLat, selectedLng, lat, lng);

                if (vanNum === selectedVan) {
                    L.marker([lat, lng], {
                        icon: vanIcon(vanNum, 1.0, true)
                    }).addTo(map);
                    return;
                }

                if (dist <= 10) {
                    L.marker([lat, lng], {
                        icon: vanIcon(vanNum, 0.3, false)
                    }).addTo(map);
                }
            });

        })
        .catch(function (err) {
            console.error("Error loading van locations:", err);
            sessionBox.innerText = "Error loading van data";
        });


    // -------------------------------
    // USER LOCATION TRACKING
    // -------------------------------
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (pos) {
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
            },
            function (err) {
                console.warn("User location unavailable:", err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 5000
            }
        );
    }

});
