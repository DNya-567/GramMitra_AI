from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import price_service

router = APIRouter()


@router.get("/market-price")
def market_price(commodity: str, state: str = None, district: str = None, user: dict = Depends(require_auth)):
    return price_service.get_price(commodity, state, district)
