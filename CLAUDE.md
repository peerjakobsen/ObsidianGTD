# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian GTD is a dual-component system implementing Getting Things Done (GTD) methodology in Obsidian:

- **FastAPI Server** (`/server/`): Local privacy-focused backend providing AI-powered GTD clarification via AWS Bedrock
- **Obsidian Plugin** (`/plugin/`): TypeScript plugin integrating GTD workflows directly into Obsidian

## Architecture

The system follows a client-server pattern with localhost-only communication for privacy:

1. **Plugin** captures selected text from Obsidian editor
2. **Server** processes text through AWS Bedrock using GTD-specific prompts
3. **Plugin** receives structured task data compatible with Obsidian Tasks plugin format

Key architectural decisions:
- Local-only deployment (no external data sharing)
- API key authentication (not IAM credentials)
- Agent OS development pattern with structured specifications

## Development Commands

### Server Development (`/server/`)
```bash
# Setup
cp .env.example .env  # Configure AWS Bedrock API key
uv sync

# Development
uv run python main.py                    # Start server on localhost:8000
uv run uvicorn main:app --reload        # Development with auto-reload
uv run pytest                           # Run tests
uv run ruff check .                      # Lint code
uv run mypy .                            # Type check
```

### Plugin Development (`/plugin/`)
```bash
# Setup
npm install

# Development
npm run dev                              # Build in watch mode
npm run build                            # Production build
npm run deploy                           # Copy to Obsidian vault (configured in .env.local)
npm run build:deploy                     # Build and deploy in one command
npm run dev:deploy                       # Build, deploy, then watch

# Testing & Quality
npm run test                             # Run Jest tests
npm run test:watch                       # Watch mode testing
npm run lint                             # ESLint
npm run lint:fix                         # Auto-fix linting issues
```

### Plugin Deployment
The plugin includes automated deployment to your Obsidian vault:
1. Copy `.env.example` to `.env.local`
2. Set `OBSIDIAN_VAULT_PATH` to your vault's `.obsidian/plugins` directory
3. Use `npm run build:deploy` for automatic building and deployment
4. Hot reload supported with Hot Reload Plugin installed in Obsidian

## GTD Terminology

This project uses authentic GTD language throughout:
- **Clarify** (not "convert" or "process") - step 2 in GTD workflow
- **Next Actions** (not "tasks") - specific physical actions that move things forward  
- **Inbox** (not "input") - collection of unprocessed items

## Technology Stack

**Server:**
- FastAPI with Python 3.13+
- AWS Bedrock API integration
- UV package manager for Python dependencies
- Pydantic for data validation and settings
- Structured logging and comprehensive error handling

**Plugin:**
- TypeScript with Obsidian Plugin API
- ESBuild for bundling (not Rollup despite references)
- Jest for testing with Obsidian API mocks
- Custom deployment automation via Node.js scripts
- Settings panel with connection testing to backend

## Key Files

**Server:**
- `main.py`: FastAPI application with CORS and exception handling
- `bedrock_client.py`: AWS Bedrock integration layer
- `models.py`: Pydantic data models for requests/responses
- `config.py`: Environment-based configuration

**Plugin:**  
- `src/main.ts`: Main plugin class with GTD command registration
- `src/settings-tab.ts`: Settings UI with backend connection testing
- `deploy.mjs`: Automated deployment to Obsidian vault
- `esbuild.config.mjs`: Build configuration with watch mode

## Testing Strategy

**Server:** Standard FastAPI testing with pytest and async support
**Plugin:** Jest with jsdom environment and Obsidian API mocks in `tests/__mocks__/obsidian.ts`

The project follows Agent OS patterns with specifications in `.agent-os/specs/` and structured task tracking.