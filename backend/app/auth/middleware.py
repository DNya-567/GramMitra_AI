"""
Verifies the Supabase-issued JWT sent by the frontend in the
Authorization: Bearer <token> header. Every protected route depends
on require_auth (or require_role) instead of implementing its own check.
"""
import os
import jwt
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET is not set — check backend/.env")


def verify_token(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Supabase puts custom fields (like "role") under user_metadata or
    # app_metadata if you set them at signup — defaults to "farmer" if unset.
    role = payload.get("user_metadata", {}).get("role", "farmer")

    return {"uid": payload["sub"], "email": payload.get("email"), "role": role}