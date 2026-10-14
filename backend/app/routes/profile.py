from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import os
import time
import httpx

from app.auth.dependencies import require_auth
from app.db.database import get_db
from app.models.user_profile import UserProfile
from app.services.profile_service import get_or_create_profile, update_profile, get_stats


# Reverse geocoding cache and rate limiting
_reverse_cache = {}
_CACHE_TTL = 24 * 60 * 60  # 24 hours in seconds
_LAST_REQUEST_TIME = 0
_MIN_REQUEST_INTERVAL = 1.0  # 1 second


def _reverse_geocode_nominatim(latitude: float, longitude: float):
    """Reverse geocode latitude and longitude using Nominatim with caching and rate limiting."""
    global _LAST_REQUEST_TIME

    # Round to 2 decimal places for cache key
    lat_key = round(latitude, 2)
    lon_key = round(longitude, 2)
    cache_key = f"{lat_key},{lon_key}"

    # Check cache
    now = time.time()
    if cache_key in _reverse_cache:
        cached_value, timestamp = _reverse_cache[cache_key]
        if now - timestamp < _CACHE_TTL:
            return cached_value

    # Rate limiting: ensure at least _MIN_REQUEST_INTERVAL seconds since last request
    elapsed = now - _LAST_REQUEST_TIME
    if elapsed < _MIN_REQUEST_INTERVAL:
        time.sleep(_MIN_REQUEST_INTERVAL - elapsed)

    # Prepare request to Nominatim
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "jsonv2",
        "lat": latitude,
        "lon": longitude,
        "zoom": 10,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": os.getenv("NOMINATIM_USER_AGENT", "GramMitra/1.0")
    }

    # Make request
    try:
        # Create a new httpx client with IPv4 and timeout settings
        timeout = httpx.Timeout(10.0, connect=5.0)
        transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
        # Note: We are in a sync function, so we use the sync client
        with httpx.Client(transport=transport, timeout=timeout) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        # On any error, return None to indicate failure
        return None

    # Update rate limiting timestamp
    _LAST_REQUEST_TIME = time.time()

    # Extract address components
    address = data.get("address", {})
    village = address.get("village") or address.get("hamlet") or address.get("suburb") or address.get("neighbourhood")
    district = address.get("district") or address.get("county") or address.get("municipality")
    state = address.get("state")
    display_name = data.get("display_name")

    # If village is not found, try to get from address.get('city') or address.get('town')
    if not village:
        village = address.get("city") or address.get("town")

    result = {
        "village": village,
        "district": district,
        "state": state,
        "display_name": display_name
    }

    # Update cache
    _reverse_cache[cache_key] = (result, now)

    return result


router = APIRouter()


class Stats(BaseModel):
    crops_tracked: int
    reports_filed: int
    days_active: int


class ProfileUpdate(BaseModel):
    farm_size_acres: Optional[float] = None
    soil_type: Optional[str] = None
    primary_crop: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    location: Optional[str] = None
    # New location fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


class ProfileResponse(BaseModel):
    farm_size_acres: float
    soil_type: str
    primary_crop: str
    phone: str
    preferred_language: str
    location: str
    # New location fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    stats: Stats


@router.get("", response_model=ProfileResponse)
def get_profile(user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    user_id = user["uid"]  # UUID string from Supabase
    # Get or create profile
    profile = get_or_create_profile(db, user_id)
    # Get stats
    stats = get_stats(db, user_id)
    # Prepare response with defaults for null fields
    return ProfileResponse(
        farm_size_acres=profile.farm_size_acres or 0.0,
        soil_type=profile.soil_type or "",
        primary_crop=profile.primary_crop or "",
        phone=profile.phone or "",
        preferred_language=profile.preferred_language or "English",
        location=profile.location or "",
        # New location fields
        latitude=profile.latitude,
        longitude=profile.longitude,
        village=profile.village,
        district=profile.district,
        state=profile.state,
        stats=Stats(
            crops_tracked=stats["crops_tracked"],
            reports_filed=stats["reports_filed"],
            days_active=stats["days_active"],
        )
    )


@router.put("", response_model=ProfileResponse)
def update_profile_endpoint(
    profile_update: ProfileUpdate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    user_id = user["uid"]
    # Convert Pydantic model to dict, excluding unset fields to only update provided fields
    updates = profile_update.dict(exclude_unset=True)
    # Update the profile
    updated_profile = update_profile(db, user_id, updates)
    # Get fresh stats
    stats = get_stats(db, user_id)
    # Prepare response
    return ProfileResponse(
        farm_size_acres=updated_profile.farm_size_acres or 0.0,
        soil_type=updated_profile.soil_type or "",
        primary_crop=updated_profile.primary_crop or "",
        phone=updated_profile.phone or "",
        preferred_language=updated_profile.preferred_language or "English",
        location=updated_profile.location or "",
        # New location fields
        latitude=updated_profile.latitude,
        longitude=updated_profile.longitude,
        village=updated_profile.village,
        district=updated_profile.district,
        state=updated_profile.state,
        stats=Stats(
            crops_tracked=stats["crops_tracked"],
            reports_filed=stats["reports_filed"],
            days_active=stats["days_active"],
        )
    )


@router.get("/reverse")
def reverse_geocode(
    latitude: float,
    longitude: float,
    user: dict = Depends(require_auth)
):
    """Reverse geocode latitude and longitude to get village, district, state."""
    # Validate India bounds (approximate)
    if not (6 <= latitude <= 38):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude out of bounds for India (should be between 6 and 38 degrees)."
        )
    if not (68 <= longitude <= 98):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude out of bounds for India (should be between 68 and 98 degrees)."
        )

    result = _reverse_geocode_nominatim(latitude, longitude)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Reverse geocoding service failed."
        )

    return result