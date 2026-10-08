from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.auth.dependencies import require_auth
from app.db.database import get_db
from app.models.user_profile import UserProfile
from app.services.profile_service import get_or_create_profile, update_profile, get_stats


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