from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import complaint_service

router = APIRouter()


@router.post("/complaint")
def file_complaint(payload: dict, user: dict = Depends(require_auth)):
    return complaint_service.classify_and_route(payload)
