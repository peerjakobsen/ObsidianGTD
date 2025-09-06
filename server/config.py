from dotenv import load_dotenv
from pydantic import field_validator, ConfigDict
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=False)
    
    aws_region: str = "us-east-1"
    aws_bearer_token_bedrock: str = ""
    bedrock_model_id: str = "us.anthropic.claude-sonnet-4-20250514-v1:0"
    log_level: str = "INFO"
    host: str = "localhost"
    port: int = 8000

    @field_validator("aws_bearer_token_bedrock")
    def validate_bedrock_api_key(cls, v):
        if not v or not v.strip():
            raise ValueError("AWS_BEARER_TOKEN_BEDROCK is required and cannot be empty")
        return v.strip()


settings = Settings()
