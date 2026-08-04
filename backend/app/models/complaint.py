from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from app.db.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_id = Column(String, unique=True)
    farmer_uid = Column(String)
    description = Column(String)
    category = Column(String)
    department = Column(String)
    status = Column(String, default="submitted")
    created_at = Column(DateTime, default=datetime.utcnow)
