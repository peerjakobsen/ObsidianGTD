# FastAPI Bedrock Service

AI-powered task processing service for Obsidian GTD plugin via AWS Bedrock API keys.

## Features

- **Privacy-focused**: Runs locally on localhost
- **AWS Bedrock Integration**: Uses API keys for authentication
- **FastAPI Framework**: Modern, fast web framework
- **CORS Support**: Compatible with Obsidian plugin requests
- **Structured Logging**: Comprehensive logging system

## Setup

1. **Install Dependencies**:
   ```bash
   uv sync
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and set your Bedrock API key:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your values:
   ```
   AWS_BEARER_TOKEN_BEDROCK=your_bedrock_api_key_here
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v1:0
   ```

3. **Run the Service**:
   ```bash
   uv run python main.py
   ```

## API Endpoints

- `GET /` - Root endpoint with service status
- `GET /health` - Health check (to be implemented)
- `POST /process` - AI processing endpoint (to be implemented)

## Configuration

The service uses environment variables for configuration:

- `AWS_BEARER_TOKEN_BEDROCK`: Your Bedrock API key
- `AWS_REGION`: AWS region (default: us-east-1)
- `BEDROCK_MODEL_ID`: Model ID to use (default: us.anthropic.claude-3-5-sonnet-20241022-v1:0)
- `LOG_LEVEL`: Logging level (default: INFO)
- `HOST`: Server host (default: localhost)
- `PORT`: Server port (default: 8000)

## Development

This project uses UV for dependency management and follows Agent OS development patterns.

## Authentication

This service uses AWS Bedrock API keys instead of traditional IAM credentials. The API key is automatically used by boto3 when set as the `AWS_BEARER_TOKEN_BEDROCK` environment variable.