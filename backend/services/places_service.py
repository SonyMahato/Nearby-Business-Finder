
import json
import math
from pathlib import Path

import requests

from backend.config.settings import GOOGLE_API_KEY, USE_MOCK_DATA
from backend.models.business import Business


DATA_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "sample_businesses.json"
)

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby"


# Frontend category -> Google Places API type
CATEGORY_TYPES = {
    "restaurant": "restaurant",
    "hotel": "lodging",
    "hospital": "hospital",
    "gym": "gym",
    "cafe": "cafe",
    "pharmacy": "pharmacy",
    "bank": "bank",
    "atm": "atm",
    "shopping_mall": "shopping_mall",
    "school": "school",
    "supermarket": "supermarket",
    "dentist": "dentist",
    "salon": "beauty_salon",
    "beauty_salon": "beauty_salon",
    "gas_station": "gas_station",
    "veterinary_care": "veterinary_care",
    "electronics_store": "electronics_store",
    "library": "library",
    "bakery": "bakery",
    "doctor": "doctor",
    "car_repair": "car_repair",
    "park": "park",
    "plumber": "plumber",
    "pet_services": "veterinary_care",
    "retail": "store",
}

# Names that should be treated as equivalent when filtering sample data.
CATEGORY_ALIASES = {
    "all": None,
    "cafe": {"cafe", "coffee_shop"},
    "restaurant": {"restaurant", "food"},
    "hospital": {"hospital", "healthcare"},
    "pharmacy": {"pharmacy", "drugstore"},
    "bank": {"bank"},
    "atm": {"atm"},
    "salon": {"salon", "beauty_salon"},
    "beauty_salon": {"salon", "beauty_salon"},
    "gym": {"gym", "fitness"},
    "hotel": {"hotel", "lodging"},
    "supermarket": {"supermarket", "grocery_store"},
    "shopping_mall": {"shopping_mall", "mall"},
    "school": {"school"},
    "bakery": {"bakery"},
    "dentist": {"dentist"},
    "doctor": {"doctor", "medical_clinic"},
    "gas_station": {"gas_station", "petrol_station"},
    "car_repair": {"car_repair", "auto_repair"},
    "library": {"library"},
    "park": {"park"},
    "plumber": {"plumber"},
    "home_services": {"home_services", "plumber"},
    "pet_services": {"pet_services", "veterinary_care", "pet_store"},
    "retail": {"retail", "store", "electronics_store"},
}


def normalize_category(category: str) -> str:
    """Normalize category labels received from the frontend."""
    return category.strip().lower().replace(" ", "_").replace("-", "_")


