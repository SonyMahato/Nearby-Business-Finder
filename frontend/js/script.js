
const API_URL = "http://127.0.0.1:8000/places/nearby";
const SAVED_KEY = "nearbyBusinessFinderSaved";

let allBusinesses = [];
let displayedBusinesses = [];
let showingSavedOnly = false;

const $ = (id) => document.getElementById(id);

const CATEGORY_OPTIONS = [
    { value: "all", label: "All Businesses" },
    { value: "cafe", label: "Cafes" },
    { value: "restaurant", label: "Restaurants" },
    { value: "hospital", label: "Hospitals" },
    { value: "pharmacy", label: "Pharmacies" },
    { value: "bank", label: "Banks" },
    { value: "atm", label: "ATMs" },
    { value: "salon", label: "Salons" },
    { value: "gym", label: "Gyms" },
    { value: "hotel", label: "Hotels" },
    { value: "supermarket", label: "Supermarkets" },
    { value: "shopping_mall", label: "Shopping Malls" },
    { value: "school", label: "Schools" },
    { value: "bakery", label: "Bakeries" },
    { value: "dentist", label: "Dentists" },
    { value: "doctor", label: "Doctors" },
    { value: "gas_station", label: "Petrol Stations" },
    { value: "car_repair", label: "Car Repair" },
    { value: "plumber", label: "Plumbers" },
    { value: "home_services", label: "Home Services" },
    { value: "pet_services", label: "Pet Services" },
    { value: "retail", label: "Retail Stores" },
    { value: "library", label: "Libraries" },
    { value: "park", label: "Parks" }
];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getSavedBusinesses() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveBusinesses(items) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
}

function getBusinessId(business) {
    return String(
        business.place_id ||
        business.id ||
        `${business.name || "business"}-${business.address || ""}`
    );
}

function isSaved(business) {
    const id = getBusinessId(business);

    return getSavedBusinesses().some(
        (item) => getBusinessId(item) === id
    );
}

function setStatus(message, isError = false) {
    const status = $("searchStatus") || $("listingStat") || $("status");

    if (status) {
        status.textContent = message;
        status.style.color = isError ? "#dc2626" : "";
    }

    console.log(message);
}

function populateCategories() {
    const select = $("categorySelect") || $("category");
    if (!select) return;

    // Preserve the HTML options when they are already defined.
    if (select.options.length === 0) {
        CATEGORY_OPTIONS.forEach(({ value, label }) => {
            select.add(new Option(label, value));
        });
    }
}

function populateRadiusOptions() {
    const select = $("radiusSelect") || $("radius");
    if (!select) return;

    const options = [
        { value: "1", label: "1 km" },
        { value: "2", label: "2 km" },
        { value: "5", label: "5 km" },
        { value: "10", label: "10 km" },
        { value: "25", label: "25 km" }
    ];

    const validValues = options.map((option) => option.value);
    const currentValue = String(select.value);

    if (
        select.options.length === 0 ||
        !validValues.includes(currentValue)
    ) {
        select.replaceChildren();

        options.forEach(({ value, label }) => {
            select.add(new Option(label, value));
        });

        select.value = "5";
    }
}

function normalizeBusiness(business) {
    const name = business.name || "Unnamed Business";
    const address = business.address || business.vicinity || "Address unavailable";

    const latitude = business.latitude;
    const longitude = business.longitude;

    const mapUrl =
        business.google_maps_url ||
        business.maps_url ||
        (
            latitude != null && longitude != null
                ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${name} ${address}`
                )}`
        );

    return {
        ...business,
        place_id: business.place_id || business.id || `${name}-${address}`,
        name,
        address,
        rating: Number(business.rating ?? 0),
        phone: business.phone || business.phone_number || "",
        website: business.website || "",
        is_open: business.is_open ?? business.open_now ?? null,
        distance_km:
            business.distance_km == null
                ? null
                : Number(business.distance_km),
        google_maps_url: mapUrl
    };
}

function removeDuplicateBusinesses(businesses) {
    const seen = new Set();

    return businesses.filter((business) => {
        const id = getBusinessId(business);

        if (seen.has(id)) return false;

        seen.add(id);
        return true;
    });
}

