import pytest
from pydantic import ValidationError
from models import ProcessRequest, ProcessResponse, HealthResponse, ErrorResponse


class TestProcessRequest:
    """Test suite for ProcessRequest Pydantic model."""

    def test_valid_process_request(self):
        """Test that valid ProcessRequest can be created."""
        data = {
            "task": "organize",
            "content": "Clean up my inbox items and organize them",
        }
        request = ProcessRequest(**data)
        assert request.task == "organize"
        assert request.content == "Clean up my inbox items and organize them"

    def test_process_request_missing_task(self):
        """Test that ProcessRequest requires task field."""
        data = {"content": "Some content"}
        with pytest.raises(ValidationError) as exc_info:
            ProcessRequest(**data)
        assert "task" in str(exc_info.value)

    def test_process_request_missing_content(self):
        """Test that ProcessRequest requires content field."""
        data = {"task": "organize"}
        with pytest.raises(ValidationError) as exc_info:
            ProcessRequest(**data)
        assert "content" in str(exc_info.value)

    def test_process_request_empty_task(self):
        """Test that ProcessRequest rejects empty task."""
        data = {"task": "", "content": "Some content"}
        with pytest.raises(ValidationError):
            ProcessRequest(**data)

    def test_process_request_empty_content(self):
        """Test that ProcessRequest rejects empty content."""
        data = {"task": "organize", "content": ""}
        with pytest.raises(ValidationError):
            ProcessRequest(**data)

    def test_process_request_whitespace_only_fields(self):
        """Test that ProcessRequest rejects whitespace-only fields."""
        data = {"task": "   ", "content": "  \n  "}
        with pytest.raises(ValidationError):
            ProcessRequest(**data)

    def test_process_request_max_length_validation(self):
        """Test that ProcessRequest validates field length limits."""
        # Task too long (assuming 100 char limit)
        long_task = "x" * 101
        data = {"task": long_task, "content": "Valid content"}
        with pytest.raises(ValidationError):
            ProcessRequest(**data)

        # Content too long (assuming 10000 char limit)
        long_content = "x" * 10001
        data = {"task": "organize", "content": long_content}
        with pytest.raises(ValidationError):
            ProcessRequest(**data)


class TestProcessResponse:
    """Test suite for ProcessResponse Pydantic model."""

    def test_valid_process_response(self):
        """Test that valid ProcessResponse can be created."""
        data = {
            "result": "Here are your organized tasks...",
            "status": "success",
            "metadata": {
                "model": "anthropic.claude-3-sonnet-20240229-v1:0",
                "tokens_used": 150,
                "processing_time_ms": 2500,
            },
        }
        response = ProcessResponse(**data)
        assert response.result == "Here are your organized tasks..."
        assert response.status == "success"
        assert response.metadata.model == "anthropic.claude-3-sonnet-20240229-v1:0"
        assert response.metadata.tokens_used == 150
        assert response.metadata.processing_time_ms == 2500

    def test_process_response_missing_required_fields(self):
        """Test that ProcessResponse requires all fields."""
        with pytest.raises(ValidationError):
            ProcessResponse(result="Some result")  # Missing status and metadata

    def test_process_response_invalid_status(self):
        """Test that ProcessResponse validates status values."""
        data = {
            "result": "Some result",
            "status": "invalid_status",
            "metadata": {
                "model": "test",
                "tokens_used": 100,
                "processing_time_ms": 1000,
            },
        }
        with pytest.raises(ValidationError):
            ProcessResponse(**data)


class TestHealthResponse:
    """Test suite for HealthResponse Pydantic model."""

    def test_valid_health_response(self):
        """Test that valid HealthResponse can be created."""
        data = {
            "status": "healthy",
            "service": "fastapi-bedrock-service",
            "version": "1.0.0",
            "timestamp": "2025-09-06T10:30:45Z",
        }
        response = HealthResponse(**data)
        assert response.status == "healthy"
        assert response.service == "fastapi-bedrock-service"
        assert response.version == "1.0.0"
        assert response.timestamp == "2025-09-06T10:30:45Z"

    def test_health_response_invalid_status(self):
        """Test that HealthResponse validates status values."""
        data = {
            "status": "maybe_healthy",
            "service": "test-service",
            "version": "1.0.0",
            "timestamp": "2025-09-06T10:30:45Z",
        }
        with pytest.raises(ValidationError):
            HealthResponse(**data)


class TestErrorResponse:
    """Test suite for ErrorResponse Pydantic model."""

    def test_valid_error_response(self):
        """Test that valid ErrorResponse can be created."""
        data = {
            "error": {
                "type": "validation_error",
                "message": "Invalid input provided",
                "details": "Task field cannot be empty",
            }
        }
        response = ErrorResponse(**data)
        assert response.error.type == "validation_error"
        assert response.error.message == "Invalid input provided"
        assert response.error.details == "Task field cannot be empty"

    def test_error_response_missing_fields(self):
        """Test that ErrorResponse requires all error fields."""
        data = {"error": {"type": "validation_error"}}  # Missing message and details
        with pytest.raises(ValidationError):
            ErrorResponse(**data)
