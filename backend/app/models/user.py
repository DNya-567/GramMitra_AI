from sqlalchemy import Column, String
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True)  # Firebase UID
    phone_number = Column(String, unique=True)
    name = Column(String)
    preferred_language = Column(String, default="en")
    role = Column(String, default="farmer")  # farmer | staff
