const API_URL = "http://127.0.0.1:8000";


const categoryInput =
    document.getElementById("category");

const locationInput =
    document.getElementById("location");

const radiusInput =
    document.getElementById("radius");

const searchButton =
    document.getElementById("searchButton");

const statusContainer =
    document.getElementById("status");

const resultsContainer =
    document.getElementById("results");


searchButton.addEventListener(
    "click",
    searchBusinesses
);


async function searchBusinesses() {

    const category =
        categoryInput.value;

    const location =
        locationInput.value.trim();

    const radius =
        radiusInput.value;


    if (!location) {

        statusContainer.innerHTML =
            `<div class="error">
                Please enter a location.
            </div>`;

        resultsContainer.innerHTML = "";

        return;
    }


    searchButton.disabled = true;

    searchButton.textContent =
        "Searching...";


    statusContainer.innerHTML =
        `<div class="loading">
            Searching nearby businesses...
        </div>`;

    resultsContainer.innerHTML = "";


    try {

        const params =
            new URLSearchParams({
                location: location,
                category: category,
                radius: radius
            });


        const response =
            await fetch(
                `${API_URL}/places/nearby?${params}`
            );


        if (!response.ok) {

            const errorData =
                await response.json();

            throw new Error(
                errorData.detail ||
                "Failed to search businesses."
            );
        }


        const data =
            await response.json();


        if (data.count === 0) {

            statusContainer.innerHTML =
                `<div class="empty">
                    No businesses found.
                </div>`;

            return;
        }


        statusContainer.innerHTML =
            `<p class="result-count">
                ${data.count}
                business(es) found
            </p>`;


        displayBusinesses(
            data.businesses
        );


    } catch (error) {

        statusContainer.innerHTML =
            `<div class="error">
                ${error.message}
            </div>`;

    } finally {

        searchButton.disabled = false;

        searchButton.textContent =
            "Search Businesses";
    }
}


function displayBusinesses(businesses) {

    resultsContainer.innerHTML = "";


    businesses.forEach(
        (business) => {

            const card =
                document.createElement("article");


            card.className =
                "business-card";


            const website =
                business.website
                    ? `
                        <a
                            href="${business.website}"
                            target="_blank"
                        >
                            Website
                        </a>
                    `
                    : "Not available";


            const phone =
                business.phone ||
                "Not available";


            const rating =
                business.rating !== null &&
                business.rating !== undefined
                    ? `⭐ ${business.rating}/5`
                    : "No rating";


            const distance =
                business.distance_km !== null &&
                business.distance_km !== undefined
                    ? `${business.distance_km} km`
                    : "Distance unavailable";


            card.innerHTML = `

                <div class="business-header">

                    <h3>
                        ${business.name}
                    </h3>

                    <span class="rating">
                        ${rating}
                    </span>

                </div>


                <p>
                    <strong>Address:</strong>
                    ${business.address || "Not available"}
                </p>


                <p>
                    <strong>Distance:</strong>
                    ${distance}
                </p>


                <p>
                    <strong>Phone:</strong>
                    ${phone}
                </p>


                <p>
                    <strong>Website:</strong>
                    ${website}
                </p>


                <p>
                    <strong>Status:</strong>
                    ${
                        business.open_now
                            ? "Open now"
                            : "Closed"
                    }
                </p>


                <a
                    class="map-link"
                    href="${business.google_maps_url || "#"}"
                    target="_blank"
                >
                    View on Google Maps
                </a>

            `;


            resultsContainer.appendChild(card);

        }
    );
}