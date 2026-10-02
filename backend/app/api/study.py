from fastapi import APIRouter, HTTPException
import uuid
import json
import logging
import re
from typing import List

from app.models.schemas import (
    QuizGenerateRequest, QuizGenerateResponse, QuizQuestion,
    QuizSubmitRequest, QuizSubmitResponse, QuizEvaluationResult,
    RevisionPlanRequest, RevisionPlanResponse, RevisionTask
)
from app.services.ai_service import AIProviderManager
from app.core.config import settings
from app.storage.database import Database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["quiz-and-revision"])
db = Database(settings.DATABASE_URL.replace("sqlite:///", ""))

ai_manager = AIProviderManager(
    ollama_url=settings.OLLAMA_BASE_URL,
    gemma_model=settings.GEMMA_MODEL_NAME,
    hosted_url=settings.HOSTED_API_BASE_URL,
    hosted_key=settings.HOSTED_API_KEY,
    hosted_model=settings.HOSTED_MODEL_NAME,
    default_mode=settings.AI_PROVIDER
)

def safe_parse_json(text: str) -> any:
    """Robust JSON extraction even if markdown ```json code blocks or extra chat text are present."""
    text = text.strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        text = match.group(1).strip()
    try:
        return json.loads(text)
    except Exception:
        # Fallback regex search for array or object
        arr_match = re.search(r'(\[[\s\S]*\])', text)
        if arr_match:
            try:
                return json.loads(arr_match.group(1))
            except Exception:
                pass
        obj_match = re.search(r'(\{[\s\S]*\})', text)
        if obj_match:
            try:
                return json.loads(obj_match.group(1))
            except Exception:
                pass
        raise ValueError("Failed to parse valid JSON from AI response")


@router.post("/quiz/generate", response_model=QuizGenerateResponse)
async def generate_quiz(payload: QuizGenerateRequest):
    doc = db.get_document(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    content_preview = doc["content"][:3500]

    system_prompt = (
        "You are an expert exam question creator for BuddyLens AI. "
        "You create high-yield, realistic 4-option multiple-choice questions directly tested on student lecture notes. "
        "Output ONLY valid JSON."
    )

    prompt = f"""Generate {payload.num_questions} multiple-choice questions from the following lecture notes.
Return ONLY a valid JSON array of objects with these exact keys:
[
  {{
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Clear explanation of why this option is correct based on the notes.",
    "topic": "Name of the specific topic/concept tested"
  }}
]

Lecture Notes:
{content_preview}
"""

    response_text, model_name = await ai_manager.generate(prompt, system_prompt)

    try:
        raw_questions = safe_parse_json(response_text)
    except Exception:
        # Fallback to deterministic questions if AI output was not well-formed JSON
        fallback_res = await ai_manager.fallback_provider.generate_response(f"quiz {content_preview[:400]}")
        raw_questions = safe_parse_json(fallback_res)

    quiz_id = str(uuid.uuid4())
    questions: List[QuizQuestion] = []
    for i, q in enumerate(raw_questions):
        options = q.get("options", ["A", "B", "C", "D"])
        # Ensure 4 options
        while len(options) < 4:
            options.append(f"Option {len(options) + 1}")
        options = options[:4]
        
        correct_idx = q.get("correct_option_index", 0)
        if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx > 3:
            correct_idx = 0

        questions.append(QuizQuestion(
            id=f"{quiz_id}_q_{i}",
            question=q.get("question", f"Question {i + 1}"),
            options=options,
            correct_option_index=correct_idx,
            explanation=q.get("explanation", "Verified from lecture notes."),
            topic=q.get("topic", "General Core Concept")
        ))

    # Save quiz to DB
    db.save_quiz(quiz_id, payload.document_id, [q.model_dump() for q in questions])

    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="quiz_generated",
        title=f"Generated Quiz ({len(questions)} Qs)",
        description=f"Created revision quiz on '{doc['title'][:30]}' using {model_name}.",
        doc_id=payload.document_id
    )

    return QuizGenerateResponse(
        quiz_id=quiz_id,
        document_id=payload.document_id,
        questions=questions,
        model_used=model_name
    )


