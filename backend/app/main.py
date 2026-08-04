from fastapi import FastAPI
from app.routes import crop, weather, fertilizer, chatbot, complaint, scheme, price

app = FastAPI(title="GramMitra AI API")

app.include_router(crop.router, prefix="/api", tags=["crop"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(fertilizer.router, prefix="/api", tags=["fertilizer"])
app.include_router(chatbot.router, prefix="/api", tags=["chatbot"])
app.include_router(complaint.router, prefix="/api", tags=["complaint"])
app.include_router(scheme.router, prefix="/api", tags=["scheme"])
app.include_router(price.router, prefix="/api", tags=["price"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
