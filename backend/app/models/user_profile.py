import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(UUID(as_uuid=True), primary_key=True, index=True)  # references auth.users.id
    farm_size_acres = Column(Float, nullable=True)
    soil_type = Column(String, nullable=True)
    primary_crop = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    preferred_language = Column(String, nullable=False, default="English")
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)