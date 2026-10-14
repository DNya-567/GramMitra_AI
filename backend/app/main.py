from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import os

from app.routes import crop, weather, fertilizer, chatbot, complaint, scheme, price, profile, local_crops
from app.services import weather_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create shared httpx client with IPv4 transport and timeout settings
    timeout = httpx.Timeout(10.0, connect=5.0)
    transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0")
    shared_client = httpx.AsyncClient(
        transport=transport,
        timeout=timeout
    )
    # Store in app state and also set in weather service module
    app.state.httpx_client = shared_client
    weather_service.httpx_client = shared_client
    yield
    # Shutdown
    # Close the shared httpx client
    await app.state.httpx_client.aclose()
    # Also clear the reference in the weather service
    weather_service.httpx_client = None

app = FastAPI(title="GramMitra AI API", lifespan=lifespan)

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
app.include_router(local_crops.router, prefix="/api/v1/crops", tags=["crops"])


@app.get("/health")
def health_check():
    return {"status": "ok"}