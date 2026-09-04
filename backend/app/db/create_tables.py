"""
Run once to create all tables defined by SQLAlchemy models in Supabase Postgres.
Usage: python -m app.db.create_tables
"""
from app.db.database import Base, engine
from app.models import complaint, query_log  # noqa: F401  (import registers the models)

Base.metadata.create_all(bind=engine)
print("Tables created (or already existed).")