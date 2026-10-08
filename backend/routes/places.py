from fastapi import APIRouter, HTTPException, Query

from backend.services.places_service import search_businesses


router = APIRouter(
    prefix="/places",
    tags=["Places"]
)


@router.get("/nearby")
def get_nearby_businesses(
    location: str = Query(
        ...,
        min_length=2,
        description="Address, area, or city"
    ),

    category: str = Query(
        ...,
        min_length=2,
        description="Business category"
    ),

    radius: float = Query(
        5,
        gt=0,
        le=25,
        description="Search radius in kilometers"
    )
):

    if not location.strip():
        raise HTTPException(
            status_code=400,
            detail="Location is required."
        )

    businesses = search_businesses(
        location=location,
        category=category,
        radius_km=radius
    )

    return {
        "location": location,
        "category": category,
        "radius_km": radius,
        "count": len(businesses),
        "businesses": businesses
    }