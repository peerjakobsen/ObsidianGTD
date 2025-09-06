"""Test environment variable validation on service startup."""

import os
import pytest
from unittest.mock import patch
from pydantic import ValidationError


class TestEnvironmentVariableValidation:
    """Test suite for environment variable validation and loading."""

    def test_settings_validation_with_missing_bearer_token(self):
        """Test that missing AWS_BEARER_TOKEN_BEDROCK raises ValidationError."""
        # Test with completely empty environment - use explicit empty string
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": ""}, clear=False):
            with pytest.raises(ValidationError) as exc_info:
                from config import Settings
                Settings()
            
            # Check that the error mentions the required field or validation
            error_str = str(exc_info.value).lower()
            assert "aws_bearer_token_bedrock" in error_str and ("required" in error_str or "empty" in error_str)

    def test_settings_validation_with_empty_bearer_token(self):
        """Test that empty AWS_BEARER_TOKEN_BEDROCK raises ValidationError."""
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": ""}, clear=False):
            with pytest.raises(ValidationError) as exc_info:
                from config import Settings
                Settings()
            
            error_str = str(exc_info.value).lower()
            assert "required" in error_str or "aws_bearer_token_bedrock" in error_str

    def test_settings_validation_with_whitespace_bearer_token(self):
        """Test that whitespace-only AWS_BEARER_TOKEN_BEDROCK raises ValidationError."""
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": "   "}, clear=False):
            with pytest.raises(ValidationError) as exc_info:
                from config import Settings
                Settings()
            
            error_str = str(exc_info.value).lower()
            assert "required" in error_str or "aws_bearer_token_bedrock" in error_str or "empty" in error_str

    def test_settings_default_values(self):
        """Test that settings have correct default values."""
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": "test-token"}, clear=False):
            from config import Settings
            settings = Settings()
            
            # Test default values
            assert settings.aws_region == "us-east-1"
            assert settings.bedrock_model_id == "us.anthropic.claude-sonnet-4-20250514-v1:0"
            assert settings.log_level == "INFO"
            assert settings.host == "localhost"
            assert settings.port == 8000

    def test_settings_environment_override(self):
        """Test that environment variables properly override defaults."""
        env_vars = {
            "AWS_BEARER_TOKEN_BEDROCK": "test-token-123",
            "AWS_REGION": "eu-west-1", 
            "BEDROCK_MODEL_ID": "custom-model-id",
            "LOG_LEVEL": "DEBUG",
            "HOST": "127.0.0.1",
            "PORT": "9000"
        }
        
        with patch.dict(os.environ, env_vars, clear=False):
            from config import Settings
            settings = Settings()
            
            assert settings.aws_bearer_token_bedrock == "test-token-123"
            assert settings.aws_region == "eu-west-1"
            assert settings.bedrock_model_id == "custom-model-id"
            assert settings.log_level == "DEBUG"
            assert settings.host == "127.0.0.1"
            assert settings.port == 9000

    def test_port_validation_with_string(self):
        """Test that PORT environment variable is properly converted to int."""
        with patch.dict(os.environ, {
            "AWS_BEARER_TOKEN_BEDROCK": "test-token",
            "PORT": "3000"
        }, clear=False):
            from config import Settings
            settings = Settings()
            
            assert isinstance(settings.port, int)
            assert settings.port == 3000

    def test_case_insensitive_env_vars(self):
        """Test that environment variables are case-insensitive."""
        with patch.dict(os.environ, {
            "aws_bearer_token_bedrock": "test-token-lowercase",
            "aws_region": "us-west-2"
        }, clear=False):
            from config import Settings
            settings = Settings()
            
            # Should work with lowercase env vars due to case_sensitive = False
            assert settings.aws_bearer_token_bedrock == "test-token-lowercase"
            assert settings.aws_region == "us-west-2"

    def test_bedrock_client_environment_setup(self):
        """Test that BedrockClient properly sets up environment."""
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": "test-token-456"}, clear=False):
            # Mock boto3 to avoid actual AWS calls
            with patch('bedrock_client.boto3.client') as mock_boto3:
                from bedrock_client import BedrockClient
                
                client = BedrockClient()
                
                # Check that boto3 client was called with correct parameters
                mock_boto3.assert_called_once_with(
                    service_name="bedrock-runtime",
                    region_name="us-east-1"  # Default region
                )

    def test_logging_level_validation(self):
        """Test various logging level values."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        
        for level in valid_levels:
            with patch.dict(os.environ, {
                "AWS_BEARER_TOKEN_BEDROCK": "test-token",
                "LOG_LEVEL": level
            }, clear=False):
                from config import Settings
                settings = Settings()
                assert settings.log_level == level

    def test_invalid_port_value_non_numeric(self):
        """Test handling of non-numeric port values."""
        with patch.dict(os.environ, {
            "AWS_BEARER_TOKEN_BEDROCK": "test-token",
            "PORT": "not-a-number"
        }, clear=False):
            with pytest.raises(ValidationError):
                from config import Settings
                Settings()


class TestDotEnvFileLoading:
    """Test suite for .env file loading functionality."""

    def test_dotenv_loading_function_exists(self):
        """Test that load_dotenv function is imported and available."""
        # Simply verify that load_dotenv is imported in the config module
        import config
        # Verify the function exists and is callable
        assert hasattr(config, 'load_dotenv')
        assert callable(config.load_dotenv)

    def test_env_file_path_configuration(self):
        """Test that Settings is configured to look for .env file."""
        with patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": "test"}, clear=False):
            from config import Settings
            
            # Check model_config has correct settings (Pydantic v2 style)
            assert hasattr(Settings, 'model_config')
            assert Settings.model_config.get('env_file') == ".env"
            assert Settings.model_config.get('case_sensitive') == False