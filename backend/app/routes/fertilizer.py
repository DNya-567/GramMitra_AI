from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import fertilizer_service

router = APIRouter()


@router.post("/fertilizer-suggest")
def fertilizer_suggest(payload: dict, user: dict = Depends(require_auth)):
    return fertilizer_service.get_suggestion(payload)
