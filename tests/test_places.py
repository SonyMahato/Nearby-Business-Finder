
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == (
        "Nearby Business Finder API is running"
    )


def test_nearby_restaurants():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "restaurant",
            "radius": 5,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["category"] == "restaurant"
    assert data["radius_km"] == 5
    assert data["count"] == 4
    assert len(data["businesses"]) == 4


def test_nearby_restaurants_small_radius():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "restaurant",
            "radius": 2,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert all(
        business["distance_km"] <= 2
        for business in data["businesses"]
    )


def test_nearby_hospitals():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "hospital",
            "radius": 5,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 2
    assert all(
        business["category"] == "hospital"
        for business in data["businesses"]
    )


def test_nearby_pharmacies():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "pharmacy",
            "radius": 5,
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_nearby_banks():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "bank",
            "radius": 5,
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_nearby_cafes():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "cafe",
            "radius": 5,
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 3


def test_new_categories():
    categories = [
        "dentist",
        "salon",
        "petrol station",
        "veterinary clinic",
        "electronics store",
        "library",
    ]

    for category in categories:
        response = client.get(
            "/places/nearby",
            params={
                "location": "Bangalore",
                "category": category,
                "radius": 5,
            },
        )

        assert response.status_code == 200, (
            f"Request failed for category: {category}"
        )

        data = response.json()

        assert data["count"] >= 1, (
            f"No demo businesses returned for: {category}"
        )

        assert all(
            business["category"] == category
            for business in data["businesses"]
        )


def test_invalid_radius():
    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "hospital",
            "radius": 30,
        },
    )

    assert response.status_code == 422


def test_missing_location():
    response = client.get(
        "/places/nearby",
        params={
            "category": "restaurant",
            "radius": 5,
        },
    )

    assert response.status_code == 422