from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import scheme_service

router = APIRouter()


@router.get("/schemes")
def list_schemes(query: str = "", user: dict = Depends(require_auth)):
    return scheme_service.get_schemes(query)
