from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import crop_service

router = APIRouter()


@router.post("/crop-recommend")
def recommend_crop(payload: dict, user: dict = Depends(require_auth)):
    return crop_service.get_recommendation(payload)
