# Import BaseSettings to load configuration from environment variables.
from pydantic_settings import BaseSettings, SettingsConfigDict


# Central configuration for the backend application.
class Settings(BaseSettings):
    # General application configuration.
    app_name: str = "Production-Grade RAG System"
    app_version: str = "0.1.0"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    # PostgreSQL connection string used by SQLAlchemy.
    database_url: str

    # Optional hosted generation provider; embeddings remain local through Ollama.
    ai_api_key: str | None = None
    ai_model: str = "llama-3.1-8b-instant"
    ai_base_url: str = "https://api.groq.com/openai/v1/chat/completions"

    # Load configuration values from backend/.env.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Create one reusable settings instance.
settings = Settings()
