# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-06-obsidian-plugin-scaffold/spec.md

> Created: 2025-09-06
> Version: 1.0.0

## Endpoints

### POST /process

**Purpose:** Send constructed GTD prompt to AI via Bedrock proxy for task generation

**Parameters:** 
- Request body (JSON):
  ```json
  {
    "prompt": "string - Complete GTD prompt constructed by plugin"
  }
  ```

**Response:**
- Success (200):
  ```json
  {
    "response": "string - Raw AI response containing task suggestions"
  }
  ```
- Error (500):
  ```json
  {
    "error": "string - Error message"
  }
  ```

**Errors:** Network timeout, Bedrock API failures, malformed requests

## Controllers

### Plugin Responsibilities

- Construct complete GTD prompts including context about task types (#waiting, #someday)
- Parse raw AI responses into structured Tasks plugin markdown format
- Handle response formatting and error states
- Manage retry logic for failed requests

### Backend Responsibilities

- Route prompt to AWS Bedrock Claude API
- Return raw AI response without processing
- Handle Bedrock authentication and API communication
- Provide error details for troubleshooting

### Request Flow

1. Plugin constructs GTD-specific prompt from selected text
2. Plugin sends HTTP POST to /process with prompt payload
3. FastAPI forwards prompt to Bedrock Claude API
4. FastAPI returns raw AI response to plugin
5. Plugin parses response and formats as Tasks plugin markdown
6. Plugin replaces selected text with formatted task(s)