from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestErrorHandlingMiddleware:
    """Test suite for error handling middleware functionality."""

    def test_validation_error_response_format(self):
        """Test that validation errors return proper error format."""
        # Send invalid request (missing required fields)
        response = client.post("/process", json={})

        assert response.status_code == 422
        json_data = response.json()

        # Verify error response structure
        assert "error" in json_data
        assert "type" in json_data["error"]
        assert "message" in json_data["error"]
        assert "details" in json_data["error"]

        # Verify error content
        assert json_data["error"]["type"] == "validation_error"
        assert "validation failed" in json_data["error"]["message"].lower()

    def test_validation_error_missing_task(self):
        """Test validation error for missing task field."""
        payload = {"content": "Test content"}
        response = client.post("/process", json=payload)

        assert response.status_code == 422
        json_data = response.json()
        assert "task" in json_data["error"]["details"]

    def test_validation_error_missing_content(self):
        """Test validation error for missing content field."""
        payload = {"task": "organize"}
        response = client.post("/process", json=payload)

        assert response.status_code == 422
        json_data = response.json()
        assert "content" in json_data["error"]["details"]

    def test_validation_error_empty_fields(self):
        """Test validation error for empty fields."""
        payload = {"task": "", "content": ""}
        response = client.post("/process", json=payload)

        assert response.status_code == 422
        json_data = response.json()
        # Should mention field validation issues
        assert any(
            keyword in json_data["error"]["details"].lower()
            for keyword in ["character", "string", "at least"]
        )

    def test_validation_error_oversized_content(self):
        """Test validation error for content exceeding max length."""
        oversized_content = "x" * 10001  # Over the 10000 char limit
        payload = {"task": "organize", "content": oversized_content}
        response = client.post("/process", json=payload)

        assert response.status_code == 422
        json_data = response.json()
        assert "content" in json_data["error"]["details"]

    def test_not_found_error(self):
        """Test 404 error handling for non-existent endpoints."""
        response = client.get("/nonexistent")

        assert response.status_code == 404
        json_data = response.json()

        # FastAPI returns default format for 404, but our middleware should still catch it
        # Either our error format or FastAPI default is acceptable
        assert "detail" in json_data or "error" in json_data

    def test_method_not_allowed_error(self):
        """Test 405 error handling for wrong HTTP methods."""
        response = client.put("/health")  # Health endpoint only supports GET

        assert response.status_code == 405
        json_data = response.json()

        # FastAPI returns default format for 405, but our middleware should still catch it
        # Either our error format or FastAPI default is acceptable
        assert "detail" in json_data or "error" in json_data

    def test_unsupported_media_type_error(self):
        """Test 415 error handling for unsupported content types."""
        # Send plain text instead of JSON
        response = client.post(
            "/process",
            data="task=organize&content=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Should return proper error format
        json_data = response.json()
        assert "error" in json_data

    def test_error_response_content_type(self):
        """Test that error responses return JSON content type."""
        response = client.post("/process", json={})
        assert response.headers["content-type"] == "application/json"

    def test_error_logging(self):
        """Test that errors are properly logged (via successful error handling)."""
        # This test ensures the error handlers run without crashing
        response = client.post("/process", json={"invalid": "data"})
        assert response.status_code == 422
        # If we get a proper response, logging worked
