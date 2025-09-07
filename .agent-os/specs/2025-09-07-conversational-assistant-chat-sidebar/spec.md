# Spec Requirements Document

> Spec: Conversational Assistant Chat Sidebar
> Created: 2025-09-07

## Overview

Add a multi-turn conversational mode via a sidebar to iteratively refine GTD task outputs and insert them on demand, powered by a new `BedrockClient.converse({ system, messages, inferenceConfig })` API and a lightweight chat UI.

## User Stories

### Chat to Refine Tasks

As a GTD user, I want to open a sidebar that loads my selected text as the first message and returns initial tasks, so that I can refine the output with follow-up instructions before inserting into my note.

Detailed workflow: User opens “GTD Assistant” sidebar; current editor selection is preloaded and sent using the GTD system prompt; assistant returns tasks (strict JSON); user types follow-ups like “make due Friday” or “group by context” and sees updated results.

### Insert When Ready

As a user, I want a one-click “Insert Tasks” button that inserts the latest assistant result at my cursor position, so that I can commit the refined output into my note without leaving the chat.

Detailed workflow: After a satisfactory response, user clicks “Insert Tasks”; the service requests/ensures JSON-only output, parses it, formats with `convertToTasksFormat`, and inserts at the editor cursor with minimal disruption.

### Clear or Continue

As a user, I want to clear the conversation or keep it per-note, so that I can either start fresh or continue iterating on a specific note without cross-note confusion.

Detailed workflow: Chat provides a “Clear” action that resets the thread; default thread scope is per-note and cleared on file change unless the setting is changed in the future.

## Spec Scope

1. Bedrock converse API – Implement `BedrockClient.converse({ system, messages, inferenceConfig })` that maps to Bedrock `ConverseCommandInput`, reusing existing retry and HTTP/SDK fallback; returns `BedrockResponse`.
2. Conversation service – Extend the clarification service (or add a lightweight conversation wrapper) to manage message thread, generate prompts via `gtd-prompts.ts`, and request strict JSON on demand for insertion.
3. Sidebar chat UI – Add an Obsidian `ItemView` with message list, input box, and buttons: Send, Insert Tasks, Clear; preload selection on first open; show simple status/errors.
4. JSON parsing and insertion – Reuse existing parser tolerant of fenced code blocks; call `convertToTasksFormat` and insert at cursor; display user notices consistent with current flow.
5. Settings (minimal) – Add “Strict JSON every turn (default on)” and expose temperature/max tokens as advanced options; default values match current behavior.

## Out of Scope

- Streaming token display or partial updates
- Attachments, images, or function-calling/tool use
- Multi-file edits or bulk insert across multiple notes
- Retrieval-augmented generation (RAG) or vault-wide context
- Cloud/server components (remain TS-only, no proxy)

## Expected Deliverable

1. A tested `BedrockClient.converse` method with types, defaults, and Jest unit tests (SDK mocked).
2. A functional “GTD Assistant” sidebar that can send/receive messages, handle errors, and insert tasks from parsed JSON.
3. Measurable behavior: strict JSON mode on by default, successful insertion following a conversation, and basic telemetry hooks for response time and parse success (no PII).