@router.post("/quiz/submit", response_model=QuizSubmitResponse)
async def submit_quiz(payload: QuizSubmitRequest):
    quiz = db.get_quiz(payload.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    questions_map = {q["id"]: q for q in quiz["questions"]}
    score = 0
    total = len(quiz["questions"])
    evaluations: List[QuizEvaluationResult] = []
    weak_topics_set = set()

    # Create submission map
    sub_map = {ans.question_id: ans.selected_option_index for ans in payload.answers}

    for q in quiz["questions"]:
        qid = q["id"]
        selected = sub_map.get(qid, -1)
        correct = q["correct_option_index"]
        is_corr = (selected == correct)

        if is_corr:
            score += 1
        else:
            weak_topics_set.add(q.get("topic", "Key Principle"))

        evaluations.append(QuizEvaluationResult(
            question_id=qid,
            question=q["question"],
            selected_option_index=selected,
            correct_option_index=correct,
            is_correct=is_corr,
            explanation=q.get("explanation", ""),
            topic=q.get("topic", "General Concept")
        ))

    percentage = round((score / (total or 1)) * 100, 1)
    weak_topics = list(weak_topics_set)
    attempt_id = str(uuid.uuid4())

    db.save_quiz_attempt(
        attempt_id=attempt_id,
        quiz_id=payload.quiz_id,
        doc_id=payload.document_id,
        score=score,
        total_questions=total,
        weak_topics=weak_topics,
        evaluations=[e.model_dump() for e in evaluations]
    )

    recommendations = [f"Re-read notes section on '{topic}'" for topic in weak_topics]
    if not recommendations:
        recommendations = ["Excellent mastery! Solidify your recall with another timed quiz before the exam."]

    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="quiz_completed",
        title=f"Completed Quiz: {score}/{total} ({percentage}%)",
        description=f"Identified {len(weak_topics)} weak topics to review.",
        doc_id=payload.document_id
    )

    return QuizSubmitResponse(
        quiz_id=payload.quiz_id,
        document_id=payload.document_id,
        score=score,
        total_questions=total,
        percentage=percentage,
        evaluations=evaluations,
        weak_topics=weak_topics,
        recommended_focus=recommendations
    )


@router.post("/revision-plan", response_model=RevisionPlanResponse)
async def generate_revision_plan(payload: RevisionPlanRequest):
    doc = db.get_document(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    weak_topics = payload.weak_topics or []
    if not weak_topics:
        # Check database for recent weak topics
        insights = db.get_insights()
        weak_topics = [w["topic"] for w in insights["weak_topics"][:3]]
    if not weak_topics:
        weak_topics = doc.get("topics", ["Core Concepts"])[:3]

    weak_topics_str = ", ".join(weak_topics)
    content_preview = doc["content"][:2500]

    system_prompt = (
        "You are BuddyLens AI, an academic study coach. Create a realistic, highly actionable 3-4 step revision plan "
        "designed specifically to fix the student's weak topics. Output ONLY valid JSON."
    )

    prompt = f"""Generate a targeted revision plan for an upcoming exam.
Student's weak topics needing immediate focus: {weak_topics_str}

Return ONLY valid JSON matching this schema:
{{
  "title": "Focused Revision Plan for Exam Readiness",
  "overview": "Brief 2-sentence rationale prioritizing the identified weak topics.",
  "tasks": [
    {{
      "step_number": 1,
      "task_type": "Review",
      "topic": "{weak_topics[0] if weak_topics else 'Core Topic'}",
      "action_detail": "Concrete active-recall action to execute",
      "estimated_minutes": 15
    }},
    {{
      "step_number": 2,
      "task_type": "Practice",
      "topic": "Practical Application",
      "action_detail": "Specific exercise or problem to solve",
      "estimated_minutes": 20
    }},
    {{
      "step_number": 3,
      "task_type": "Quiz",
      "topic": "Rapid Recall Test",
      "action_detail": "Verify retention on weak areas",
      "estimated_minutes": 10
    }}
  ]
}}

Notes Reference:
{content_preview}
"""

    response_text, model_name = await ai_manager.generate(prompt, system_prompt)

    try:
        plan_data = safe_parse_json(response_text)
    except Exception:
        fallback_res = await ai_manager.fallback_provider.generate_response("revision plan")
        plan_data = safe_parse_json(fallback_res)

    tasks: List[RevisionTask] = []
    if isinstance(plan_data, list):
        raw_tasks = plan_data
        plan_title = "Focused Revision Plan for Exam Readiness"
        overview = "A tailored schedule prioritizing your weakest areas."
    elif isinstance(plan_data, dict):
        raw_tasks = plan_data.get("tasks", [])
        plan_title = plan_data.get("title", "Exam Revision Action Plan")
        overview = plan_data.get("overview", "A tailored schedule prioritizing your weakest areas.")
    else:
        raw_tasks = []
        plan_title = "Revision Action Plan"
        overview = "Review key areas from the study session."

    for i, t in enumerate(raw_tasks):
        tasks.append(RevisionTask(
            step_number=t.get("step_number", i + 1),
            task_type=t.get("task_type", "Review"),
            topic=t.get("topic", "Target Concept"),
            action_detail=t.get("action_detail", "Review lecture summary."),
            estimated_minutes=t.get("estimated_minutes", 15)
        ))

    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="revision_plan",
        title="Created Focused Revision Plan",
        description=f"Generated {len(tasks)}-step plan prioritizing: {weak_topics_str}",
        doc_id=payload.document_id
    )

    return RevisionPlanResponse(
        document_id=payload.document_id,
        plan_title=plan_title,
        overview=overview,
        tasks=tasks,
        model_used=model_name
    )
