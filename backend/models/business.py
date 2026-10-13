
from typing import Optional

from pydantic import BaseModel, Field


class Business(BaseModel):
    place_id: str = "demo-business"
    name: str

    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None

    rating: Optional[float] = Field(
        default=None,
        ge=0,
        le=5,
    )

    reviews_count: Optional[int] = None
    opening_hours: Optional[list[str]] = None
    open_now: Optional[bool] = None

    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None

    category: str = "other"

from typing import Optional

from pydantic import BaseModel, Field


class Business(BaseModel):
    place_id: str = "demo-business"
    name: str

    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None

    rating: Optional[float] = Field(
        default=None,
        ge=0,
        le=5,
    )

    reviews_count: Optional[int] = None
    opening_hours: Optional[list[str]] = None
    open_now: Optional[bool] = None

    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None

    category: str = "other"
