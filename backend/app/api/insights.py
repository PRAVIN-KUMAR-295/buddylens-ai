from fastapi import APIRouter
from typing import List, Dict, Any

from app.models.schemas import ActivityItem, InsightsResponse, DocumentResponse
from app.core.config import settings
from app.storage.database import Database
from app.services.ai_service import AIProviderManager

router = APIRouter(tags=["activity-insights"])
db = Database(settings.DATABASE_URL.replace("sqlite:///", ""))

ai_manager = AIProviderManager(
    ollama_url=settings.OLLAMA_BASE_URL,
    gemma_model=settings.GEMMA_MODEL_NAME,
    hosted_url=settings.HOSTED_API_BASE_URL,
    hosted_key=settings.HOSTED_API_KEY,
    hosted_model=settings.HOSTED_MODEL_NAME,
    default_mode=settings.AI_PROVIDER
)

@router.get("/activity", response_model=List[ActivityItem])
async def get_activity_log(limit: int = 50):
    raw_activities = db.get_activities(limit=limit)
    return [
        ActivityItem(
            id=a["id"],
            action_type=a["action_type"],
            title=a["title"],
            description=a["description"],
            timestamp=a["timestamp"],
            document_id=a.get("document_id"),
            metadata=a.get("metadata", {})
        ) for a in raw_activities
    ]

@router.get("/insights", response_model=InsightsResponse)
async def get_insights():
    raw_insights = db.get_insights()
    docs = db.list_documents()[:5]

    recent_docs = [
        DocumentResponse(
            id=d["id"],
            title=d["title"],
            source_type=d["source_type"],
            char_count=d["char_count"],
            word_count=d["word_count"],
            chunk_count=d["chunk_count"],
            summary=d.get("summary"),
            topics=d.get("topics", []),
            created_at=d["created_at"]
        ) for d in docs
    ]

    return InsightsResponse(
        total_documents=raw_insights["total_documents"],
        questions_asked=raw_insights["questions_asked"],
        quizzes_completed=raw_insights["quizzes_completed"],
        average_quiz_score=raw_insights["average_quiz_score"],
        weak_topics=raw_insights["weak_topics"],
        recent_documents=recent_docs
    )

@router.get("/ai-status")
async def get_ai_status():
    """Returns the current active AI provider status (Local Gemma, Hosted, or Fallback)."""
    provider = await ai_manager.get_active_provider()
    ollama_ok = await ai_manager.ollama_provider.is_available()
    hosted_ok = await ai_manager.hosted_provider.is_available()
    is_gemma = "gemma" in provider.provider_name.lower()
    
    active_model = settings.GEMMA_MODEL_NAME
    if "hosted" in provider.provider_name.lower():
        active_model = settings.HOSTED_MODEL_NAME

    return {
        "active_provider": provider.provider_name,
        "provider_mode": settings.AI_PROVIDER,
        "local_gemma_available": ollama_ok,
        "hosted_gemma_available": hosted_ok,
        "gemma_model_configured": active_model,
        "is_open_weight_gemma": is_gemma
    }
