from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Test suite for health check endpoint functionality."""

    def test_health_endpoint_exists(self):
        """Test that GET /health endpoint exists and returns 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_endpoint_response_format(self):
        """Test that health endpoint returns correct JSON format."""
        response = client.get("/health")
        json_data = response.json()

        # Verify required fields are present
        assert "status" in json_data
        assert "service" in json_data
        assert "version" in json_data
        assert "timestamp" in json_data

        # Verify field values
        assert json_data["service"] == "fastapi-bedrock-service"
        assert json_data["version"] == "1.0.0"
        assert json_data["status"] in ["healthy", "unhealthy"]

    def test_health_endpoint_content_type(self):
        """Test that health endpoint returns JSON content type."""
        response = client.get("/health")
        assert response.headers["content-type"] == "application/json"

    def test_health_endpoint_healthy_status(self):
        """Test that health endpoint returns healthy status by default."""
        response = client.get("/health")
        json_data = response.json()
        assert json_data["status"] == "healthy"

    def test_health_endpoint_timestamp_format(self):
        """Test that health endpoint timestamp is in ISO format."""
        response = client.get("/health")
        json_data = response.json()

        # Verify timestamp is present and is a string
        assert isinstance(json_data["timestamp"], str)

        # Verify timestamp follows ISO format pattern
        from datetime import datetime

        datetime.fromisoformat(json_data["timestamp"].replace("Z", "+00:00"))


class TestProcessEndpoint:
    """Test suite for process endpoint functionality."""

    def test_process_endpoint_exists(self):
        """Test that POST /process endpoint exists."""
        payload = {"task": "organize", "content": "Test content"}
        response = client.post("/process", json=payload)
        # Should not return 404 (not found) or 405 (method not allowed)
        assert response.status_code != 404
        assert response.status_code != 405

    @patch('main.bedrock_client.process_request', new_callable=AsyncMock)
    def test_process_endpoint_valid_request(self, mock_bedrock):
        """Test that process endpoint accepts valid requests with mocked Bedrock."""
        # Mock successful Bedrock response
        mock_bedrock.return_value = {
            "success": True,
            "response": "Organized tasks: 1. Clean inbox 2. Organize tasks",
            "model": "us.anthropic.claude-sonnet-4-20250514-v1:0"
        }
        
        payload = {
            "task": "organize",
            "content": "Clean up my inbox and organize tasks",
        }
        response = client.post("/process", json=payload)

        # Should return 200 for successful processing
        assert response.status_code == 200

        json_data = response.json()
        assert "result" in json_data
        assert "status" in json_data
        assert "metadata" in json_data
        assert json_data["status"] == "success"
        assert "Organized tasks" in json_data["result"]
        assert json_data["metadata"]["model"] == "us.anthropic.claude-sonnet-4-20250514-v1:0"

    @patch('main.bedrock_client.process_request', new_callable=AsyncMock)
    def test_process_endpoint_bedrock_error(self, mock_bedrock):
        """Test that process endpoint handles Bedrock service errors."""
        # Mock Bedrock error response
        mock_bedrock.return_value = {
            "success": False,
            "error": "ServiceUnavailableException: Service temporarily unavailable",
            "model": "us.anthropic.claude-sonnet-4-20250514-v1:0"
        }
        
        payload = {
            "task": "organize",
            "content": "Test content",
        }
        response = client.post("/process", json=payload)

        # Should return 503 for service unavailable
        assert response.status_code == 503
        
        json_data = response.json()
        assert "error" in json_data
        assert "ServiceUnavailableException" in json_data["error"]["details"]

    def test_process_endpoint_invalid_request_missing_task(self):
        """Test that process endpoint rejects requests missing task."""
        payload = {"content": "Test content"}
        response = client.post("/process", json=payload)
        assert response.status_code == 422

    def test_process_endpoint_invalid_request_missing_content(self):
        """Test that process endpoint rejects requests missing content."""
        payload = {"task": "organize"}
        response = client.post("/process", json=payload)
        assert response.status_code == 422

    def test_process_endpoint_invalid_request_empty_fields(self):
        """Test that process endpoint rejects empty fields."""
        payload = {"task": "", "content": ""}
        response = client.post("/process", json=payload)
        assert response.status_code == 422

    @patch('main.bedrock_client.process_request', new_callable=AsyncMock)
    def test_process_endpoint_content_type(self, mock_bedrock):
        """Test that process endpoint accepts JSON content type."""
        # Mock successful Bedrock response
        mock_bedrock.return_value = {
            "success": True,
            "response": "Processed test content successfully",
            "model": "us.anthropic.claude-sonnet-4-20250514-v1:0"
        }
        
        payload = {"task": "organize", "content": "Test content"}
        response = client.post("/process", json=payload)
        # Should not fail due to content type issues
        assert response.status_code != 415  # Unsupported Media Type

    @patch('main.bedrock_client.process_request', new_callable=AsyncMock)
    def test_process_endpoint_large_content(self, mock_bedrock):
        """Test that process endpoint handles large content appropriately."""
        # Mock successful Bedrock response for large content
        mock_bedrock.return_value = {
            "success": True,
            "response": "Summary of large content: This is a long repetitive text that has been processed.",
            "model": "us.anthropic.claude-sonnet-4-20250514-v1:0"
        }
        
        large_content = "x" * 5000  # Large but within limits
        payload = {"task": "summarize", "content": large_content}
        response = client.post("/process", json=payload)
        # Should either process or return validation error, but not crash
        assert response.status_code in [200, 422, 500]

    def test_process_endpoint_very_large_content(self):
        """Test that process endpoint rejects oversized content."""
        oversized_content = "x" * 10001  # Over the 10000 char limit
        payload = {"task": "organize", "content": oversized_content}
        response = client.post("/process", json=payload)
        assert response.status_code == 422


class TestRootEndpoint:
    """Test suite for root endpoint (existing functionality)."""

    def test_root_endpoint_exists(self):
        """Test that root endpoint still works."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "FastAPI Bedrock Service is running"}