def load_sample_businesses() -> list[dict]:
    """Load local demo businesses."""
    if not DATA_FILE.exists():
        raise ValueError(
            f"Demo data file was not found: {DATA_FILE}"
        )

    with DATA_FILE.open(encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(
            "Demo data must be a JSON list of businesses."
        )

    return data


def calculate_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate straight-line distance between two coordinates."""
    earth_radius_km = 6371.0

    lat1, lon1, lat2, lon2 = map(
        math.radians, [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    return earth_radius_km * 2 * math.asin(
        math.sqrt(min(1.0, a))
    )


def search_demo_businesses(
    location: str,
    category: str,
    radius_km: float,
) -> list[Business]:
    """
    Return local demo businesses.

    Demo data is not geographically searched using the entered location.
    """
    del location  # The demo records are not tied to the entered location.

    businesses = load_sample_businesses()
    category = normalize_category(category)
    allowed_categories = CATEGORY_ALIASES.get(category, {category})

    results = []

    for item in businesses:
        item_category = normalize_category(
            str(item.get("category", ""))
        )

        if allowed_categories is not None:
            if item_category not in allowed_categories:
                continue

        distance = item.get("distance_km")

        if distance is not None:
            try:
                if float(distance) > radius_km:
                    continue
            except (TypeError, ValueError):
                pass

        results.append(Business(**item))

    return results


def geocode_location(location: str) -> tuple[float, float]:
    """Convert an address or area into latitude and longitude."""
    if not GOOGLE_API_KEY:
        raise ValueError("Google API key is not configured.")

    response = requests.get(
        GEOCODING_URL,
        params={"address": location, "key": GOOGLE_API_KEY},
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()

    if data.get("status") != "OK":
        message = data.get(
            "error_message",
            "Location could not be found.",
        )
        raise ValueError(
            f"Geocoding failed: {data.get('status')}. {message}"
        )

    results = data.get("results", [])

    if not results:
        raise ValueError("No coordinates found for this location.")

    coordinates = results[0]["geometry"]["location"]
    return coordinates["lat"], coordinates["lng"]


def search_google_businesses(
    location: str,
    category: str,
    radius_km: float,
) -> list[Business]:
    """Search Google Places API (New), using radius in kilometres."""
    latitude, longitude = geocode_location(location)
    category = normalize_category(category)

    place_type = CATEGORY_TYPES.get(category)

    if category != "all" and not place_type:
        raise ValueError(
            f"Google Places does not support this category yet: {category}"
        )

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.nationalPhoneNumber,"
            "places.websiteUri,"
            "places.rating,"
            "places.userRatingCount,"
            "places.regularOpeningHours,"
            "places.location,"
            "places.googleMapsUri"
        ),
    }

    # Google Places expects the radius in metres.
    circle = {
        "center": {
            "latitude": latitude,
            "longitude": longitude,
        },
        "radius": radius_km * 1000,
    }

    payload = {
        "maxResultCount": 20,
        "rankPreference": "DISTANCE",
        "locationRestriction": {"circle": circle},
    }

    # "all" means do not restrict results to one place type.
    if place_type:
        payload["includedTypes"] = [place_type]

    response = requests.post(
        PLACES_URL,
        headers=headers,
        json=payload,
        timeout=20,
    )

    if not response.ok:
        raise ValueError(
            f"Google Places API returned HTTP {response.status_code}: "
            f"{response.text[:300]}"
        )

    data = response.json()
    results = []
    seen_place_ids = set()

    for item in data.get("places", []):
        place_id = item.get("id")

        if not place_id or place_id in seen_place_ids:
            continue

        seen_place_ids.add(place_id)

        coordinates = item.get("location", {})
        business_lat = coordinates.get("latitude")
        business_lon = coordinates.get("longitude")

        distance = None

        if business_lat is not None and business_lon is not None:
            distance = calculate_distance_km(
                latitude,
                longitude,
                business_lat,
                business_lon,
            )

        hours = item.get("regularOpeningHours", {})

        results.append(
            Business(
                place_id=place_id,
                name=item.get("displayName", {}).get(
                    "text", "Unnamed business"
                ),
                address=item.get("formattedAddress"),
                phone=item.get("nationalPhoneNumber"),
                website=item.get("websiteUri"),
                rating=item.get("rating"),
                reviews_count=item.get("userRatingCount"),
                opening_hours=hours.get("weekdayDescriptions"),
                open_now=hours.get("openNow"),
                google_maps_url=item.get("googleMapsUri"),
                latitude=business_lat,
                longitude=business_lon,
                distance_km=(
                    round(distance, 2)
                    if distance is not None
                    else None
                ),
                category=category,
            )
        )

    return results


def search_businesses(
    location: str,
    category: str,
    radius_km: float,
) -> list[Business]:
    """
    Search demo data when mock mode is enabled.
    If Google search fails, use demo data as a fallback.
    """
    if USE_MOCK_DATA:
        return search_demo_businesses(
            location=location,
            category=category,
            radius_km=radius_km,
        )

    try:
        return search_google_businesses(
            location=location,
            category=category,
            radius_km=radius_km,
        )
    except (requests.RequestException, ValueError, KeyError) as exc:
        print(
            "Google Places search failed; using demo data instead:",
            str(exc),
        )
        return search_demo_businesses(
            location=location,
            category=category,
            radius_km=radius_km,
        )
