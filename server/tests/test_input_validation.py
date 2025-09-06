"""Comprehensive input validation tests with edge cases and error scenarios."""

from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import pytest
from main import app

client = TestClient(app)


class TestProcessRequestValidation:
    """Test suite for /process endpoint input validation with edge cases."""

    def test_missing_task_field(self):
        """Test validation error when task field is missing."""
        payload = {"content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "error" in json_data
        assert "validation_error" in json_data["error"]["type"]
        assert "task" in json_data["error"]["details"].lower()

    def test_missing_content_field(self):
        """Test validation error when content field is missing."""
        payload = {"task": "organize"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "error" in json_data
        assert "validation_error" in json_data["error"]["type"]
        assert "content" in json_data["error"]["details"].lower()

    def test_both_fields_missing(self):
        """Test validation error when both required fields are missing."""
        payload = {}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "error" in json_data
        assert "validation_error" in json_data["error"]["type"]

    def test_empty_task_string(self):
        """Test validation error for empty task string."""
        payload = {"task": "", "content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_empty_content_string(self):
        """Test validation error for empty content string."""
        payload = {"task": "organize", "content": ""}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_whitespace_only_task(self):
        """Test validation error for task with only whitespace."""
        payload = {"task": "   ", "content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]
        assert "whitespace" in json_data["error"]["details"].lower()

    def test_whitespace_only_content(self):
        """Test validation error for content with only whitespace."""
        payload = {"task": "organize", "content": "   \n\t  "}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]
        assert "whitespace" in json_data["error"]["details"].lower()

    def test_task_too_long(self):
        """Test validation error for task exceeding max length (100 chars)."""
        long_task = "x" * 101  # 101 characters, over the limit
        payload = {"task": long_task, "content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]
        assert "100" in json_data["error"]["details"] or "length" in json_data["error"]["details"].lower()

    def test_content_too_long(self):
        """Test validation error for content exceeding max length (10000 chars)."""
        long_content = "x" * 10001  # 10001 characters, over the limit
        payload = {"task": "organize", "content": long_content}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]
        assert "10000" in json_data["error"]["details"] or "length" in json_data["error"]["details"].lower()

    def test_task_exactly_max_length(self):
        """Test that task at exactly max length (100 chars) is accepted."""
        max_length_task = "x" * 100  # Exactly 100 characters
        payload = {"task": max_length_task, "content": "Some content"}
        response = client.post("/process", json=payload)
        
        # Should not fail validation (might fail for other reasons like missing auth)
        assert response.status_code != 422

    def test_content_exactly_max_length(self):
        """Test that content at exactly max length (10000 chars) is accepted."""
        max_length_content = "x" * 10000  # Exactly 10000 characters
        payload = {"task": "organize", "content": max_length_content}
        response = client.post("/process", json=payload)
        
        # Should not fail validation (might fail for other reasons like missing auth)
        assert response.status_code != 422

    def test_null_task_value(self):
        """Test validation error for null task value."""
        payload = {"task": None, "content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_null_content_value(self):
        """Test validation error for null content value."""
        payload = {"task": "organize", "content": None}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_wrong_task_type_integer(self):
        """Test validation error for wrong task field type (integer)."""
        payload = {"task": 123, "content": "Some content"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_wrong_content_type_array(self):
        """Test validation error for wrong content field type (array)."""
        payload = {"task": "organize", "content": ["item1", "item2"]}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        assert "validation_error" in json_data["error"]["type"]

    def test_extra_fields_ignored(self):
        """Test that extra fields in request are ignored."""
        payload = {
            "task": "organize",
            "content": "Some content", 
            "extra_field": "should be ignored",
            "another_extra": 123
        }
        response = client.post("/process", json=payload)
        
        # Should not fail validation due to extra fields
        assert response.status_code != 422

    def test_special_characters_in_task(self):
        """Test that special characters in task are handled properly."""
        special_task = "organize & summarize @#$%^&*()"
        payload = {"task": special_task, "content": "Some content"}
        response = client.post("/process", json=payload)
        
        # Should not fail validation due to special characters
        assert response.status_code != 422

    def test_unicode_characters_in_content(self):
        """Test that unicode characters in content are handled properly."""
        unicode_content = "Content with émojis 🚀 and spéciäl cháracters 中文"
        payload = {"task": "organize", "content": unicode_content}
        response = client.post("/process", json=payload)
        
        # Should not fail validation due to unicode
        assert response.status_code != 422

    def test_newlines_and_tabs_in_content(self):
        """Test that newlines and tabs in content are preserved and valid."""
        multiline_content = "Line 1\nLine 2\n\tTabbed line\r\nWindows line ending"
        payload = {"task": "organize", "content": multiline_content}
        response = client.post("/process", json=payload)
        
        # Should not fail validation due to whitespace characters
        assert response.status_code != 422

    def test_leading_trailing_whitespace_trimming(self):
        """Test that leading/trailing whitespace is trimmed from valid input."""
        payload = {"task": "  organize  ", "content": "  Some content  "}
        # This should work since our validator trims whitespace
        response = client.post("/process", json=payload)
        
        # Should not fail validation after trimming
        assert response.status_code != 422


class TestInvalidJSONHandling:
    """Test suite for invalid JSON and content type handling."""

    def test_invalid_json_syntax(self):
        """Test handling of malformed JSON."""
        invalid_json = '{"task": "organize", "content": "test"'  # Missing closing brace
        response = client.post(
            "/process",
            data=invalid_json,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
        json_data = response.json()
        assert "error" in json_data

    def test_non_json_content_type(self):
        """Test rejection of non-JSON content type."""
        response = client.post(
            "/process",
            data="task=organize&content=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # FastAPI should reject non-JSON for JSON endpoints
        assert response.status_code in [422, 415]  # Unprocessable Entity or Unsupported Media Type

    def test_missing_content_type_header(self):
        """Test handling of requests without Content-Type header."""
        response = client.post("/process", data='{"task": "organize", "content": "test"}')
        
        # Behavior may vary, but shouldn't crash
        assert response.status_code in [200, 400, 415, 422]

    def test_empty_request_body(self):
        """Test handling of completely empty request body."""
        response = client.post(
            "/process",
            data="",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
        json_data = response.json()
        assert "error" in json_data


class TestErrorResponseFormat:
    """Test suite for error response format consistency."""

    def test_validation_error_format(self):
        """Test that validation errors follow the expected format."""
        payload = {"task": "", "content": "test"}
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        
        # Verify error response structure
        assert "error" in json_data
        assert "type" in json_data["error"]
        assert "message" in json_data["error"]
        assert "details" in json_data["error"]
        assert json_data["error"]["type"] == "validation_error"

    def test_multiple_validation_errors_combined(self):
        """Test that multiple validation errors are combined in details."""
        payload = {"task": "", "content": ""}  # Both fields invalid
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        
        # Should contain information about both failed validations
        details = json_data["error"]["details"].lower()
        assert "task" in details
        assert "content" in details

    def test_field_specific_error_messages(self):
        """Test that field-specific errors mention the correct field."""
        payload = {"task": "x" * 101, "content": "valid content"}  # Task too long
        response = client.post("/process", json=payload)
        
        assert response.status_code == 422
        json_data = response.json()
        
        # Error should specifically mention the task field
        details = json_data["error"]["details"].lower()
        assert "task" in details
        assert "content" not in details or details.count("task") > details.count("content")