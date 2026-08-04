"""
Expected payload: query_text, language
"""


def get_reply(payload: dict) -> dict:
    # TODO: detect/translate language, run through the multilingual
    # NLP model (ml/chatbot_nlp/model_wrapper.py) which also covers
    # the government scheme knowledge base, translate the reply back.
    return {"reply": None, "language": payload.get("language")}
