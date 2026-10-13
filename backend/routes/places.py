
from fastapi import APIRouter, HTTPException, Query

from backend.services.places_service import search_businesses

router = APIRouter(prefix="/places", tags=["Places"])


@router.get("/nearby")
def get_nearby_businesses(
    location: str = Query(
        ...,
        min_length=2,
        description="Address, area, or city",
    ),
    category: str = Query(
        "all",
        description="Business category",
    ),
    radius: float = Query(
        5,
        gt=0,
        le=25,
        description="Search radius in kilometres",
    ),
):
    location = location.strip()
    category = category.strip().lower()

    if len(location) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid location.",
        )

    if not category:
        category = "all"

    try:
        businesses = search_businesses(
            location=location,
            category=category,
            radius_km=radius,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Business search failed. Check backend terminal logs.",
        ) from None

    return {
        "location": location,
        "category": category,
        "radius_km": radius,
        "count": len(businesses),
        "businesses": [
            business.model_dump()
            for business in businesses
        ],
        "data_source": "backend",
    }
