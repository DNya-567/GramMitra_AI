from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import NoResultFound
import uuid
from datetime import datetime, timezone
import time

from app.models.user_profile import UserProfile
from app.models.query_log import QueryLog
from app.models.complaint import Complaint


def get_or_create_profile(db: Session, user_id: uuid.UUID) -> UserProfile:
    """
    Fetch the user's UserProfile row; if none exists, create one with all fields
    null/default and return it.
    """
    start = time.time()
    stmt = select(UserProfile).where(UserProfile.user_id == user_id)
    result = db.execute(stmt)
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    elapsed = time.time() - start
    print(f"get_or_create_profile: {elapsed:.2f}s")
    return profile


def update_profile(db: Session, user_id: uuid.UUID, updates: dict) -> UserProfile:
    """
    Apply only the non-None fields from updates to the user's row, commit,
    and return the updated row.
    """
    stmt = select(UserProfile).where(UserProfile.user_id == user_id)
    result = db.execute(stmt)
    profile = result.scalar_one_or_none()

    if profile is None:
        raise NoResultFound(f"UserProfile not found for user_id {user_id}")

    # Update only the fields that are present in updates and are not None
    for field, value in updates.items():
        if hasattr(profile, field) and value is not None:
            setattr(profile, field, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_stats(db: Session, user_id: uuid.UUID) -> dict:
    """
    Return a dict with:
        crops_tracked = count of rows in query_log where user_id matches
            and feature == "crop"
        reports_filed = count of rows in complaints where user_id matches
        days_active = (today's date - profile.created_at.date()).days,
            minimum 0
    """
    start_total = time.time()
    # Get profile to access created_at
    start = time.time()
    stmt = select(UserProfile.created_at).where(UserProfile.user_id == user_id)
    result = db.execute(stmt)
    created_at_row = result.scalar_one_or_none()
    elapsed = time.time() - start
    print(f"get_stats profile select: {elapsed:.2f}s")

    if created_at_row is None:
        created_at = datetime.now(timezone.utc)
    else:
        created_at = created_at_row

    # Combined query for crops_tracked and reports_filed
    start = time.time()
    crops_tracked_subq = select(func.count()).where(QueryLog.user_id == user_id, QueryLog.feature == "crop").scalar_subquery()
    reports_filed_subq = select(func.count()).where(Complaint.user_id == user_id).scalar_subquery()
    combined_stmt = select(crops_tracked_subq.label("crops_tracked"), reports_filed_subq.label("reports_filed"))
    result = db.execute(combined_stmt)
    row = result.one()
    crops_tracked = row.crops_tracked
    reports_filed = row.reports_filed
    elapsed = time.time() - start
    print(f"get_stats combined count query: {elapsed:.2f}s")

    # Calculate days_active
    start = time.time()
    today = datetime.now(timezone.utc).date()
    created_at_date = created_at.date() if created_at else today
    days_active = (today - created_at_date).days
    if days_active < 0:
        days_active = 0
    elapsed = time.time() - start
    print(f"get_stats days_active calculation: {elapsed:.2f}s")

    total_elapsed = time.time() - start_total
    print(f"get_stats total: {total_elapsed:.2f}s")

    return {
        "crops_tracked": crops_tracked,
        "reports_filed": reports_filed,
        "days_active": days_active,
    }