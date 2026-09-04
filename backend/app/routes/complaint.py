from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import require_auth
from app.db.database import get_db
from app.services.complaint_service import create_complaint

router = APIRouter()


class ComplaintRequest(BaseModel):
    description: str
    district: str


class ComplaintResponse(BaseModel):
    category: str
    department: str
    contact: str
    reference_id: str


@router.post("/classify", response_model=ComplaintResponse)
def classify_complaint(
        payload: ComplaintRequest,
        user: dict = Depends(require_auth),
        db: Session = Depends(get_db),
):
    complaint = create_complaint(
        db=db,
        user_id=user["uid"],
        description=payload.description,
        district=payload.district,
    )
    return ComplaintResponse(
        category=complaint.category,
        department=complaint.department,
        contact=complaint.contact,
        reference_id=complaint.reference_id,
    )