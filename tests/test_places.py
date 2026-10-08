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
            "radius": 5
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 2
    assert data["category"] == "restaurant"


def test_nearby_restaurants_small_radius():

    response = client.get(
        "/places/nearby",
        params={
            "location": "Bangalore",
            "category": "restaurant",
            "radius": 2
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1