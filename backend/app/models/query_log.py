from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from app.db.database import Base


class QueryLog(Base):
    """Logs chatbot queries -- useful later for evaluating chatbot accuracy."""
    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farmer_uid = Column(String)
    query_text = Column(String)
    reply_text = Column(String)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
