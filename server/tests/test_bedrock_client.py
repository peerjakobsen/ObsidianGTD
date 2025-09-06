import pytest
import os
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError, BotoCoreError
from bedrock_client import BedrockClient


class TestBedrockClient:
    """Test suite for BedrockClient class with mocked AWS responses."""

    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    def test_bedrock_client_initialization(self, mock_boto_client):
        """Test BedrockClient initializes correctly with proper configuration."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        client = BedrockClient()
        
        mock_boto_client.assert_called_once_with(
            service_name="bedrock-runtime", 
            region_name="us-east-1"
        )
        assert client.client == mock_client_instance
        assert client.model_id == "us.anthropic.claude-sonnet-4-20250514-v1:0"
        # Environment variable is set by config, check that client was initialized
        assert client.client == mock_client_instance

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_successful_bedrock_request(self, mock_boto_client):
        """Test successful Bedrock API request with proper response format."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        mock_response = {
            "output": {
                "message": {
                    "content": [{"text": "This is a test AI response"}]
                }
            }
        }
        mock_client_instance.converse.return_value = mock_response
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        expected_messages = [{"role": "user", "content": [{"text": "Test prompt"}]}]
        mock_client_instance.converse.assert_called_once_with(
            modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
            messages=expected_messages
        )
        
        assert result["success"] is True
        assert result["response"] == "This is a test AI response"
        assert result["model"] == "us.anthropic.claude-sonnet-4-20250514-v1:0"

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_authentication_error(self, mock_boto_client):
        """Test handling of AWS authentication errors."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        auth_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'UnauthorizedOperation',
                    'Message': 'Unable to locate credentials'
                }
            },
            operation_name='converse'
        )
        mock_client_instance.converse.side_effect = auth_error
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "UnauthorizedOperation" in result["error"]
        assert result["model"] == "us.anthropic.claude-sonnet-4-20250514-v1:0"

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_throttling_error(self, mock_boto_client):
        """Test handling of AWS rate limiting/throttling errors."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        throttle_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ThrottlingException',
                    'Message': 'Rate exceeded'
                }
            },
            operation_name='converse'
        )
        mock_client_instance.converse.side_effect = throttle_error
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "ThrottlingException" in result["error"]
        assert result["model"] == "us.anthropic.claude-sonnet-4-20250514-v1:0"

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_model_not_found_error(self, mock_boto_client):
        """Test handling of invalid model ID errors."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        model_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ResourceNotFoundException',
                    'Message': 'Model not found'
                }
            },
            operation_name='converse'
        )
        mock_client_instance.converse.side_effect = model_error
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "ResourceNotFoundException" in result["error"]
        assert result["model"] == "us.anthropic.claude-sonnet-4-20250514-v1:0"

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_service_unavailable_error(self, mock_boto_client):
        """Test handling of service unavailable errors."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        service_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ServiceUnavailableException',
                    'Message': 'Service temporarily unavailable'
                }
            },
            operation_name='converse'
        )
        mock_client_instance.converse.side_effect = service_error
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "ServiceUnavailableException" in result["error"]

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_generic_boto_error(self, mock_boto_client):
        """Test handling of generic boto3 errors."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        generic_error = BotoCoreError()
        mock_client_instance.converse.side_effect = generic_error
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "An unspecified error occurred" in result["error"]

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_malformed_response_error(self, mock_boto_client):
        """Test handling of malformed response from Bedrock API."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        # Mock malformed response missing expected structure
        malformed_response = {
            "output": {
                "message": {}  # Missing content field
            }
        }
        mock_client_instance.converse.return_value = malformed_response
        
        client = BedrockClient()
        result = await client.process_request("Test prompt")
        
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_empty_prompt_handling(self, mock_boto_client):
        """Test handling of empty or None prompt."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        mock_response = {
            "output": {
                "message": {
                    "content": [{"text": "I received an empty prompt"}]
                }
            }
        }
        mock_client_instance.converse.return_value = mock_response
        
        client = BedrockClient()
        
        # Test empty string
        result = await client.process_request("")
        expected_messages = [{"role": "user", "content": [{"text": ""}]}]
        mock_client_instance.converse.assert_called_with(
            modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
            messages=expected_messages
        )
        assert result["success"] is True

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_large_prompt_handling(self, mock_boto_client):
        """Test handling of large prompts."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        mock_response = {
            "output": {
                "message": {
                    "content": [{"text": "Processed large prompt successfully"}]
                }
            }
        }
        mock_client_instance.converse.return_value = mock_response
        
        client = BedrockClient()
        large_prompt = "This is a test prompt. " * 1000  # Large prompt
        
        result = await client.process_request(large_prompt)
        
        assert result["success"] is True
        assert result["response"] == "Processed large prompt successfully"

    @pytest.mark.asyncio
    @patch('bedrock_client.boto3.client')
    @patch.dict(os.environ, {'AWS_BEARER_TOKEN_BEDROCK': 'test-token'})
    async def test_bedrock_unicode_content_handling(self, mock_boto_client):
        """Test handling of Unicode characters in prompts."""
        mock_client_instance = Mock()
        mock_boto_client.return_value = mock_client_instance
        
        mock_response = {
            "output": {
                "message": {
                    "content": [{"text": "Unicode content processed: 你好🌟"}]
                }
            }
        }
        mock_client_instance.converse.return_value = mock_response
        
        client = BedrockClient()
        unicode_prompt = "Process this: 你好世界 🌟 emojis and unicode"
        
        result = await client.process_request(unicode_prompt)
        
        assert result["success"] is True
        assert "Unicode content processed" in result["response"]
        expected_messages = [{"role": "user", "content": [{"text": unicode_prompt}]}]
        mock_client_instance.converse.assert_called_with(
            modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
            messages=expected_messages
        )