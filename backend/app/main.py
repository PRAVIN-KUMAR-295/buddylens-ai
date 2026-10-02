from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import documents, chat, study, insights

app = FastAPI(
    title=settings.APP_NAME,
    description="Interactive AI Study Companion powered by Open-Weight Gemma models for Hacktoberfest 2026.",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging
from app.services.ai_service import AIProviderManager

logger = logging.getLogger("buddylens")
logging.basicConfig(level=logging.INFO)

# Startup logging to clearly report configured AI provider without logging credentials
@app.on_event("startup")
async def startup_event():
    manager = AIProviderManager(
        ollama_url=settings.OLLAMA_BASE_URL,
        gemma_model=settings.GEMMA_MODEL_NAME,
        hosted_url=settings.HOSTED_API_BASE_URL,
        hosted_key=settings.HOSTED_API_KEY,
        hosted_model=settings.HOSTED_MODEL_NAME,
        default_mode=settings.AI_PROVIDER
    )
    active_provider = await manager.get_active_provider()
    has_hosted_key = bool(settings.HOSTED_API_KEY.strip())
    has_hosted_url = bool(settings.HOSTED_API_BASE_URL.strip())
    
    logger.info("=" * 60)
    logger.info(f"[{settings.APP_NAME}] Startup AI Engine Diagnostics:")
    logger.info(f" • Configured Mode (AI_PROVIDER): {settings.AI_PROVIDER}")
    logger.info(f" • Active Provider: {active_provider.provider_name}")
    logger.info(f" • Hosted Endpoint Configured: {has_hosted_url} (Model: {settings.HOSTED_MODEL_NAME})")
    logger.info(f" • Hosted Key Set: {has_hosted_key} (Keys are NEVER logged)")
    logger.info(f" • Local Ollama Target: {settings.OLLAMA_BASE_URL} (Model: {settings.GEMMA_MODEL_NAME})")
    logger.info("=" * 60)

# Health endpoint required for production / platform deployments
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "storage": "sqlite",
        "ai_engine": "Gemma Open-Weight Architecture"
    }

# Register API Routers under /api
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(study.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
