import pytest
import io
import os
import json
from fastapi.testclient import TestClient
from app.main import app
from app.services.chunker import TextChunker, BM25Retriever
from app.services.extractor import TextExtractor
from app.services.ai_service import DeterministicRuleFallbackProvider, AIProviderManager

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "BuddyLens" in data["app"]

def test_ai_status_endpoint():
    res = client.get("/api/ai-status")
    assert res.status_code == 200
    data = res.json()
    assert "active_provider" in data
    assert "provider_mode" in data
    assert "gemma_model_configured" in data

@pytest.mark.asyncio
async def test_ai_provider_manager_fallback():
    # Test that invalid hosted credentials safely fallback to deterministic engine
    manager = AIProviderManager(
        ollama_url="http://invalid-ollama:11434",
        gemma_model="gemma2:2b",
        hosted_url="https://invalid-hosted.example.com",
        hosted_key="invalid_test_key",
        hosted_model="gemma2-9b-it",
        default_mode="hosted"
    )
    # Even if hosted is specified, generating should not crash when connection fails
    text, provider_name = await manager.generate("What is paging in operating systems?")
    assert text is not None
    assert len(text) > 0
    assert "fallback" in provider_name.lower() or "deterministic" in provider_name.lower()

def test_chunker_and_bm25():
    sample_text = (
        "Operating systems use paging to manage memory.\n\n"
        "Virtual memory allows larger processes to run via demand paging.\n\n"
        "LRU is a popular page replacement algorithm that avoids Belady's anomaly."
    )
    chunks = TextChunker.chunk_document("test_doc", sample_text, chunk_size=100)
    assert len(chunks) >= 2
    
    retriever = BM25Retriever()
    matched = retriever.score_chunks("What is LRU algorithm?", chunks, top_k=2)
    assert len(matched) >= 1
    assert "LRU" in matched[0]["content"] or "algorithm" in matched[0]["content"]

def test_pasted_notes_and_lifecycle():
    # 1. Paste note
    paste_payload = {
        "title": "Computer Networks Revision",
        "content": "The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. TCP provides reliable delivery whereas UDP is connectionless.",
        "source_type": "paste"
    }
    res = client.post("/api/documents/paste", json=paste_payload)
    assert res.status_code == 200
    doc_data = res.json()
    doc_id = doc_data["id"]
    assert doc_id is not None
    assert doc_data["word_count"] > 10

    # 2. Chat grounded with notes
    chat_payload = {
        "document_id": doc_id,
        "query": "What is the difference between TCP and UDP?"
    }
    chat_res = client.post("/api/chat", json=chat_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "answer" in chat_data
    assert len(chat_data["citations"]) > 0

    # 3. Summarize
    sum_res = client.post("/api/summarize", json={"document_id": doc_id, "mode": "concise"})
    assert sum_res.status_code == 200
    assert "summary" in sum_res.json()

    # 4. Generate Quiz
    quiz_res = client.post("/api/quiz/generate", json={"document_id": doc_id, "num_questions": 3})
    assert quiz_res.status_code == 200
    quiz_data = quiz_res.json()
    assert len(quiz_data["questions"]) >= 1
    quiz_id = quiz_data["quiz_id"]
    first_q = quiz_data["questions"][0]

    # 5. Submit Quiz with an intentional wrong answer to test weak topic detection
    submit_payload = {
        "quiz_id": quiz_id,
        "document_id": doc_id,
        "answers": [
            {
                "question_id": first_q["id"],
                "selected_option_index": (first_q["correct_option_index"] + 1) % 4
            }
        ]
    }
    sub_res = client.post("/api/quiz/submit", json=submit_payload)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["score"] == 0
    assert len(sub_data["weak_topics"]) >= 1

    # 6. Generate Revision Plan based on weak topic
    rev_res = client.post("/api/revision-plan", json={
        "document_id": doc_id,
        "weak_topics": sub_data["weak_topics"]
    })
    assert rev_res.status_code == 200
    plan_data = rev_res.json()
    assert len(plan_data["tasks"]) >= 1

    # 7. Check Activity Log
    act_res = client.get("/api/activity")
    assert act_res.status_code == 200
    assert len(act_res.json()) >= 4

    # 8. Check Insights
    ins_res = client.get("/api/insights")
    assert ins_res.status_code == 200
    ins_data = ins_res.json()
    assert ins_data["total_documents"] >= 1
    assert ins_data["questions_asked"] >= 1
    assert ins_data["quizzes_completed"] >= 1

def test_document_validation_errors():
    # Empty paste
    res = client.post("/api/documents/paste", json={"title": "Short", "content": "Too short", "source_type": "paste"})
    assert res.status_code == 400

    # Non-PDF upload
    fake_file = io.BytesIO(b"Not a PDF text content")
    res = client.post("/api/documents/upload", files={"file": ("test.txt", fake_file, "text/plain")})
    assert res.status_code == 400

def test_sample_notes_endpoint():
    res = client.post("/api/documents/sample")
    assert res.status_code == 200
    data = res.json()
    assert "Memory Management" in data["title"] or "OS Lecture" in data["title"]
    assert data["chunk_count"] > 0
