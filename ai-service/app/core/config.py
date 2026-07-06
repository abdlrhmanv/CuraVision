from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    # Provider selection — "groq" (hosted) or "ollama" (local).
    llm_provider: str = "groq"

    # Groq ---------------------------------------------------------------
    # When LLM_PROVIDER=groq this must be set. For LLM_PROVIDER=ollama it
    # can be left empty.
    groq_api_key: str = ""
    groq_model: str = "llama3-8b-8192"

    # Ollama -------------------------------------------------------------
    # Point at a running `ollama serve` instance. Default is the CLI default.
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # ChromaDB -----------------------------------------------------------
    # When CHROMA_HOST is set we use the HTTP client against a running
    # `chromadb/chroma` container; otherwise the rag_service falls back to
    # an in-process EphemeralClient (fine for tests and solo dev).
    chroma_host: str = ""
    chroma_port: int = 8000

    # CORS ---------------------------------------------------------------
    # Comma-separated list of allowed origins.
    cors_origins: str = "http://localhost:3001"

    # Service ------------------------------------------------------------
    port: int = 8001

    # Shared secret for backend ↔ AI service-to-service calls.
    internal_service_token: str = ""


settings = Settings()
