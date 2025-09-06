# Technical Stack

## Core Architecture

- **Application Framework:** Obsidian Plugin API + TypeScript
- **Backend Service:** FastAPI (Python)
- **AI Service:** AWS Bedrock (Claude)
- **Package Manager:** npm or UV
- **Build Tool:** Rollup (Obsidian standard)
- **Language:** TypeScript + Python

## Frontend (Obsidian Plugin)

- **Plugin Framework:** Obsidian Plugin API
- **Language:** TypeScript
- **UI Framework:** Obsidian's built-in components
- **State Management:** Plugin settings API
- **Build System:** Rollup with TypeScript
- **Package Manager:** npm

## Backend Service

- **Web Framework:** FastAPI
- **Language:** Python 3.13
- **HTTP Client:** httpx (for AWS Bedrock)
- **Validation:** Pydantic
- **Configuration:** environment variables
- **Logging:** Python logging module

## AI Integration

- **AI Provider:** AWS Bedrock
- **Model:** Claude (Anthropic)
- **Authentication:** AWS credentials
- **SDK:** boto3
- **Region:** User configurable (default: us-east-1)

## Development & Testing

- **Testing Framework:** Jest (frontend), pytest (backend)
- **Code Quality:** ESLint, Prettier (frontend), ruff (backend)
- **Type Checking:** TypeScript compiler, mypy
- **Git Hooks:** pre-commit

## Deployment & Distribution

- **Plugin Distribution:** Obsidian Community Plugins
- **Backend Deployment:** Local development server
- **Configuration:** Plugin settings panel
- **Updates:** Obsidian's automatic update system

## Security & Privacy

- **API Communication:** HTTP over localhost only
- **Credentials Storage:** Obsidian's secure settings
- **Data Processing:** Local only (no cloud storage)
- **AWS Access:** User-provided credentials