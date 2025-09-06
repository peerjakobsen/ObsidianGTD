# FastAPI Bedrock Service

AI-powered task processing service for Obsidian GTD plugin via AWS Bedrock API keys.

## Features

- **Privacy-focused**: Runs locally on localhost
- **AWS Bedrock Integration**: Uses AWS credentials for authentication  
- **FastAPI Framework**: Modern, fast web framework with async support
- **CORS Support**: Compatible with Obsidian plugin requests
- **Structured Logging**: Comprehensive logging system
- **Input Validation**: Pydantic models with comprehensive validation
- **Error Handling**: Structured error responses with proper HTTP status codes

## Quick Start

1. **Install Dependencies**:
   ```bash
   uv sync
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and set your AWS Bedrock token:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your AWS Bedrock bearer token:
   ```
   AWS_BEARER_TOKEN_BEDROCK=your_bedrock_bearer_token_here
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
   ```

3. **Start the Service**:
   ```bash
   uv run python main.py
   ```
   
   The service will be available at `http://localhost:8000`

## Manual Testing Guide

### 1. Basic Service Health Check

Test that the service is running:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "fastapi-bedrock-service", 
  "version": "1.0.0",
  "timestamp": "2025-09-06T10:30:00Z"
}
```

### 2. Test Process Endpoint

Test the AI processing functionality:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{
    "task": "organize",
    "content": "Buy groceries, call dentist, finish project report"
  }'
```

Expected response:
```json
{
  "result": "AI-processed content here",
  "status": "success",
  "metadata": {
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "tokens_used": 25,
    "processing_time_ms": 1500
  }
}
```

### 3. Test Input Validation

Test various validation scenarios:

**Missing fields:**
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"task": "organize"}'
```

**Empty content:**
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"task": "organize", "content": ""}'
```

**Content too long (>10,000 chars):**
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d "{\"task\": \"organize\", \"content\": \"$(python -c 'print("x" * 10001)')\"}"
```

### 4. Test CORS Headers

Test cross-origin requests:
```bash
curl -X OPTIONS http://localhost:8000/health \
  -H "Origin: http://localhost:3000"
```

Should include CORS headers like:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 5. Alternative Startup Methods

**Using uvicorn directly:**
```bash
uv run uvicorn main:app --host localhost --port 8000 --reload
```

**With custom host/port:**
```bash
export HOST=127.0.0.1
export PORT=8080
uv run python main.py
```

### 6. Environment Variable Validation

Test startup with missing credentials:
```bash
# Remove AWS credentials from .env temporarily
uv run python main.py
```

Should show proper error messages for missing configuration.

## API Endpoints

- `GET /` - Root endpoint with service status message
- `GET /health` - Health check with service metadata  
- `POST /process` - AI processing endpoint for task content

## Configuration

The service uses environment variables for configuration:

- `AWS_BEARER_TOKEN_BEDROCK`: Your AWS Bedrock bearer token (required)
- `AWS_REGION`: AWS region (default: us-east-1)
- `BEDROCK_MODEL_ID`: Model ID to use (default: us.anthropic.claude-sonnet-4-20250514-v1:0)
- `LOG_LEVEL`: Logging level (default: INFO)
- `HOST`: Server host (default: localhost)
- `PORT`: Server port (default: 8000)

## Development

### Running Tests

Run the comprehensive test suite:
```bash
uv run python -m pytest tests/ -v
```

Run specific test categories:
```bash
# CORS tests
uv run python -m pytest tests/test_main.py::TestCORSConfiguration -v

# Input validation tests
uv run python -m pytest tests/test_input_validation.py -v

# Bedrock integration tests
uv run python -m pytest tests/test_bedrock_client.py -v
```

### Code Quality

Check code formatting and type hints:
```bash
uv run ruff check .
uv run mypy .
```

### Project Structure

```
server/
├── main.py                 # FastAPI application
├── models.py              # Pydantic models
├── bedrock_client.py      # AWS Bedrock client
├── config.py              # Configuration management
├── tests/                 # Test suite
│   ├── test_main.py          # API endpoint tests
│   ├── test_bedrock_client.py # Bedrock integration tests
│   ├── test_input_validation.py # Input validation tests
│   └── test_models.py        # Pydantic model tests
├── .env.example           # Environment template
├── pyproject.toml         # Dependencies and configuration
└── README.md              # This file
```

This project uses UV for dependency management and follows Agent OS development patterns.

## Authentication

This service uses AWS Bedrock bearer tokens for authentication. The bearer token is automatically used by boto3 when set as the `AWS_BEARER_TOKEN_BEDROCK` environment variable.

## Troubleshooting

### Common Issues

1. **Service won't start**: Check that all environment variables are set in `.env`
2. **AWS authentication errors**: Verify your AWS credentials have Bedrock permissions
3. **Port already in use**: Change the PORT environment variable or kill the process using port 8000
4. **CORS errors**: Verify CORS middleware is properly configured for your origin

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
uv run python main.py
```