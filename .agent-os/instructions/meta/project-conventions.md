# Project Conventions — Obsidian GTD Assistant

This repository is a TypeScript-only Obsidian plugin that calls AWS Bedrock directly. Use these conventions when planning, speccing, or implementing features.

## Architecture

- No server/proxy: Call AWS Bedrock directly from the plugin over HTTPS.
- Core modules:
  - `plugin/src/bedrock-client.ts`: Transport wrapper. Exposes `generateText()` and (planned) `converse()`.
  - `plugin/src/clarification-service.ts`: Domain/service logic for inbox clarification.
  - `plugin/src/gtd-prompts.ts`: Prompt templates and helpers for GTD workflows.
- UI: Obsidian commands today (one-shot clarify). Conversational sidebar is planned in the roadmap.

## Bedrock Client Usage

- Prefer `BedrockClient.generateText(prompt, options?)` for single-shot prompts.
- `clarifyText()` exists only as a backwards-compatible alias; avoid using it in new code.
- Plan for `BedrockClient.converse({ system, messages, inferenceConfig })` for multi-turn flows.
- Keep this layer generic. Do not add GTD-specific naming or logic in the client.

## Services & Prompts

- Put domain logic in a service file (e.g., `clarification-service.ts`; future: `weekly-review-service.ts`).
- Centralize prompts in `gtd-prompts.ts`. Add new prompt builders here (e.g., weekly review templates).
- Services should:
  - Generate prompts via `gtd-prompts.ts`.
  - Call `BedrockClient`.
  - Parse/validate `BedrockResponse` (JSON array tolerant of markdown code fences).
  - Return structured results usable by UI insertion.

## Settings & Security

- Authentication: Bedrock bearer token (API key) stored in plugin settings.
- Never log secrets. Redact token in telemetry/logs.
- Network calls occur only via the Bedrock client wrapper.

## Testing

- Use Jest. Mock `@aws-sdk/client-bedrock-runtime` (e.g., `BedrockRuntimeClient`, `ConverseCommand`).
- Avoid network calls; test retry/backoff logic deterministically.
- Validate JSON parsing and error fallbacks (timeouts, throttling, parse errors).

## UI Patterns

- Current: “Clarify selected text (GTD)” inserts Tasks-formatted lines using `convertToTasksFormat()`.
- Planned: Chat sidebar with history and an “Insert Tasks” action. Only JSON is parsed for insertion.

## Naming & Structure

- Keep transport layer generic (`BedrockClient`, `generateText`, `converse`).
- Keep GTD semantics in services/prompts (not in the client).
- When adding major features (e.g., weekly review), create a service file and corresponding prompts.

## Product Docs Alignment

- When adding new services/features, update `.agent-os/product/` (mission, roadmap, tech-stack) to reflect the architecture.

