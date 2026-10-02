import abc
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class BaseAIProvider(abc.ABC):
    """
    Abstract interface for AI generation in BuddyLens AI.
    Guarantees seamless swappability between:
    - Local Gemma (via Ollama or vLLM)
    - Hosted Open-Weight Gemma API endpoints (OpenAI-compatible)
    - Offline fallback / deterministic rule engine when no AI server is connected
    """

    @abc.abstractmethod
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generates plain text response."""
        pass

    @abc.abstractmethod
    async def is_available(self) -> bool:
        """Health check for this provider."""
        pass

    @property
    @abc.abstractmethod
    def provider_name(self) -> str:
        pass


class OllamaGemmaProvider(BaseAIProvider):
    """
    Local Open-Source Gemma provider via Ollama.
    Supports Gemma 2 models: gemma2:2b, gemma2:9b, gemma2:27b.
    100% private, free, and runs entirely on the student's machine.
    """
    def __init__(self, base_url: str = "http://localhost:11434", model_name: str = "gemma2:2b"):
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name

    @property
    def provider_name(self) -> str:
        return f"Local Gemma ({self.model_name} via Ollama)"

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(f"{self.base_url}/api/generate", json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Ollama API returned status {res.status_code}: {res.text}")
            data = res.json()
            return data.get("response", "").strip()


class HostedGemmaProvider(BaseAIProvider):
    """
    Configurable Hosted Inference Endpoint for Gemma family (OpenAI-compatible v1/chat/completions).
    Used when local hardware lacks sufficient VRAM or for remote deployments.
    Compatible with Groq, OpenRouter, Together AI, Anyscale, vLLM, and TGI.
    """
    def __init__(self, base_url: str, api_key: str, model_name: str = "gemma-2-9b-it"):
        self.base_url = (base_url or "").strip().strip('"').strip("'").rstrip("/")
        # Sanitize API key: strip whitespace, surrounding quotes, and redundant 'Bearer ' prefix
        clean_key = (api_key or "").strip().strip('"').strip("'")
        if clean_key.lower().startswith("bearer "):
            clean_key = clean_key[7:].strip().strip('"').strip("'")
        self.api_key = clean_key
        self.model_name = (model_name or "gemma-2-9b-it").strip().strip('"').strip("'")

    @property
    def provider_name(self) -> str:
        return f"Hosted Gemma ({self.model_name})"

    async def is_available(self) -> bool:
        if not self.base_url or not self.api_key:
            return False
        # Validate that base_url has a valid http/https scheme
        if not (self.base_url.startswith("http://") or self.base_url.startswith("https://")):
            return False
        return True

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if not self.base_url or not self.api_key:
            raise ValueError("Hosted Gemma is not configured: missing base URL or API key.")

        clean_key = (self.api_key or "").strip().strip('"').strip("'")
        if clean_key.lower().startswith("bearer "):
            clean_key = clean_key[7:].strip().strip('"').strip("'")

        headers = {
            "Authorization": f"Bearer {clean_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://buddylens-ai-3.onrender.com",
            "X-Title": "BuddyLens AI"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.2
        }

        url = f"{self.base_url}/chat/completions" if not self.base_url.endswith("/chat/completions") else self.base_url

        # Retry up to 3 attempts on transient 429 rate limit or 503 service unavailable
        max_attempts = 3
        async with httpx.AsyncClient(timeout=45.0) as client:
            for attempt in range(1, max_attempts + 1):
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
                elif res.status_code in (429, 503) and attempt < max_attempts:
                    import asyncio
                    logger.warning(f"Hosted API returned {res.status_code} on attempt {attempt}/{max_attempts}. Retrying in 1.5s...")
                    await asyncio.sleep(1.5)
                    continue
                else:
                    raise RuntimeError(f"Hosted API error {res.status_code}: {res.text}")


class DeterministicRuleFallbackProvider(BaseAIProvider):
    """
    Offline Rule-Based Fallback Provider.
    Ensures BuddyLens AI NEVER crashes or leaves the student stranded even if
    local Ollama is stopped and no external API keys are configured.
    Generates intelligent heuristic extractions, grounded summaries, and structured questions.
    """

    @property
    def provider_name(self) -> str:
        return "Deterministic Study Engine (Offline Fallback)"

    async def is_available(self) -> bool:
        return True

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        # Heuristic analyzer based on prompt contents
        prompt_lower = prompt.lower()

        # Revision plan request (check first before quiz because revision plan tasks may include 'Quiz')
        if "revision plan" in prompt_lower or "revision" in prompt_lower:
            plan = {
                "title": "Targeted Mastery Revision Plan",
                "overview": "A 3-step action plan designed to eliminate weak spots and reinforce key lecture definitions before exams.",
                "tasks": [
                    {
                        "step_number": 1,
                        "task_type": "Review",
                        "topic": "Core Fundamentals",
                        "action_detail": "Re-read highlighted definitions and summaries in your notes. Pay attention to how terms are distinguished.",
                        "estimated_minutes": 15
                    },
                    {
                        "step_number": 2,
                        "task_type": "Practice",
                        "topic": "Key Applications & Examples",
                        "action_detail": "Draft 2 practical examples or diagrams that illustrate how these principles work together.",
                        "estimated_minutes": 20
                    },
                    {
                        "step_number": 3,
                        "task_type": "Quiz",
                        "topic": "Self-Testing & Active Recall",
                        "action_detail": "Retake the practice quiz without referencing notes to verify your recall on previously missed topics.",
                        "estimated_minutes": 10
                    }
                ]
            }
            return json.dumps(plan)

        # Quiz generation request
        if "multiple-choice" in prompt_lower or "generate a 4-option quiz" in prompt_lower or "quiz" in prompt_lower:
            # Extract key sentences from the prompt context
            lines = [line.strip() for line in prompt.split("\n") if len(line.strip()) > 35]
            sample_lines = lines[:4] if len(lines) >= 4 else ["Core concepts in study material", "Primary definitions and formulas"]
            
            sample_quiz = [
                {
                    "question": f"Based on the notes, what is the central concept discussed regarding {sample_lines[0][:30]}...?",
                    "options": [
                        sample_lines[0][:50],
                        "An unrelated secondary mechanism",
                        "A legacy framework not supported here",
                        "None of the above"
                    ],
                    "correct_option_index": 0,
                    "explanation": f"According to your study notes: '{sample_lines[0][:90]}...'",
                    "topic": "Core Fundamentals"
                },
                {
                    "question": "Which of the following best represents a primary principle highlighted in this material?",
                    "options": [
                        "Random trial and error without metrics",
                        sample_lines[min(1, len(sample_lines)-1)][:55],
                        "Complete disregard of system constraints",
                        "Immediate deprecation of core state"
                    ],
                    "correct_option_index": 1,
                    "explanation": "This point is directly emphasized in the provided study material.",
                    "topic": "Principles & Mechanisms"
                },
                {
                    "question": "When applying this subject to exam questions, which aspect is most crucial to remember?",
                    "options": [
                        "Synthesizing the core rules and verifiable definitions",
                        "Memorizing only trivia",
                        "Ignoring definitions",
                        "Skipping the revision step"
                    ],
                    "correct_option_index": 0,
                    "explanation": "Synthesizing the verified definitions from the lecture notes is key for retention.",
                    "topic": "Application & Review"
                }
            ]
            return json.dumps(sample_quiz)

        # Summarize request
        if "summarize" in prompt_lower or "summary" in prompt_lower:
            return (
                "### Document Summary\n\n"
                "• **Key Theme:** The uploaded notes present the essential principles, terminology, and operational mechanisms of the subject.\n"
                "• **Primary Focus:** Structured understanding of core components and their practical relationships.\n"
                "• **Exam Relevance:** Review definitions carefully, especially contrasting concepts and step-by-step procedures.\n\n"
                "*Note: Running with offline study engine. Connect Ollama (gemma2:2b) or configure HOSTED_API_KEY for dynamic Gemma generation.*"
            )

        # General Question Answering
        return (
            "Based on the provided excerpts from your study notes:\n\n"
            "The material emphasizes foundational definitions and systematic concepts. "
            "To answer your question directly: verify the relevant section referenced in your document citations below. "
            "Every core term connects back to the fundamental rules laid out in your lecture notes."
        )


class AIProviderManager:
    """
    Manages selection and fallback for AI providers.
    Order of preference when mode is 'auto':
    1. Hosted Gemma API (if configured with base_url and api_key)
    2. Local Ollama Gemma (if available)
    3. Deterministic Study Engine (fallback)
    """
    def __init__(
        self,
        ollama_url: str,
        gemma_model: str,
        hosted_url: str,
        hosted_key: str,
        hosted_model: str,
        default_mode: str = "auto"
    ):
        self.default_mode = (default_mode or "auto").lower().strip()
        self.ollama_provider = OllamaGemmaProvider(base_url=ollama_url, model_name=gemma_model)
        self.hosted_provider = HostedGemmaProvider(base_url=hosted_url, api_key=hosted_key, model_name=hosted_model)
        self.fallback_provider = DeterministicRuleFallbackProvider()

    async def get_active_provider(self, force_provider: Optional[str] = None) -> BaseAIProvider:
        mode = (force_provider or self.default_mode).lower().strip()

        if mode == "fallback":
            return self.fallback_provider

        if mode == "hosted":
            if await self.hosted_provider.is_available():
                return self.hosted_provider
            logger.warning("Hosted provider requested but not available. Falling back to deterministic engine.")
            return self.fallback_provider

        if mode == "ollama":
            if await self.ollama_provider.is_available():
                return self.ollama_provider
            logger.warning("Ollama provider requested but not reachable. Falling back to deterministic engine.")
            return self.fallback_provider

        # Auto detection:
        # Check hosted Gemma first (e.g. Groq, OpenRouter, vLLM)
        if await self.hosted_provider.is_available():
            return self.hosted_provider
        # Next check local Ollama
        if await self.ollama_provider.is_available():
            return self.ollama_provider

        return self.fallback_provider

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, force_provider: Optional[str] = None) -> tuple[str, str]:
        provider = await self.get_active_provider(force_provider)
        try:
            response = await provider.generate_response(prompt, system_prompt)
            return response, provider.provider_name
        except Exception as e:
            err_msg = f"{type(e).__name__}: {e}"
            logger.warning(f"Provider '{provider.provider_name}' execution failed: {err_msg}. Falling back to deterministic study engine.", exc_info=True)
            response = await self.fallback_provider.generate_response(prompt, system_prompt)
            return response, f"{self.fallback_provider.provider_name} (after {provider.provider_name} error: {err_msg})"
