from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import crop, weather, fertilizer, chatbot, complaint, scheme, price, profile

app = FastAPI(title="GramMitra AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crop.router, prefix="/api/v1/crop", tags=["crop"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["weather"])
app.include_router(fertilizer.router, prefix="/api/v1/fertilizer", tags=["fertilizer"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["chatbot"])
app.include_router(complaint.router, prefix="/api/v1/complaint", tags=["complaint"])
app.include_router(scheme.router, prefix="/api/v1/scheme", tags=["scheme"])
app.include_router(price.router, prefix="/api/v1/price", tags=["price"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
