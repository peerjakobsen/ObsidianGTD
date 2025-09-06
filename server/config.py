from dotenv import load_dotenv
from pydantic import validator
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    aws_region: str = "us-east-1"
    aws_bearer_token_bedrock: str = ""
    bedrock_model_id: str = "us.anthropic.claude-sonnet-4-20250514-v1:0"
    log_level: str = "INFO"
    host: str = "localhost"
    port: int = 8000

    @validator("aws_bearer_token_bedrock")
    def validate_bedrock_api_key(cls, v):
        if not v:
            raise ValueError("AWS_BEARER_TOKEN_BEDROCK is required")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
