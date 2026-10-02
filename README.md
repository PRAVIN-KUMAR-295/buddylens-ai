# BuddyLens AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React: 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite: 8](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Open-Source AI: Gemma](https://img.shields.io/badge/AI-Gemma%202-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev/gemma)

> **Hacktoberfest 2026 DEV Weekend Challenge:** *"Build for a Friend"*  
> An open-weight AI revision companion that turns dense student lecture notes and PDFs into grounded explanations, active-recall quizzes, and targeted revision schedules.

---

## Table of Contents
1. [Problem](#problem)
2. [Built For A Friend](#built-for-a-friend)
3. [Solution](#solution)
4. [Features](#features)
5. [Architecture](#architecture)
6. [Open-Source AI (Gemma Integration)](#open-source-ai-gemma-integration)
7. [Why Open Innovation Matters](#why-open-innovation-matters)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Local Setup](#local-setup)
11. [Environment Variables](#environment-variables)
12. [Running The Application](#running-the-application)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [AI Disclosure](#ai-disclosure)
16. [Third-Party & Open-Source Credits](#third-party--open-source-credits)
17. [Limitations](#limitations)
18. [Future Improvements](#future-improvements)

---

## Problem
College students frequently struggle when preparing for examinations using slide decks, lecture PDFs, and unstructured notes. While students can often follow along during lectures, independent exam revision creates distinct friction points:
- **Dense volume:** Reviewing 60+ slides or 20-page handouts the night before an exam is overwhelming.
- **Passive reading illusion:** Students repeatedly reread notes, which yields low retention compared to active recall.
- **Identifying blind spots:** It is difficult to know which concepts are misunderstood until an exam begins.
- **Fragmented revision time:** Students lack structured, timed plans to review their weakest concepts first.

---

## Built For A Friend
BuddyLens AI was designed specifically to solve the revision workflow of a college friend who found themselves drowning in dense Operating Systems and Systems Programming lecture PDFs before midterm exams. Rather than another generic chatbot, they needed:
1. Grounded answers that cite actual passages in their professor's slides (avoiding fabricated hallucinations).
2. Practice quizzes generated directly from the notes to test recall.
3. Automated tracking of missed concepts so study sessions focus on real weaknesses.
4. A concise, realistic 3-step revision plan for the day of the exam.

---

## Solution
BuddyLens AI is an end-to-end study application that bridges document parsing, lexical retrieval (BM25), and open-weight language models (Gemma family) into a focused revision workspace.

Students can drag and drop lecture PDFs or paste raw text. The application extracts and chunks the material, indexes it for deterministic retrieval, and powers an interactive study workspace featuring:
- Plain-English concept breakdowns with explicit note citations.
- High-yield summary cards with key definitions.
- 4-option multiple-choice quizzes with explanations.
- Automatic weak-topic aggregation across quiz attempts.
- Prioritized daily revision agendas with time budgets.

---

## Features
- **PDF & Note Ingestion:** Multi-page PDF extraction with scanned/image-only detection and a manual text paste fallback.
- **Lightweight RAG Pipeline:** Overlapping text chunking combined with BM25 lexical retrieval for low-latency, zero-cost context matching.
- **Source-Grounded Answers:** Every AI answer is grounded in retrieved note passages, citing specific page references and snippets.
- **Active Recall Quiz Generator:** Synthesizes realistic 4-option MCQs directly from the material.
- **Weak Topic Tracking:** Automatically records missed questions into a dedicated tracking table to identify knowledge gaps.
- **Actionable Revision Plans:** Converts quiz mistakes into prioritized, timed study tasks (Review, Practice, Quiz).
- **Study Insights & Analytics:** Live analytics on total documents, queries asked, quizzes taken, and average score.
- **Activity Log:** Chronological audit trail of all study interactions.
- **Built-in Demo Dataset:** One-click loading of an Operating Systems Memory Management & Paging dataset for instant testing.

---

## Architecture

```
+-------------------------------------------------------------------------------+
|                                  BROWSER UI                                   |
|  React 19 + Vite 8 + Lucide Icons + Dark AI SaaS Theme (Desktop & Mobile)     |
+-------------------------------------------------------------------------------+
                                      |
                     REST API Calls (JSON / FormData)
                                      v
+-------------------------------------------------------------------------------+
|                            FASTAPI BACKEND SERVICE                            |
|                                                                               |
|  [ /api/documents ]  --> PDF Text Extractor (pypdf) & Sanitizer              |
|                          Text Chunker (Sliding Overlap)                       |
|                                                                               |
|  [ /api/chat ]       --> BM25 Lexical Retriever (Top-K Passages)              |
|                          Grounded Prompt Construction                         |
|                                                                               |
|  [ /api/quiz ]       --> MCQ Generator & Evaluator                            |
|                          Weak Topic Aggregator                                |
|                                                                               |
|  [ /api/revision ]   --> Action Plan Generator (Time-budgeted tasks)          |
|                                                                               |
|  [ Storage Layer ]   --> SQLite (Documents, Chunks, Quizzes, Weak Topics)     |
+-------------------------------------------------------------------------------+
                                      |
                           AI Provider Abstraction
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+---------------------------+                             +--------------------+
|   LOCAL OPEN-SOURCE       |                             |   CONFIGURABLE     |
|   Gemma 2 (2B / 9B)       |                             |   HOSTED GEMMA     |
|   via Ollama / vLLM       |                             |   (Groq/OpenRouter)|
|   (100% Private, Offline) |                             |   (Fallback/Cloud) |
+---------------------------+                             +--------------------+
         |                                                         |
         +----------------------------+----------------------------+
                                      | (If unavailable)
                                      v
                      +-------------------------------+
                      |   DETERMINISTIC STUDY ENGINE  |
                      |   (Offline Fallback Engine)   |
                      +-------------------------------+
```

---

## Open-Source AI (Gemma Integration)

BuddyLens AI places Google's **Gemma 2 open-weight model family** at the core of its intelligence pipeline:

### 1. Model Selection
- **Gemma 2 (2B / 9B):** Gemma 2's high parameter efficiency makes it ideal for local inference on student laptops without requiring enterprise clusters. Its 2B parameter variant runs comfortably on commodity CPUs and laptops with 8GB-16GB of RAM.

### 2. Provider Abstraction Architecture
The backend implements a unified interface (`BaseAIProvider`) in `app/services/ai_service.py`:
- `OllamaGemmaProvider`: Connects to a local Ollama instance running `gemma2:2b` or `gemma2:9b`. All student data remains entirely on the user's machine.
- `HostedGemmaProvider`: Configurable OpenAI-compatible endpoint (e.g. Groq, OpenRouter, self-hosted vLLM) for users whose machines cannot support local model weights.
- `DeterministicRuleFallbackProvider`: A deterministic, heuristic study engine that ensures BuddyLens AI never crashes or returns empty responses if AI runtimes are stopped.

### 3. Grounded Retrieval-Augmented Generation (RAG)
Rather than passing an entire textbook into a context window, the application chunks notes and retrieves the most relevant passages via BM25 scoring. The prompt explicitly constrains Gemma to ground its answers in the retrieved excerpts, producing verbatim citations and page snippets.

---

## Why Open Innovation Matters

1. **Student Data Privacy:** Students frequently upload confidential course materials, thesis drafts, unpublished assignments, and copyrighted professor slides. Running Gemma locally via Ollama ensures **zero data leaves the student's personal computer**.
2. **Cost and Accessibility:** Proprietary LLM APIs charge per token and require credit cards. Open-weight models empower students globally to revise without paywalls or usage limits.
3. **Hardware Portability & Swappability:** Through the provider abstraction, the application can run on an Apple Silicon Mac, an x86 Windows laptop with Ollama, a cluster running vLLM, or hosted inference without modifying application code.
4. **Local vs. Hosted Inference:**
   - **Local Inference (Ollama/vLLM):** Full offline capability, zero cloud cost, 100% privacy, dependent on host RAM/GPU.
   - **Hosted Inference (Groq/OpenRouter/Together):** Fast response times on low-end hardware, requires internet connection and an API key.

---

## Tech Stack

### Frontend
- **React 19:** Component-based UI with hooks and state management.
- **Vite 8:** Lightning-fast HMR and optimized production bundling.
- **Lucide React:** Modern, accessible UI icons.
- **Custom CSS:** Dark AI SaaS aesthetic with high contrast, glassmorphism, responsive grids, and loading skeletons.

### Backend
- **Python 3.10+:** Robust asynchronous runtime.
- **FastAPI:** High-performance async web framework with automatic OpenAPI documentation.
- **Uvicorn:** Production ASGI server binding to `0.0.0.0` and dynamic `PORT`.
- **Pydantic v2:** Typed request and response schema validation.
- **pypdf:** Reliable multi-page PDF parsing and text stream decoding.

### Retrieval & Storage
- **BM25 Lexical Retriever:** Deterministic, lightweight retrieval algorithm with TF-IDF term weighting.
- **SQLite:** Zero-setup transactional SQL database for documents, chunks, quiz attempts, and weak topics.

---

## Project Structure

```
buddylens-ai/
├── .env.example                # Sample environment configuration
├── .gitignore                  # Git exclusions for Python and Node
├── LICENSE                     # MIT open-source license
├── README.md                   # Comprehensive documentation
├── backend/
│   ├── .env                    # Local backend configuration
│   ├── requirements.txt        # Python dependencies
│   ├── run.py                  # Entrypoint binding to 0.0.0.0:$PORT
│   ├── app/
│   │   ├── main.py             # FastAPI app with CORS & health endpoint
│   │   ├── core/
│   │   │   └── config.py       # Pydantic Settings configuration
│   │   ├── models/
│   │   │   └── schemas.py      # Request & Response schemas
│   │   ├── storage/
│   │   │   └── database.py     # SQLite persistence layer
│   │   ├── services/
│   │   │   ├── ai_service.py   # AI Provider abstraction (Ollama/Hosted/Fallback)
│   │   │   ├── chunker.py      # Text chunking & BM25 retriever
│   │   │   └── extractor.py    # PDF extraction & text sanitizer
│   │   └── api/
│   │       ├── documents.py    # Upload, paste, sample notes endpoints
│   │       ├── chat.py         # Grounded chat & summarization endpoints
│   │       ├── study.py        # Quiz generator, evaluation & revision plan
│   │       └── insights.py     # Analytics & activity audit log
│   └── tests/
│       └── test_backend.py     # Pytest test suite
└── frontend/
    ├── package.json            # Vite & React dependencies
    ├── vite.config.js          # Vite build config
    └── src/
        ├── main.jsx            # React root mount
        ├── App.jsx             # Main dashboard shell & navigation
        ├── api.js              # Fetch client communicating with /api
        ├── index.css           # Dark AI SaaS CSS styles
        └── components/
            ├── Dashboard.jsx       # Landing overview & quick actions
            ├── UploadNotes.jsx     # PDF drag-and-drop & paste form
            ├── StudyWorkspace.jsx  # 3-column grounded revision workspace
            ├── QuizMode.jsx        # 4-option active recall quiz & results
            ├── RevisionPlan.jsx    # Actionable revision checklist
            ├── InsightsView.jsx    # Study metrics & weak topic tracker
            └── ActivityView.jsx    # Chronological study interaction log
```

---

## Local Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and `npm`
- *(Optional for 100% local AI)*: [Ollama](https://ollama.com) installed with `ollama run gemma2:2b`

### 1. Clone Repository
```bash
git clone https://github.com/your-username/buddylens-ai.git
cd buddylens-ai
```

### 2. Configure Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```

---

## Environment Variables

BuddyLens AI reads configuration from environment variables or a `.env` file:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `BuddyLens AI` | Application branding name |
| `APP_ENV` | `development` | Environment mode (`development` / `production`) |
| `PORT` | `8000` | Port for backend server |
| `HOST` | `0.0.0.0` | Host binding for cloud deployment |
| `DATABASE_URL` | `sqlite:///./data/buddylens.db` | Path to SQLite database file |
| `MAX_UPLOAD_SIZE_BYTES` | `15728640` | Maximum PDF upload size (15 MB) |
| `AI_PROVIDER` | `auto` | Provider mode: `auto`, `ollama`, `hosted`, `fallback` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama service endpoint |
| `GEMMA_MODEL_NAME` | `gemma2:2b` | Target local Gemma model tag |
| `HOSTED_API_BASE_URL` | `""` | Hosted inference URL (e.g. `https://api.groq.com/openai/v1`) |
| `HOSTED_API_KEY` | `""` | API key for hosted Gemma endpoint |
| `HOSTED_MODEL_NAME` | `gemma-2-9b-it` | Hosted model name |

---

## Running The Application

### Start Backend
```bash
cd backend
python run.py
```
*Backend runs on `http://localhost:8000`. Automatic OpenAPI documentation is available at `http://localhost:8000/docs`.*

### Start Frontend
```bash
cd frontend
npm run dev
```
*Frontend dev server launches at `http://localhost:5173`.*

---

## Testing

BuddyLens AI includes an automated test suite verifying health, document validation, chunking, BM25 retrieval, chat generation, quiz grading, weak-topic tracking, and revision plan generation:

```bash
cd backend
python -m pytest tests -v
```

Expected output:
```text
tests/test_backend.py::test_health_endpoint PASSED           [ 16%]
tests/test_backend.py::test_ai_status_endpoint PASSED        [ 33%]
tests/test_backend.py::test_chunker_and_bm25 PASSED          [ 50%]
tests/test_backend.py::test_pasted_notes_and_lifecycle PASSED[ 66%]
tests/test_backend.py::test_document_validation_errors PASSED[ 83%]
tests/test_backend.py::test_sample_notes_endpoint PASSED     [100%]
======================= 6 passed in ~13s =======================
```

---

## Deployment

The application is structured for cloud platforms (Render, Railway, Fly.io, Hugging Face Spaces, Docker):

### Backend Production Command
The backend respects platform-assigned `PORT` environment variables and binds to `0.0.0.0`:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Health Check Endpoint
Platforms can monitor instance health via:
```http
GET /api/health
```

### Frontend Production Build
```bash
cd frontend
npm run build
```
The output in `frontend/dist/` can be served via Vercel, Netlify, Cloudflare Pages, or static web servers.

---

## AI Disclosure
In adherence to Hacktoberfest guidelines and open-source transparency: AI coding assistants were utilized during the development sprint for boilerplate scaffolding, test authoring, and documentation generation. All application logic, provider abstractions, and architectural decisions were reviewed, debugged, and verified.

---

## Third-Party & Open-Source Credits
- **Gemma:** Open-weight models by Google DeepMind (Gemma Terms of Use / Apache 2.0 compatible weights).
- **FastAPI & Starlette:** High-performance web framework (MIT License).
- **pypdf:** PDF extraction library (BSD 3-Clause License).
- **React & Vite:** Modern web UI and build tooling (MIT License).
- **Lucide Icons:** Clean UI iconography (ISC License).

---

## Limitations
- **Scanned/Image-Only PDFs:** The default extractor parses embedded text streams. Image-only PDFs without an OCR layer will trigger an informative warning prompting the user to paste notes manually.
- **Hardware Requirements for 100% Local Inference:** While `gemma2:2b` runs on standard CPUs, larger models like `gemma2:9b` or `gemma2:27b` benefit significantly from 16GB+ RAM or an Apple Silicon / dedicated GPU. The built-in provider abstraction gracefully switches to hosted endpoints or the deterministic fallback engine when needed.

---

## Future Improvements
- Client-side WebAssembly OCR (Tesseract.js) for image-only PDF support.
- Spaced-repetition scheduling (SM-2 algorithm) for ongoing quiz reviews over multiple weeks.
- Export revision summaries directly to Markdown and Anki flashcard packages.
