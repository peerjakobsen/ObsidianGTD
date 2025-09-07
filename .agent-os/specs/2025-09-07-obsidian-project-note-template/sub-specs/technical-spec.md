# Technical Specification

This is the technical specification for the spec detailed in .agent-os/specs/2025-09-07-obsidian-project-note-template/spec.md

## Technical Requirements

- Command registration: add `GTD: Structure Project Note` to the command palette that operates on the active note.
- YAML frontmatter management:
  - Ensure a frontmatter block exists.
  - Add or preserve `status` (default: `active`, configurable) and `project_tag`.
  - Derive `PROJECT_TITLE` from the first H1 in the document or from the filename (sans extension) if missing; enforce presence of an H1.
  - Compute `PROJECT_SLUG` from `PROJECT_TITLE` (lowercase, kebab-case) and set `project_tag` as `#project/<slug>` by default; prefix configurable (e.g., `#project/`).
  - Do not remove unknown YAML keys; only add/update known ones.
- Managed block markers:
  - Structured section is bounded by `<!-- gtd:start:structured -->` and `<!-- gtd:end:structured -->`.
  - Raw description section is bounded by `<!-- gtd:start:raw -->` and `<!-- gtd:end:raw -->`.
  - On first run, create both blocks; on re-run, replace only the structured block.
- Tasks queries (static, not LLM-provided):
  - Insert the following under headings in the structured block, substituting the computed tag:
    - Next Actions:
      ```tasks
      not done
      description includes {{PROJECT_TAG}}
      description does not include #waiting
      sort by due
      ```
    - Waiting For:
      ```tasks
      not done
      description includes {{PROJECT_TAG}}
      description includes #waiting
      sort by due
      ```
- LLM integration (Bedrock):
  - Use existing `plugin/src/bedrock-client.ts` and `conversation-service` to generate content for specific sections of the structured block from the raw description.
  - The plugin, not the LLM, controls headings and Tasks queries. The LLM returns text for: Objective, Definition of Done, Scope (in/out bullets), Milestones (with target dates if present or TBD), Risks & Constraints, Stakeholders, Links (suggestions), Notes (concise synthesis).
  - Output boundaries: instruct the LLM to return only markdown content for those sections without YAML or code fences; the plugin will wrap inside the structured markers and append the standard Tasks queries.
- Idempotency:
  - Detect existing markers and replace only the inner structured content.
  - Preserve the raw block verbatim; if selected text exists, update the raw block to match selection only on explicit user confirmation (future), otherwise leave it unchanged.
  - If YAML already has `project_tag`, reuse it; otherwise compute and write it.
- Error handling and offline fallback:
  - If Bedrock fails or is offline, insert a skeleton structured block with empty subsections and the Tasks queries, then show a notice.
  - Validate computed tag; if invalid, show a warning and fall back to a safe slug.
- Settings additions (plugin settings UI):
  - Project tag prefix (default `#project/`).
  - Default project status (default `active`).
  - Default review interval (e.g., `weekly`).
  - Optional default project folder for new notes (path string, not created automatically by this feature).
- Unit tests (where applicable in existing test setup):
  - Slug generation and tag formatting.
  - YAML insertion/merge behavior.
  - Marker detection and idempotent replacement.
  - Tasks query tag substitution.

## External Dependencies (Conditional)

No new external dependencies are required. The feature uses the existing Bedrock client (`@aws-sdk/client-bedrock-runtime`) already present in the project.

