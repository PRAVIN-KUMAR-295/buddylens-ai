import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "BuddyLens AI"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]
    
    # Storage
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    DATABASE_URL: str = "sqlite:///./data/buddylens.db"
    
    # Upload limits (e.g. 15MB)
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024
    
    # AI Provider configuration: "auto", "ollama", "openai_compatible", "rule_fallback"
    # Gemma is supported natively via Ollama (e.g. gemma2:2b, gemma2:9b),
    # or hosted endpoints (OpenAI-compatible v1/chat/completions e.g. OpenRouter/Groq/Together/vLLM)
    AI_PROVIDER: str = "auto"
    GEMMA_MODEL_NAME: str = "gemma2:2b"
    
    # Ollama settings (Local Open-Source Gemma)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Hosted Open-Weight Gemma API settings (e.g. Groq, OpenRouter, self-hosted vLLM/TGI)
    HOSTED_API_BASE_URL: str = ""
    HOSTED_API_KEY: str = ""
    HOSTED_MODEL_NAME: str = "gemma-2-9b-it"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        extra = "ignore"

settings = Settings()
