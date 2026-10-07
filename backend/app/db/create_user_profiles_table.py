"""
Run once to create the user_profiles table defined by SQLAlchemy models in Supabase Postgres.
Usage: python -m app.db.create_user_profiles_table
"""
from app.db.database import Base, engine
from app.models import user_profile  # noqa: F401  (import registers the model)

Base.metadata.create_all(bind=engine)
print("Tables created (or already existed).")