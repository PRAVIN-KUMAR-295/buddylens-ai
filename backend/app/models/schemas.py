from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    content: str
    char_count: int

class DocumentCreate(BaseModel):
    title: str
    content: str
    source_type: str = "paste" # "pdf" or "paste" or "demo"

class DocumentResponse(BaseModel):
    id: str
    title: str
    source_type: str
    char_count: int
    word_count: int
    chunk_count: int
    summary: Optional[str] = None
    topics: List[str] = []
    created_at: str

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    document_id: str
    query: str
    conversation_history: List[ChatMessage] = []

class GroundedCitation(BaseModel):
    chunk_id: str
    page_number: Optional[int] = None
    snippet: str

class ChatResponse(BaseModel):
    answer: str
    source_grounded: bool
    citations: List[GroundedCitation] = []
    model_used: str

class SummarizeRequest(BaseModel):
    document_id: str
    mode: str = "concise" # "concise", "bullet_points", "key_takeaways"

class SummarizeResponse(BaseModel):
    summary: str
    key_points: List[str] = []
    model_used: str

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str
    topic: str

class QuizGenerateRequest(BaseModel):
    document_id: str
    num_questions: int = 5

class QuizGenerateResponse(BaseModel):
    quiz_id: str
    document_id: str
    questions: List[QuizQuestion]
    model_used: str

class QuizAnswerSubmission(BaseModel):
    question_id: str
    selected_option_index: int

class QuizSubmitRequest(BaseModel):
    quiz_id: str
    document_id: str
    answers: List[QuizAnswerSubmission]

class QuizEvaluationResult(BaseModel):
    question_id: str
    question: str
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: str
    topic: str

class QuizSubmitResponse(BaseModel):
    quiz_id: str
    document_id: str
    score: int
    total_questions: int
    percentage: float
    evaluations: List[QuizEvaluationResult]
    weak_topics: List[str]
    recommended_focus: List[str]

class RevisionPlanRequest(BaseModel):
    document_id: str
    weak_topics: Optional[List[str]] = None

class RevisionTask(BaseModel):
    step_number: int
    task_type: str # "Review", "Practice", "Quiz", "Flashcard"
    topic: str
    action_detail: str
    estimated_minutes: int

class RevisionPlanResponse(BaseModel):
    document_id: str
    plan_title: str
    overview: str
    tasks: List[RevisionTask]
    model_used: str

class ActivityItem(BaseModel):
    id: str
    action_type: str # "upload", "chat", "quiz_generated", "quiz_completed", "revision_plan"
    title: str
    description: str
    timestamp: str
    document_id: Optional[str] = None
    metadata: Dict[str, Any] = {}

class InsightsResponse(BaseModel):
    total_documents: int
    questions_asked: int
    quizzes_completed: int
    average_quiz_score: float
    weak_topics: List[Dict[str, Any]] # e.g. [{"topic": "...", "mistake_count": 2}]
    recent_documents: List[DocumentResponse]
