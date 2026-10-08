import json
from pathlib import Path

import requests

from backend.config.settings import GOOGLE_API_KEY
from backend.models.business import Business


DATA_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "sample_businesses.json"
)


def load_sample_businesses() -> list[dict]:
    """
    Load sample business data from JSON.
    """

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def geocode_location(location: str) -> tuple[float, float]:
    """
    Convert a user-entered address, area, or city
    into latitude and longitude using Google Geocoding API.
    """

    if not GOOGLE_API_KEY:
        raise ValueError(
            "Google API key is not configured."
        )

    url = (
        "https://maps.googleapis.com/maps/api/"
        "geocode/json"
    )

    params = {
        "address": location,
        "key": GOOGLE_API_KEY
    }

    response = requests.get(
        url,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    status = data.get("status")

    if status != "OK":
        error_message = data.get(
            "error_message",
            "Location could not be found."
        )

        raise ValueError(
            f"Geocoding failed: {status}. "
            f"{error_message}"
        )

    results = data.get("results", [])

    if not results:
        raise ValueError(
            f"No coordinates found for: {location}"
        )

    coordinates = (
        results[0]
        .get("geometry", {})
        .get("location", {})
    )

    latitude = coordinates.get("lat")
    longitude = coordinates.get("lng")

    if latitude is None or longitude is None:
        raise ValueError(
            "Latitude or longitude was not returned."
        )

    return latitude, longitude


def search_businesses(
    location: str,
    category: str,
    radius_km: float
) -> list[Business]:
    """
    Search sample businesses by category and radius.

    This is still using mock data.
    Google Places integration will be added next.
    """

    businesses = load_sample_businesses()

    category = category.strip().lower()

    results = []

    for business in businesses:

        business_category = (
            business["category"]
            .strip()
            .lower()
        )

        if business_category != category:
            continue

        distance = business.get("distance_km")

        if (
            distance is not None
            and distance > radius_km
        ):
            continue

        results.append(
            Business(**business)
        )

    return results