async function searchBusinesses(event) {
    if (event) event.preventDefault();

    const locationInput = $("locationInput") || $("location");
    const categorySelect = $("categorySelect") || $("category");
    const radiusSelect = $("radiusSelect") || $("radius");
    const searchButton = $("searchButton");

    const location = locationInput?.value.trim() || "";
    const category = categorySelect?.value || "all";
    const radiusKm = Number(radiusSelect?.value || 5);

    if (location.length < 2) {
        setStatus("Please enter a location with at least 2 characters.", true);
        locationInput?.focus();
        return;
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 25) {
        setStatus("Choose a radius between 1 and 25 km.", true);
        return;
    }

    showingSavedOnly = false;

    const params = new URLSearchParams({
        location,
        category,
        radius: String(radiusKm)
    });

    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = "Searching...";
    }

    setStatus(`Searching for ${category === "all" ? "businesses" : category.replaceAll("_", " ")} within ${radiusKm} km...`);

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            const detail = Array.isArray(data.detail)
                ? data.detail.map((item) => item.msg).join(", ")
                : data.detail;

            throw new Error(detail || `Request failed (${response.status})`);
        }

        const results = Array.isArray(data)
            ? data
            : data.businesses || data.results || data.data || [];

        if (!Array.isArray(results)) {
            throw new Error("The backend returned an unexpected response.");
        }

        allBusinesses = removeDuplicateBusinesses(
            results.map(normalizeBusiness)
        );

        applyFiltersAndSort();

        const count = $("resultCount");
        if (count) count.textContent = `${displayedBusinesses.length} results`;

        if (allBusinesses.length === 0) {
            setStatus(
                "No demo businesses matched this category and radius. Try All Businesses or a larger radius."
            );
        } else {
            setStatus(`Found ${allBusinesses.length} businesses. Demo records may not represent real places near your entered location.`);
        }
    } catch (error) {
        console.error("Business search failed:", error);
        setStatus(`Search failed: ${error.message}`, true);
    } finally {
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = "Search";
        }
    }
}

function getFilteredBusinesses() {
    let results = [...allBusinesses];

    const nameFilter = $("nameFilter") || $("nameSearch");
    const openFilter = $("openNowFilter") || $("openNow");
    const phoneFilter = $("phoneFilter") || $("hasPhone");
    const websiteFilter = $("websiteFilter") || $("hasWebsite");
    const ratingFilter = $("minRating") || $("minimumRating");
    const sortSelect = $("sortSelect") || $("sortBy");

    const searchText = nameFilter?.value.trim().toLowerCase() || "";

    if (searchText) {
        results = results.filter((business) =>
            `${business.name} ${business.address}`
                .toLowerCase()
                .includes(searchText)
        );
    }

    // These are select elements in the current HTML, not checkboxes.
    if (openFilter && openFilter.value === "open") {
        results = results.filter((business) => business.is_open === true);
    } else if (openFilter && openFilter.value === "closed") {
        results = results.filter((business) => business.is_open === false);
    }

    if (phoneFilter && phoneFilter.value === "yes") {
        results = results.filter((business) => Boolean(business.phone));
    } else if (phoneFilter && phoneFilter.value === "no") {
        results = results.filter((business) => !business.phone);
    }

    if (websiteFilter && websiteFilter.value === "yes") {
        results = results.filter((business) => Boolean(business.website));
    } else if (websiteFilter && websiteFilter.value === "no") {
        results = results.filter((business) => !business.website);
    }

    const minimumRating = Number(ratingFilter?.value || 0);

    if (minimumRating > 0) {
        results = results.filter(
            (business) => business.rating >= minimumRating
        );
    }

    const sortBy = sortSelect?.value || "nearest";

    if (sortBy === "rating") {
        results.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "name") {
        results.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        results.sort((a, b) => {
            const distanceA = a.distance_km ?? Infinity;
            const distanceB = b.distance_km ?? Infinity;
            return distanceA - distanceB;
        });
    }

    return results;
}

function applyFiltersAndSort() {
    displayedBusinesses = getFilteredBusinesses();
    renderBusinesses(displayedBusinesses);
}

function renderBusinesses(businesses) {
    const container = $("businessResults") || $("results");
    if (!container) {
        console.error("Could not find the business results container.");
        return;
    }

    container.replaceChildren();

    if (!businesses.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = allBusinesses.length
            ? "No businesses match your filters. Try clearing some filters."
            : "Search for a location to see matching businesses.";
        container.appendChild(empty);
    } else {
        businesses.forEach((business) => {
            container.appendChild(createBusinessCard(business));
        });
    }

    const count = $("resultCount");
    if (count) count.textContent = `${businesses.length} results`;
}

function createBusinessCard(business) {
    const card = document.createElement("article");
    card.className = "business-card";

    const saved = isSaved(business);

    card.innerHTML = `
        <div class="business-card-content">
            <h3>${escapeHTML(business.name)}</h3>
            <p>${escapeHTML(business.address)}</p>
            <p>⭐ ${business.rating > 0 ? business.rating.toFixed(1) : "No rating"}</p>
            <p>${
                business.is_open === true
                    ? "Open now"
                    : business.is_open === false
                        ? "Closed"
                        : "Hours unavailable"
            }</p>
            ${
                business.distance_km != null
                    ? `<p>📍 ${escapeHTML(business.distance_km)} km</p>`
                    : ""
            }
            ${
                business.phone
                    ? `<p>☎ ${escapeHTML(business.phone)}</p>`
                    : ""
            }
            ${
                business.website
                    ? `<p><a href="${escapeHTML(business.website)}" target="_blank" rel="noopener noreferrer">Website</a></p>`
                    : ""
            }
            <div class="business-actions">
                <button type="button" data-action="details">Details</button>
                <button type="button" data-action="save">${saved ? "Remove Saved" : "Save"}</button>
                <a href="${escapeHTML(business.google_maps_url)}" target="_blank" rel="noopener noreferrer">View Map</a>
            </div>
        </div>
    `;

    card.querySelector('[data-action="details"]').addEventListener("click", () => {
        showBusinessDetails(business);
    });

    card.querySelector('[data-action="save"]').addEventListener("click", () => {
        toggleSavedBusiness(business);
    });

    return card;
}

