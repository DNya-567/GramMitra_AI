"""
Verifies the Supabase-issued JWT sent by the frontend in the
Authorization: Bearer <token> header. Every protected route depends
on require_auth (or require_role) instead of implementing its own check.
"""
import os
import time
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is not set — check backend/.env")

# JWKS URL
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Cache JWKS client with a TTL of 1 hour
_jwks_client = None
_jwks_fetched_at = 0
_JWKS_CACHE_TTL = 3600  # 1 second * 3600 = 1 hour


def _get_jwks_client():
    """Fetch or return cached JWKS client."""
    global _jwks_client, _jwks_fetched_at
    now = time.time()
    if _jwks_client is None or (now - _jwks_fetched_at) > _JWKS_CACHE_TTL:
        try:
            _jwks_client = PyJWKClient(JWKS_URL)
            _jwks_fetched_at = now
        except Exception as e:
            # If we cannot fetch JWKS, we cannot verify tokens
            raise HTTPException(
                status_code=401,
                detail="Unable to verify token: JWKS unavailable"
            ) from e
    return _jwks_client


def verify_token(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ")[1]

    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
    except Exception as e:
        # If the token's kid is not found or any other error, treat as invalid
        raise HTTPException(
            status_code=401,
            detail="Unable to verify token"
        ) from e

    try:
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e

    # Supabase puts custom fields (like "role") under user_metadata or
    # app_metadata if you set them at signup — defaults to "farmer" if unset.
    role = payload.get("user_metadata", {}).get("role", "farmer")

    return {
        "uid": payload["sub"],
        "email": payload.get("email"),
        "role": role
    }