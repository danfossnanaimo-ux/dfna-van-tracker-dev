document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------
    // LOAD SESSION
    // -------------------------------
    const session = JSON.parse(localStorage.getItem("dfnaSession") || "{}");

    console.log("Loaded session:", session);

    let selectedVan = null;

    if (session && session.vanNumber) {
        selectedVan = session.vanNumber.toString();
    } else {
        console.warn("No vanNumber in session");
    }

    // Display session info
    const sessionBox = document.getElementById("sessionInfo");
    sessionBox.innerText =
        `User: ${session.user?.name || "??"} | Van: ${selectedVan || "??"}`;


    // -------------------------------
    // INITIALIZE MAP
    // -------------------------------
    const map = L.map("map").setView([49.1659, -123.9401], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);


    // -------------------------------
    // ICONS (LABEL OVERLAY)
    // -------------------------------
    const vanIcon = (number, opacity = 1.0, isSelected = false) =>
        L.divIcon({
            html: `
                <div style="
                    position: relative;
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: ${isSelected ? "#00ff00" : "#007bff"};
                    opacity: ${opacity};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                    border: 2px solid white;
                ">
                    ${number}
                </div>
            `,
            className: "",
            iconSize: [34, 34]
        });


    // -------------------------------
    // DISTANCE FUNCTION (meters)
    // -------------------------------
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


    // -------------------------------
    // LOAD VAN LOCATIONS
    // -------------------------------
    fetch("/dfna-van-tracker-dev/data/locations.json?v=6")
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch JSON: " + res.status);
            return res.json();
        })
        .then(vans => {
            console.log("Loaded vans:", vans);

            // Find selected van first
            let selectedLat = null;
            let selectedLng = null;

            vans.forEach(van => {
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

            // Auto-zoom to selected van
            map.setView([selectedLat, selectedLng], 17);

            // Render vans
            vans.forEach(van => {
                const vanNum = van.name.split(" ")[0];
                const lat = van.gps.latitude;
                const lng = van.gps.longitude;

                if (!lat || !lng) return;

                const dist = distanceMeters(selectedLat, selectedLng, lat, lng);

                // Selected van
                if (vanNum === selectedVan) {
                    L.marker([lat, lng], {
                        icon: vanIcon(vanNum, 1.0, true)
                    }).addTo(map);
                    return;
                }

                // Nearby vans (within 10 meters)
                if (dist <= 10) {
                    L.marker([lat, lng], {
                        icon: vanIcon(vanNum, 0.3, false)
                    }).addTo(map);
                }

                // All other vans are hidden
            });
        })
        .catch(err => {
            console.error("Error loading van locations:", err);
            sessionBox.innerText = "Error loading van data";
        });

});
