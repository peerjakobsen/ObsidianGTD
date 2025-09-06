"""FastAPI Bedrock Service - Pydantic Models

This module defines request and response models for the FastAPI service.
"""

from typing import Literal
from pydantic import BaseModel, Field, field_validator


class ProcessRequest(BaseModel):
    """Request model for the /process endpoint."""

    task: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="The type of task to perform (e.g., 'organize', 'summarize')",
    )
    content: str = Field(
        ..., min_length=1, max_length=10000, description="The content to be processed"
    )

    @field_validator("task", "content")
    @classmethod
    def validate_not_whitespace(cls, v: str) -> str:
        """Ensure fields are not just whitespace."""
        if not v.strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return v.strip()


class ProcessMetadata(BaseModel):
    """Metadata for the processing response."""

    model: str = Field(..., description="The AI model used for processing")
    tokens_used: int = Field(..., ge=0, description="Number of tokens used")
    processing_time_ms: int = Field(
        ..., ge=0, description="Processing time in milliseconds"
    )


class ProcessResponse(BaseModel):
    """Response model for the /process endpoint."""

    result: str = Field(..., description="The processed result")
    status: Literal["success", "error"] = Field(..., description="Processing status")
    metadata: ProcessMetadata = Field(..., description="Processing metadata")


class HealthResponse(BaseModel):
    """Response model for the /health endpoint."""

    status: Literal["healthy", "unhealthy"] = Field(
        ..., description="Service health status"
    )
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    timestamp: str = Field(..., description="Response timestamp in ISO format")


class ErrorDetail(BaseModel):
    """Error detail information."""

    type: str = Field(..., description="Type of error")
    message: str = Field(..., description="Error message")
    details: str = Field(..., description="Additional error details")


class ErrorResponse(BaseModel):
    """Error response model for all endpoints."""

    error: ErrorDetail = Field(..., description="Error information")