function toggleSavedBusiness(business) {
    const saved = getSavedBusinesses();
    const id = getBusinessId(business);
    const alreadySaved = saved.some((item) => getBusinessId(item) === id);

    const updated = alreadySaved
        ? saved.filter((item) => getBusinessId(item) !== id)
        : [...saved, business];

    saveBusinesses(updated);

    if (showingSavedOnly) {
        showSavedBusinesses();
    } else {
        renderBusinesses(displayedBusinesses);
    }
}

function showSavedBusinesses() {
    showingSavedOnly = true;
    const saved = getSavedBusinesses().map(normalizeBusiness);
    renderBusinesses(saved);
    setStatus(`${saved.length} saved businesses.`);
}

function showAllResults() {
    showingSavedOnly = false;
    applyFiltersAndSort();
    setStatus(`${displayedBusinesses.length} businesses displayed.`);
}

function showBusinessDetails(business) {
    const modal = $("businessModal");
    const details = $("businessDetails");

    if (!modal || !details) {
        alert(`${business.name}\n${business.address}`);
        return;
    }

    details.innerHTML = `
        <h2>${escapeHTML(business.name)}</h2>
        <p><strong>Address:</strong> ${escapeHTML(business.address)}</p>
        <p><strong>Rating:</strong> ${business.rating || "Not available"}</p>
        <p><strong>Phone:</strong> ${escapeHTML(business.phone || "Not available")}</p>
        <p><strong>Website:</strong> ${
            business.website
                ? `<a href="${escapeHTML(business.website)}" target="_blank" rel="noopener noreferrer">${escapeHTML(business.website)}</a>`
                : "Not available"
        }</p>
        <p><strong>Status:</strong> ${
            business.is_open === true
                ? "Open"
                : business.is_open === false
                    ? "Closed"
                    : "Unknown"
        }</p>
        <p><a href="${escapeHTML(business.google_maps_url)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></p>
    `;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "block";
}

function closeBusinessDetails() {
    const modal = $("businessModal");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
}

function clearFilters() {
    const name = $("nameFilter") || $("nameSearch");
    if (name) name.value = "";

    [
        ["openNowFilter", ""],
        ["phoneFilter", ""],
        ["websiteFilter", ""],
        ["minRating", "0"]
    ].forEach(([id, value]) => {
        if ($(id)) $(id).value = value;
    });

    applyFiltersAndSort();
}

function initializeFilters() {
    const searchForm = $("searchForm");
    if (searchForm) {
        searchForm.addEventListener("submit", searchBusinesses);
    }

    const filterIds = [
        "nameFilter",
        "openNowFilter",
        "phoneFilter",
        "websiteFilter",
        "minRating",
        "sortSelect"
    ];

    filterIds.forEach((id) => {
        const element = $(id);
        if (!element) return;

        element.addEventListener("input", applyFiltersAndSort);
        element.addEventListener("change", applyFiltersAndSort);
    });

    $("showSavedButton")?.addEventListener("click", showSavedBusinesses);
    $("showAllButton")?.addEventListener("click", showAllResults);
    $("clearFiltersButton")?.addEventListener("click", clearFilters);
    $("closeModalButton")?.addEventListener("click", closeBusinessDetails);

    $("viewAllCategories")?.addEventListener("click", () => {
        const categorySelect = $("categorySelect");
        if (categorySelect) {
            categorySelect.value = "all";
            categorySelect.focus();
        }
    });

    document.querySelectorAll(".category-card[data-category]").forEach((card) => {
        card.addEventListener("click", () => {
            const categorySelect = $("categorySelect");
            if (!categorySelect) return;

            const requestedCategory = card.dataset.category;
            const optionExists = Array.from(categorySelect.options).some(
                (option) => option.value === requestedCategory
            );

            if (optionExists) {
                categorySelect.value = requestedCategory;
                $("searchForm")?.requestSubmit();
            }
        });
    });

    document.querySelectorAll(".location-chip[data-location]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const locationInput = $("locationInput");
            if (!locationInput) return;

            locationInput.value = chip.dataset.location || "";
            locationInput.focus();
        });
    });

    $("businessModal")?.addEventListener("click", (event) => {
        if (event.target === $("businessModal")) {
            closeBusinessDetails();
        }
    });

    populateCategories();
    populateRadiusOptions();
    renderBusinesses([]);
}

document.addEventListener("DOMContentLoaded", initializeFilters);
