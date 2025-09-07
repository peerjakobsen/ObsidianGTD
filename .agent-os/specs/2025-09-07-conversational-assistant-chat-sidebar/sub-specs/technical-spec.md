# Technical Specification

This is the technical specification for the spec detailed in .agent-os/specs/2025-09-07-conversational-assistant-chat-sidebar/spec.md

## Technical Requirements

- BedrockClient.converse API
  - Add `converse(params)` to `plugin/src/bedrock-client.ts` with signature:
    - `converse({ system?: string | string[]; messages: { role: 'user' | 'assistant'; content: string }[]; inferenceConfig?: { temperature?: number; maxTokens?: number; topP?: number; stopSequences?: string[] } }): Promise<BedrockResponse>`
  - Map to `ConverseCommandInput`:
    - `modelId` from settings; `system` to `{ text }` blocks; `messages[*].content` to `{ text }`
    - Use existing retry/fallback path in `makeRequestWithRetry`
  - Reuse `parseBedrockResponse` to normalize output and counters

- Conversation service
  - Add a lightweight wrapper (or extend `GTDClarificationService`) to maintain `thread: { role, content }[]`
  - Initial call: `system = GTDPromptGenerator.systemPrompt` + first user message from selection; strict JSON instruction
  - Follow-ups: append `{ role: 'user', content }` and call `converse` with entire thread
  - For Insert Tasks: send a final “now output only a JSON array of tasks” user message if needed, then parse JSON and format

- Sidebar chat UI (Obsidian ItemView)
  - Register an `ItemView` id e.g. `gtd-assistant-view`
  - Components: message list, input textarea, buttons (Send, Insert Tasks, Clear), status indicator
  - Behavior:
    - On first open, if there is selection, preload as first message and auto-send
    - Disable Send while waiting; show simple spinner or status text
    - Errors: show in view and via `Notice` where appropriate
  - Command: “Open GTD Assistant” opens or focuses the sidebar

- Parsing & insertion
  - Reuse existing JSON parsing tolerant of markdown fenced code blocks
  - Reuse `convertToTasksFormat` to construct task lines
  - Insert at current cursor position; preserve user cursor when possible

- Settings (minimal)
  - Add: `strictJsonMode` (default: true)
  - Expose: `temperature`, `maxTokens` (advanced section)
  - Store in existing settings and wire to service/client calls

- Telemetry (lightweight)
  - Log response times and parse success/failure counts (no PII)
  - Use existing logger; do not log prompts or secrets

## External Dependencies (Conditional)

No new external libraries are required. Use Obsidian API primitives and existing AWS SDK mocks in tests.
