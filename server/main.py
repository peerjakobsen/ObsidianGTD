import logging
import time
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from config import settings
from models import (
    ProcessRequest,
    ProcessResponse,
    ProcessMetadata,
    HealthResponse,
    ErrorResponse,
    ErrorDetail,
)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="FastAPI Bedrock Service",
    description="AI-powered task processing service for Obsidian GTD plugin via AWS Bedrock API keys",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers for comprehensive error handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with detailed error messages."""
    logger.error(f"Validation error on {request.url}: {exc}")

    # Extract detailed validation error information
    error_details = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_details.append(f"{field}: {message}")

    error_response = ErrorResponse(
        error=ErrorDetail(
            type="validation_error",
            message="Request validation failed",
            details="; ".join(error_details),
        )
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with structured error response."""
    logger.error(f"HTTP exception on {request.url}: {exc.status_code} - {exc.detail}")

    error_response = ErrorResponse(
        error=ErrorDetail(
            type="http_error",
            message=f"HTTP {exc.status_code}",
            details=str(exc.detail),
        )
    )

    return JSONResponse(
        status_code=exc.status_code, content=error_response.model_dump()
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions from business logic."""
    logger.error(f"Value error on {request.url}: {exc}")

    error_response = ErrorResponse(
        error=ErrorDetail(
            type="value_error", message="Invalid value provided", details=str(exc)
        )
    )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST, content=error_response.model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other unhandled exceptions."""
    logger.error(f"Unhandled exception on {request.url}: {type(exc).__name__}: {exc}")

    error_response = ErrorResponse(
        error=ErrorDetail(
            type="internal_error",
            message="An unexpected error occurred",
            details="Internal server error - please try again later",
        )
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(),
    )


@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "FastAPI Bedrock Service is running"}


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint that returns service status."""
    logger.info("Health endpoint accessed")
    return {
        "status": "healthy",
        "service": "fastapi-bedrock-service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


@app.post("/process", response_model=ProcessResponse)
async def process(request: ProcessRequest):
    """Process content using AI via AWS Bedrock."""
    start_time = time.time()
    logger.info(f"Process endpoint accessed with task: {request.task}")

    try:
        # For now, return a mock response until Bedrock integration is complete
        # This will be replaced with actual Bedrock client call in task 3.8

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Mock AI response based on task type
        if request.task == "organize":
            result = f"Organized content: {request.content[:100]}..."
        elif request.task == "summarize":
            result = f"Summary: {request.content[:50]}..."
        else:
            result = f"Processed '{request.task}' task: {request.content[:75]}..."

        metadata = ProcessMetadata(
            model="anthropic.claude-3-sonnet-20240229-v1:0",
            tokens_used=len(request.content.split()) + 50,  # Mock token count
            processing_time_ms=processing_time_ms,
        )

        response = ProcessResponse(result=result, status="success", metadata=metadata)

        logger.info(f"Process completed in {processing_time_ms}ms")
        return response

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        processing_time_ms = int((time.time() - start_time) * 1000)

        metadata = ProcessMetadata(
            model="anthropic.claude-3-sonnet-20240229-v1:0",
            tokens_used=0,
            processing_time_ms=processing_time_ms,
        )

        return ProcessResponse(
            result=f"Error processing request: {str(e)}",
            status="error",
            metadata=metadata,
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
