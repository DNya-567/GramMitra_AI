from fastapi import Depends, HTTPException
from app.auth.middleware import verify_token


def require_auth(user: dict = Depends(verify_token)) -> dict:
    return user


def require_role(role: str):
    def checker(user: dict = Depends(verify_token)) -> dict:
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
