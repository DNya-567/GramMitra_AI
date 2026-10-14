from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.services.local_crops import get_local_crops
from app.auth.dependencies import require_auth

router = APIRouter()


@router.get("/local")
def get_local_crops_endpoint(state: str, district: str, season: str, user: dict = Depends(require_auth)):
    """
    Get local crop recommendations for a given state, district, and season.
    """
    try:
        crops = get_local_crops(state, district, season)
        if not crops:
            # If no data found, we could return 404 or 200 with empty list.
            # According to spec, we should prepare for 503 if artifacts missing.
            # But if data simply not found for the parameters, we return empty list.
            return {"crops": []}
        return {"crops": crops}
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Crop data artifacts not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))