# Spec Tasks

## Tasks

- [x] 1. Add BedrockClient.converse API (TS)
  - [x] 1.1 Write tests for `BedrockClient.converse` (maps params → ConverseCommandInput, uses retry/fallback, returns BedrockResponse)
  - [x] 1.2 Implement `converse({ system, messages, inferenceConfig })` mapping to `ConverseCommandInput`
  - [x] 1.3 Integrate with existing `makeRequestWithRetry` and `parseBedrockResponse`
  - [x] 1.4 Add sensible defaults and type exports; update public surface
  - [x] 1.5 Add unit tests for retriable errors and HTTP/SDK fallback paths
  - [x] 1.6 Verify all tests pass

- [ ] 2. Conversation service (thread + strict JSON)
  - [x] 2.1 Write tests for conversation service (threading, follow-ups, strict JSON on insert)
  - [x] 2.2 Add service to manage `thread: { role, content }[]` and start from selection
  - [x] 2.3 Implement `send(message)` to append and call `converse` with full thread
  - [x] 2.4 Implement `prepareForInsert()` that ensures JSON-only output and returns parsed actions
  - [x] 2.5 Handle parse errors with fallback action and clear messaging
  - [x] 2.6 Verify all tests pass

- [x] 3. Sidebar chat UI (Obsidian ItemView)
  - [x] 3.1 Write tests for view controller logic (handlers call service methods, disabled states)
  - [x] 3.2 Scaffold `ItemView` (id: `gtd-assistant-view`) with message list, input, Send/Insert/Clear
  - [x] 3.3 Preload selection on first open and auto-send initial message
  - [x] 3.4 Wire Send: disable during request; show status/errors
  - [x] 3.5 Wire Insert Tasks: call `prepareForInsert()`, format via `convertToTasksFormat`, insert at cursor
  - [x] 3.6 Wire Clear: reset thread and UI
  - [x] 3.7 Verify all tests pass

- [ ] 4. Settings support
  - [ ] 4.1 Write tests for new settings defaults/persistence (`strictJsonMode`, `temperature`, `maxTokens`)
  - [ ] 4.2 Extend settings interface + tab UI with new options
  - [ ] 4.3 Plumb settings into service/client inferenceConfig and strict mode behavior
  - [ ] 4.4 Verify all tests pass

- [ ] 5. Telemetry and docs
  - [ ] 5.1 Write tests (spies) for basic timing + parse success logging
  - [ ] 5.2 Add lightweight telemetry via existing logger (no PII, no secrets)
  - [ ] 5.3 Update README and product docs referencing conversational mode
  - [ ] 5.4 Verify all tests pass
