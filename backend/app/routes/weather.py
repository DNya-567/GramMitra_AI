from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import weather_service

router = APIRouter()


@router.get("/weather-advisory")
def weather_advisory(region: str, user: dict = Depends(require_auth)):
    return weather_service.get_advisory(region)
