# Technical Stack

## Core Architecture

- **Application Framework:** Obsidian Plugin API + TypeScript
- **Backend Service:** None (direct AWS Bedrock via AWS JavaScript SDK)
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

- No separate backend server. The plugin calls AWS Bedrock directly using the AWS JavaScript SDK.

## AI Integration

- **AI Provider:** AWS Bedrock
- **Model:** Claude (Anthropic)
- **Authentication:** AWS credentials
- **SDK:** AWS JavaScript SDK (`@aws-sdk/client-bedrock-runtime`)
- **Region:** User configurable (default: us-east-1)

## Development & Testing

- **Testing Framework:** Jest (plugin); no backend tests
- **Code Quality:** ESLint, Prettier (frontend), ruff (backend)
- **Type Checking:** TypeScript compiler, mypy
- **Git Hooks:** pre-commit

## Deployment & Distribution

- **Plugin Distribution:** Obsidian Community Plugins
- **Backend Deployment:** Not applicable
- **Configuration:** Plugin settings panel
- **Updates:** Obsidian's automatic update system

## Security & Privacy

- **API Communication:** Direct to AWS Bedrock over HTTPS
- **Credentials Storage:** Obsidian's secure settings
- **Data Processing:** Local only (no cloud storage)
- **AWS Access:** User-provided credentials
