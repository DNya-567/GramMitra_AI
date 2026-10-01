from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.dependencies import require_auth
from app.services.crop_service import recommend_crop

router = APIRouter()


class CropRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall_mm: float


class CropResponse(BaseModel):
    recommended_crop: str
    confidence: float


@router.post("/recommend", response_model=CropResponse)
def crop_recommend(payload: CropRequest, user: dict = Depends(require_auth)):
    result = recommend_crop(
        nitrogen=payload.nitrogen,
        phosphorus=payload.phosphorus,
        potassium=payload.potassium,
        temperature=payload.temperature,
        humidity=payload.humidity,
        ph=payload.ph,
        rainfall_mm=payload.rainfall_mm,
    )
    return CropResponse(**result)
