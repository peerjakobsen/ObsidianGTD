# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-06-fastapi-bedrock-service/spec.md

> Created: 2025-09-06
> Version: 1.0.0

## Endpoints

### 1. Health Check Endpoint

**Endpoint:** `GET /health`

**Purpose:** Service health verification and status monitoring

**Parameters:** None

**Request Headers:**
- `Content-Type: application/json` (optional)

**Response Format:**

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "fastapi-bedrock-service",
  "version": "1.0.0",
  "timestamp": "2025-09-06T12:00:00Z",
  "dependencies": {
    "aws_bedrock": "available",
    "database": "connected"
  }
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "service": "fastapi-bedrock-service",
  "version": "1.0.0",
  "timestamp": "2025-09-06T12:00:00Z",
  "dependencies": {
    "aws_bedrock": "unavailable",
    "database": "disconnected"
  },
  "error": "AWS Bedrock service unavailable"
}
```

**Status Codes:**
- `200 OK` - Service is healthy and all dependencies are available
- `503 Service Unavailable` - Service is unhealthy or dependencies are unavailable

### 2. AI Processing Endpoint

**Endpoint:** `POST /process`

**Purpose:** Send prompts to AWS Bedrock for AI processing and return structured responses

**Request Headers:**
- `Content-Type: application/json` (required)
- `Authorization: Bearer <token>` (if authentication is implemented)

**Request Parameters:**

**Request Body:**
```json
{
  "prompt": "string (required, 1-10000 characters)",
  "model": "string (optional, defaults to 'anthropic.claude-3-sonnet-20240229-v1:0')",
  "max_tokens": "integer (optional, defaults to 1000, range: 1-4096)",
  "temperature": "float (optional, defaults to 0.7, range: 0.0-1.0)"
}
```

**Response Format:**

**Success Response (200 OK):**
```json
{
  "success": true,
  "response": {
    "content": "AI generated response text",
    "model": "anthropic.claude-3-sonnet-20240229-v1:0",
    "tokens_used": 150,
    "processing_time_ms": 2500
  },
  "metadata": {
    "request_id": "uuid-string",
    "timestamp": "2025-09-06T12:00:00Z"
  }
}
```

**Error Responses:**

**Validation Error (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "prompt",
        "message": "Prompt is required and cannot be empty"
      }
    ]
  },
  "metadata": {
    "request_id": "uuid-string",
    "timestamp": "2025-09-06T12:00:00Z"
  }
}
```

**AWS Bedrock Error (502 Bad Gateway):**
```json
{
  "success": false,
  "error": {
    "type": "aws_bedrock_error",
    "message": "AWS Bedrock service error",
    "details": {
      "aws_error_code": "ThrottlingException",
      "aws_error_message": "Rate exceeded"
    }
  },
  "metadata": {
    "request_id": "uuid-string",
    "timestamp": "2025-09-06T12:00:00Z"
  }
}
```

**Timeout Error (504 Gateway Timeout):**
```json
{
  "success": false,
  "error": {
    "type": "timeout_error",
    "message": "Request timed out after 30 seconds",
    "details": {
      "timeout_seconds": 30
    }
  },
  "metadata": {
    "request_id": "uuid-string",
    "timestamp": "2025-09-06T12:00:00Z"
  }
}
```

**Internal Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": {
    "type": "internal_error",
    "message": "An unexpected error occurred",
    "details": "Error processing request"
  },
  "metadata": {
    "request_id": "uuid-string",
    "timestamp": "2025-09-06T12:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Request processed successfully
- `422 Unprocessable Entity` - Request validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - AWS Bedrock service error
- `504 Gateway Timeout` - Request timeout

## Controllers

### Health Controller

**File:** `app/controllers/health_controller.py`

**Responsibilities:**
- Service health monitoring
- Dependency status checking
- System status reporting

**Methods:**
- `get_health_status()` - Returns current service health status
- `check_aws_bedrock_connection()` - Verifies AWS Bedrock availability
- `check_database_connection()` - Verifies database connectivity

### AI Processing Controller

**File:** `app/controllers/ai_controller.py`

**Responsibilities:**
- Request validation and sanitization
- AWS Bedrock integration
- Response formatting and error handling
- Rate limiting and timeout management

**Methods:**
- `process_ai_request(request_data)` - Main processing endpoint handler
- `validate_request(request_data)` - Request parameter validation
- `call_bedrock_service(prompt, model, options)` - AWS Bedrock API call
- `format_response(bedrock_response)` - Response formatting
- `handle_error(error, request_id)` - Error handling and logging

### Request Validation Rules

**Prompt Field:**
- Required: Yes
- Type: String
- Min Length: 1 character
- Max Length: 10,000 characters
- Validation: Non-empty, printable characters only

**Model Field:**
- Required: No
- Type: String
- Default: "anthropic.claude-3-sonnet-20240229-v1:0"
- Allowed Values: AWS Bedrock supported models list
- Validation: Must be in supported models list

**Max Tokens Field:**
- Required: No
- Type: Integer
- Default: 1000
- Range: 1-4096
- Validation: Positive integer within range

**Temperature Field:**
- Required: No
- Type: Float
- Default: 0.0
- Range: 0.0-1.0
- Validation: Float value within range

### Error Handling Strategy

**AWS Bedrock Errors:**
- Map AWS error codes to appropriate HTTP status codes
- Log detailed error information for debugging
- Return user-friendly error messages
- Implement retry logic for transient errors

**Validation Errors:**
- Return detailed field-level validation errors
- Include helpful error messages for API consumers
- Log validation attempts for monitoring

**Timeout Handling:**
- Set 30-second timeout for Bedrock requests
- Return timeout error with clear messaging
- Log timeout occurrences for performance monitoring

**Rate Limiting:**
- Implement per-client rate limiting
- Return 429 status code when limits exceeded
- Include retry-after headers in rate limit responses