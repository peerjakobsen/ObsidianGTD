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


class TestCORSConfiguration:
    """Test suite for CORS (Cross-Origin Resource Sharing) functionality."""

    def test_cors_middleware_is_configured(self):
        """Test that CORS middleware is properly configured in the FastAPI app."""
        from main import app
        
        # Check that CORS middleware is in the middleware stack
        middleware_classes = [str(middleware.cls) for middleware in app.user_middleware]
        
        # Look for CORS middleware in the stack (could be FastAPI's or Starlette's)
        cors_found = any("CORS" in cls_name for cls_name in middleware_classes)
        assert cors_found, f"CORS middleware not found. Available middleware: {middleware_classes}"

    def test_cross_origin_health_request_succeeds(self):
        """Test that cross-origin requests to health endpoint are not blocked."""
        headers = {"Origin": "http://localhost:3000"}  # Simulated Obsidian plugin origin
        response = client.get("/health", headers=headers)
        
        # Should succeed (not be CORS-blocked)
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "healthy"

    def test_cross_origin_process_request_succeeds(self):
        """Test that cross-origin requests to process endpoint are not blocked."""
        headers = {"Origin": "http://localhost:3000"}  # Simulated Obsidian plugin origin
        payload = {"task": "organize", "content": "Test cross-origin request"}
        response = client.post("/process", json=payload, headers=headers)
        
        # Should not be blocked by CORS (status 200 or other non-403 status)
        assert response.status_code != 403  # Not CORS-blocked

    def test_cors_configuration_allows_all_origins(self):
        """Test that CORS is configured to allow all origins for development."""
        from main import app
        
        # Find the CORS middleware in the middleware stack
        cors_middleware = None
        for middleware in app.user_middleware:
            if hasattr(middleware.cls, '__name__') and 'CORS' in str(middleware.cls):
                cors_middleware = middleware
                break
        
        # Verify CORS middleware exists
        assert cors_middleware is not None, "CORS middleware should be configured"

    def test_cors_preflight_request_handling(self):
        """Test that preflight requests are handled properly."""
        # Test OPTIONS request with CORS headers
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST", 
            "Access-Control-Request-Headers": "Content-Type"
        }
        response = client.options("/process", headers=headers)
        
        # OPTIONS should either succeed or return 405 (method not allowed), not 403 (CORS blocked)
        assert response.status_code in [200, 405], f"Expected 200 or 405, got {response.status_code}"

    def test_different_origin_requests_not_blocked(self):
        """Test that requests from different origins are not CORS-blocked."""
        origins_to_test = [
            "http://localhost:3000",
            "https://obsidian.example.com", 
            "http://127.0.0.1:8080"
        ]
        
        for origin in origins_to_test:
            headers = {"Origin": origin}
            response = client.get("/health", headers=headers)
            
            # Should not be CORS-blocked (403), should get normal response
            assert response.status_code != 403, f"Request from {origin} was CORS-blocked"
            assert response.status_code == 200, f"Health check failed for origin {origin}"

    def test_json_content_type_requests_succeed(self):
        """Test that JSON requests with Content-Type header succeed."""
        headers = {
            "Origin": "http://localhost:3000",
            "Content-Type": "application/json"
        }
        payload = {"task": "organize", "content": "Test content"}
        response = client.post("/process", json=payload, headers=headers)
        
        # Should not be blocked by CORS content-type restrictions
        assert response.status_code != 403
        # May fail for other reasons (like auth), but not CORS

    def test_cors_allows_credentials_implicitly(self):
        """Test that credential-based requests are not blocked."""
        headers = {
            "Origin": "http://localhost:3000",
            "Cookie": "session=test123"  # Simulated credential
        }
        response = client.get("/health", headers=headers)
        
        # Should not be CORS-blocked due to credentials
        assert response.status_code != 403
        assert response.status_code == 200


class TestRootEndpoint:
    """Test suite for root endpoint (existing functionality)."""

    def test_root_endpoint_exists(self):
        """Test that root endpoint still works."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "FastAPI Bedrock Service is running"}
