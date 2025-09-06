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
from bedrock_client import bedrock_client

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
async def process(request: ProcessRequest, raw_request: Request):
    """Process content using AI via AWS Bedrock."""
    start_time = time.time()
    logger.info(f"Process endpoint accessed with task: {request.task}")

    try:
        # Validate Content-Type header
        content_type = raw_request.headers.get("content-type", "")
        if not content_type or not content_type.startswith("application/json"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Content-Type must be application/json"
            )
        # For GTD clarification, pass content directly; for other tasks, wrap it
        if request.task == "gtd-clarification":
            # Pass the content directly - it's already a complete GTD prompt from the client
            prompt_to_send = request.content
        else:
            # Create a contextual prompt based on the task type for other tasks
            prompt_to_send = f"""Task: {request.task}
Content to process: {request.content}

Please process the above content according to the specified task."""

        # Call Bedrock API via bedrock_client
        bedrock_response = await bedrock_client.process_request(prompt_to_send)
        
        processing_time_ms = int((time.time() - start_time) * 1000)

        if bedrock_response["success"]:
            # Successful Bedrock response
            metadata = ProcessMetadata(
                model=bedrock_response["model"],
                tokens_used=len(request.content.split()) + len(bedrock_response["response"].split()),
                processing_time_ms=processing_time_ms,
            )

            response = ProcessResponse(
                result=bedrock_response["response"], 
                status="success", 
                metadata=metadata
            )

            logger.info(f"Process completed successfully in {processing_time_ms}ms")
            return response
        else:
            # Bedrock returned an error
            logger.error(f"Bedrock processing failed: {bedrock_response['error']}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {bedrock_response['error']}"
            )

    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        processing_time_ms = int((time.time() - start_time) * 1000)

        metadata = ProcessMetadata(
            model=settings.bedrock_model_id,
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
