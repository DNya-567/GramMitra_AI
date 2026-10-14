from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
import math

from app.auth.dependencies import require_auth
from app.services.crop_service import recommend_crop

router = APIRouter()


class CropRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=150)
    phosphorus: float = Field(..., ge=0, le=150)
    potassium: float = Field(..., ge=0, le=210)
    temperature: float = Field(..., ge=5, le=50)
    humidity: float = Field(..., ge=10, le=100)
    ph: float = Field(..., ge=3, le=10)
    rainfall_mm: float = Field(..., ge=0, le=320)

    @model_validator(mode='after')
    def check_nan_inf(self):
        for field_name in self.model_fields:
            value = getattr(self, field_name)
            if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
                raise ValueError(f'{field_name} must be a valid number')
        return self


class CropResponse(BaseModel):
    recommended_crop: str
    confidence: float
    top3: list[dict[str, float | str]] = []
    low_confidence: bool = False


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