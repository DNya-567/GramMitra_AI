"""
Verifies the Firebase ID token sent by the frontend in the
Authorization: Bearer <token> header. Every protected route depends
on this instead of implementing its own login check.
"""
from fastapi import Header, HTTPException
# import firebase_admin
# from firebase_admin import auth as firebase_auth


def verify_token(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ")[1]
    # TODO: replace with real verification once the Firebase project is set up
    # decoded = firebase_auth.verify_id_token(token)
    # return decoded  # contains uid, phone_number, and custom claims like role
    return {"uid": "demo-user", "role": "farmer"}
