from fastapi import APIRouter, HTTPException
import uuid
import json
import logging
from typing import List

from app.models.schemas import (
    ChatRequest, ChatResponse, GroundedCitation,
    SummarizeRequest, SummarizeResponse
)
from app.services.chunker import BM25Retriever
from app.services.ai_service import AIProviderManager
from app.core.config import settings
from app.storage.database import Database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["study-ai"])
db = Database(settings.DATABASE_URL.replace("sqlite:///", ""))
retriever = BM25Retriever()

ai_manager = AIProviderManager(
    ollama_url=settings.OLLAMA_BASE_URL,
    gemma_model=settings.GEMMA_MODEL_NAME,
    hosted_url=settings.HOSTED_API_BASE_URL,
    hosted_key=settings.HOSTED_API_KEY,
    hosted_model=settings.HOSTED_MODEL_NAME,
    default_mode=settings.AI_PROVIDER
)

@router.post("/chat", response_model=ChatResponse)
async def chat_with_notes(payload: ChatRequest):
    doc = db.get_document(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = db.get_document_chunks(payload.document_id)
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no text chunks for retrieval.")

    # 1. Retrieve the top relevant chunks using BM25
    relevant_chunks = retriever.score_chunks(payload.query, chunks, top_k=4)

    # 2. Build Grounded Prompt for Gemma
    citations: List[GroundedCitation] = []
    context_blocks = []
    for c in relevant_chunks:
        pg = c.get("page_number")
        sec = c.get("section_title") or f"Page {pg}"
        snippet = c["content"][:160].strip() + ("..." if len(c["content"]) > 160 else "")
        citations.append(GroundedCitation(
            chunk_id=c["id"],
            page_number=pg,
            snippet=snippet
        ))
        context_blocks.append(f"[{sec}]:\n{c['content']}")

    context_str = "\n\n---\n\n".join(context_blocks)

    system_prompt = (
        "You are BuddyLens AI, an encouraging and insightful academic revision companion for a college student. "
        "Your goal is to explain concepts clearly, simplify dense terminology, and keep answers strictly grounded "
        "in the provided lecture notes. If an answer cannot be determined from the notes, clearly say so."
    )

    user_prompt = f"""Study Notes Context:
{context_str}

Student Question:
{payload.query}

Instructions:
1. Provide a clear, intuitive answer tailored to an exam revision student.
2. If the student asks for simple words, examples, or revision guidance, explain it step-by-step.
3. Explicitly reference facts from the provided study notes without fabricating details.
"""

    answer_text, model_name = await ai_manager.generate(user_prompt, system_prompt)

    # Log study activity
    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="chat",
        title=f"Asked: {payload.query[:45]}...",
        description=f"Answered using {model_name} with {len(citations)} citations.",
        doc_id=payload.document_id
    )

    return ChatResponse(
        answer=answer_text,
        source_grounded=True,
        citations=citations,
        model_used=model_name
    )

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_notes(payload: SummarizeRequest):
    doc = db.get_document(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    content_preview = doc["content"][:4000]

    system_prompt = (
        "You are BuddyLens AI. Your job is to create high-yield exam revision summaries from student lecture notes."
    )

    prompt = f"""Summarize these notes for a student preparing for an upcoming exam.
Focus on:
1. Key Definitions & Core Concepts
2. Essential Mechanisms / Steps
3. Common Exam Pitfalls or Takeaways

Notes Content:
{content_preview}
"""

    summary_text, model_name = await ai_manager.generate(prompt, system_prompt)

    # Save to document record
    db.update_document_summary(payload.document_id, summary_text)

    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="summarize",
        title=f"Summarized {doc['title'][:35]}",
        description=f"Generated high-yield revision summary using {model_name}.",
        doc_id=payload.document_id
    )

    return SummarizeResponse(
        summary=summary_text,
        key_points=doc.get("topics", [])[:5],
        model_used=model_name
    )
