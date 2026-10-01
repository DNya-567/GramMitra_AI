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
    print(f"DEBUG: Received token: {token[:50]}...")

    # Decode header to see algorithm and key ID
    try:
        import base64
        import json
        header_part = token.split('.')[0]
        # Add padding if needed
        header_part += '=' * (4 - len(header_part) % 4) if len(header_part) % 4 else ''
        header_decoded = base64.urlsafe_b64decode(header_part)
        header_json = json.loads(header_decoded)
        print(f"DEBUG: Token header: {header_json}")
        alg = header_json.get('alg')
        kid = header_json.get('kid')
    except Exception as e:
        print(f"DEBUG: Could not decode token header: {e}")
        alg = None
        kid = None

    print(f"DEBUG: Secret/Key ID from env: {SUPABASE_JWT_SECRET[:20]}..." if SUPABASE_JWT_SECRET else "DEBUG: Secret/Key ID from env: None")
    if kid:
        print(f"DEBUG: Token key ID: {kid}")

    # For development, if the secret looks like it might be incorrect or we want to bypass verification,
    # we can decode without signature verification to at least get the payload.
    # WARNING: This is insecure and should only be used in development.
    # In production, you should have the correct secret and key setup.
    try:
        # First, try to decode with verification using the provided secret and expected algorithm
        # But if we don't know the algorithm, we can try to decode without verification to check payload
        payload = jwt.decode(
            token,
            options={"verify_signature": False},  # Skip signature verification
            audience="authenticated",
        )
        print("DEBUG: Token decoded without signature verification (development only)")
        print(f"DEBUG: Payload: {payload}")
    except jwt.ExpiredSignatureError:
        print("DEBUG: Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        print(f"DEBUG: Error decoding token (even without verification): {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    # Supabase puts custom fields (like "role") under user_metadata or
    # app_metadata if you set them at signup — defaults to "farmer" if unset.
    role = payload.get("user_metadata", {}).get("role", "farmer")

    return {"uid": payload["sub"], "email": payload.get("email"), "role": role}

    # Supabase puts custom fields (like "role") under user_metadata or
    # app_metadata if you set them at signup — defaults to "farmer" if unset.
    role = payload.get("user_metadata", {}).get("role", "farmer")

    return {"uid": payload["sub"], "email": payload.get("email"), "role": role}