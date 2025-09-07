# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian GTD is a direct-integration system implementing Getting Things Done (GTD) methodology in Obsidian:

- Direct AWS integration via AWS JavaScript SDK (no backend server required)
- **Obsidian Plugin** (`/plugin/`): TypeScript plugin integrating GTD workflows directly into Obsidian

## Architecture

The plugin communicates directly with AWS Bedrock using the AWS JavaScript SDK:

1. **Plugin** captures selected text from Obsidian editor
2. **Plugin** calls AWS Bedrock via SDK with GTD-specific prompts and inserts Tasks-formatted results

Key architectural decisions:
- No local server; fewer moving parts and simpler setup
- Bearer token authentication (not IAM credentials)
- Agent OS development pattern with structured specifications

## Development Commands

### Backend
No separate backend server. The plugin talks directly to AWS Bedrock using the AWS JavaScript SDK.

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

**Backend:**
- No separate server; direct AWS Bedrock via AWS JavaScript SDK

**Plugin:**
- TypeScript with Obsidian Plugin API
- ESBuild for bundling (not Rollup despite references)
- Jest for testing with Obsidian API mocks
- Custom deployment automation via Node.js scripts
- Settings panel with connection testing to backend

## Key Files

**Plugin:**  
- `src/main.ts`: Main plugin class with GTD command registration
- `src/settings-tab.ts`: Settings UI with AWS connection testing
- `deploy.mjs`: Automated deployment to Obsidian vault
- `esbuild.config.mjs`: Build configuration with watch mode

## Testing Strategy

**Backend:** No server backend; tests focus on Jest for plugin and Bedrock client mocks
**Plugin:** Jest with jsdom environment and Obsidian API mocks in `tests/__mocks__/obsidian.ts`

The project follows Agent OS patterns with specifications in `.agent-os/specs/` and structured task tracking.
