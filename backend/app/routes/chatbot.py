from fastapi import APIRouter, Depends
from app.auth.dependencies import require_auth
from app.services import chatbot_service

router = APIRouter()


@router.post("/chatbot-query")
def chatbot_query(payload: dict, user: dict = Depends(require_auth)):
    return chatbot_service.get_reply(payload)
