# Technical Stack

## Core Architecture

- Application: Obsidian plugin (TypeScript)
- AI: AWS Bedrock (Claude) via AWS JavaScript SDK
- Backend: None (direct SDK + HTTPS fallback)
- Build: Rollup + TypeScript
- Package manager: npm

## Core Modules (Plugin)

- `plugin/src/bedrock-client.ts`: Bedrock client wrapper
  - `BedrockClient`: retry + HTTP/SDK fallback
  - `generateText()` and planned `converse()` APIs
- `plugin/src/clarification-service.ts`: Service layer orchestrating prompts, calls, parsing, and insertion
- `plugin/src/review-service.ts`: Service layer orchestrating prompts, calls, parsing, and insertion for weekly GTD reviews
- `plugin/src/gtd-prompts.ts`: Prompt generator for GTD tasks; future prompts for weekly review

## UI Layer

- Commands: “Clarify selected text (GTD)” one-shot flow
- Planned: Sidebar chat (conversational mode) using the same services

## AI Integration

- Provider: AWS Bedrock
- Models: Anthropic Claude family (configurable)
- Auth: Bearer token (Bedrock API key) stored in plugin settings
- SDK: `@aws-sdk/client-bedrock-runtime`
- Region: User configurable (default `us-east-1`)

## Development & Testing

- Tests: Jest (unit + integration with SDK mocks)
- Lint/Format: ESLint, Prettier
- Types: TypeScript compiler
- CI hooks: pre-commit/CI friendly

## Deployment & Distribution

- Distribution: Obsidian Community Plugins
- Configuration: Plugin settings panel
- Updates: Obsidian’s update mechanism

## Security & Privacy

- Transport: HTTPS directly to AWS Bedrock
- Secrets: Bearer token stored in Obsidian settings; not committed
- Data: No external storage; processing occurs within the user’s environment
