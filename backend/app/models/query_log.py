import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class QueryLog(Base):
    __tablename__ = "query_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # references auth.users.id
    feature = Column(String, nullable=False)  # "crop" | "weather" | "fertilizer" | "chatbot" | "price" | "scheme"
    request_summary = Column(JSON, nullable=True)   # e.g. {"region": "Pune"} or {"message": "..."}
    response_summary = Column(JSON, nullable=True)  # e.g. {"recommended_crop": "rice"}
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))