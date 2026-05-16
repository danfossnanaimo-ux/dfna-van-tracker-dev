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
    // ICONS
    // -------------------------------
    const normalIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854894.png",
        iconSize: [32, 32]
    });

    const highlightIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854866.png",
        iconSize: [42, 42]
    });


    // -------------------------------
    // LOAD VAN LOCATIONS
    // -------------------------------
    fetch("data/locations.json")
        .then(res => res.json())
        .then(vans => {
            console.log("Loaded vans:", vans);

            vans.forEach(van => {
                const vanNum = van.vanNumber.toString();

                if (selectedVan && vanNum === selectedVan) {
                    console.log("Highlighting van:", vanNum);

                    L.marker([van.lat, van.lng], { icon: highlightIcon })
                        .addTo(map)
                        .bindPopup(`Van ${vanNum}`);

                    map.setView([van.lat, van.lng], 15);
                } else {
                    L.marker([van.lat, van.lng], { icon: normalIcon })
                        .addTo(map)
                        .bindPopup(`Van ${vanNum}`);
                }
            });
        })
        .catch(err => {
            console.error("Error loading van locations:", err);
            sessionBox.innerText = "Error loading van data";
        });

});
