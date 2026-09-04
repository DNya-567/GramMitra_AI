import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.complaint import Complaint

# Simple keyword-based stub — replace with the real ML classifier later.
CATEGORY_RULES = {
    "electricity": ("electricity", "MSEDCL", "1800-233-3435"),
    "water": ("water", "Water Resources Dept", "1800-233-4000"),
    "crop": ("crop_damage", "Agriculture Dept", "1800-233-1000"),
}


def classify(description: str) -> tuple[str, str, str]:
    lowered = description.lower()
    for keyword, result in CATEGORY_RULES.items():
        if keyword in lowered:
            return result
    return ("general", "District Collector Office", "1800-233-0000")


def create_complaint(db: Session, user_id: str, description: str, district: str) -> Complaint:
    category, department, contact = classify(description)
    reference_id = f"GM-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"

    complaint = Complaint(
        user_id=user_id,
        description=description,
        district=district,
        category=category,
        department=department,
        contact=contact,
        reference_id=reference_id,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint