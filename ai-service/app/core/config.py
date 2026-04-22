from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    port: int = 8001

    class Config:
        env_file = ".env"


settings = Settings()
