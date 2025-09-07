# Technical Specification

This is the technical specification for the spec detailed in .agent-os/specs/2025-09-07-project-recaps-index/spec.md

## Technical Requirements

- Project detection
  - Frontmatter: `project_tag` required; also accept `type: project`.
  - Structural fallback: presence of `<!-- gtd:start:structured -->` markers.
  - Status filter: include statuses via settings (default: `active`, `on-hold`).
- Context assembly per project (token-bound)
  - Frontmatter keys: `title`, `status`, `project_tag`, `deadline`, `review` (when present).
  - Structured section snippets: Objective, DoD, Milestones/Risks limited to N lines each.
  - Task snapshot (tag-based): counts for next actions and waiting for; stale count (>14d); nearest due date. Optionally include up to K sample task lines.
  - Compute a `contentHash` from the above; store alongside `lastRecapAt` and `recapJson` in plugin data.
- Bedrock integration
  - One call per project; reuse existing Bedrock client with retries/backoff.
  - Strict JSON: enforce schema and “JSON only, no markdown, no fences.”
  - Inference config from settings (temp/tokens) with safe defaults.
  - Error handling: mark project as `recapStatus=error` with message; continue.
- JSON recap schema (v1)
  - `project_slug` (string), `title` (string), `status` (enum), `summary` (<= 2 sentences),
    `health` ("green"|"yellow"|"red"), `has_next_actions` (bool), `next_actions_count` (int),
    `waiting_for_count` (int), `stale_actions` (int), `nearest_due` (YYYY-MM-DD|null),
    `upcoming_milestones` (array of {title,date?}), `risks` (array of {desc,severity}),
    `attention_score` (0-100), `recommendations` (string[]).
- Concurrency, caching, and controls
  - Queue with concurrency limit (default 3) and exponential backoff on 429/5xx.
  - Skip Bedrock when `contentHash` unchanged; implement “Force Refresh” command flag to bypass cache.
  - Persist per-project recap entries in plugin data (local, not synced by default unless user syncs settings).
- Index note writer
  - Path configurable (default: `Projects/Project Index.md`). Ensure parent folder exists if needed.
  - Idempotence: replace content only between `<!-- gtd:start:project-index -->` and `<!-- gtd:end:project-index -->`.
  - Content: summary table (Title, Status, Health, NAs, Waiting, Stale, Nearest Due, Attention, Last Recap) sorted by `attention_score` desc, then nearest due.
  - Include brief bullets per project under the table (top 1–3 recommendations). Add “Last updated: ISO timestamp”.
- Settings (additions)
  - Included statuses (multiselect), concurrency, timeout, token budget caps.
  - Index note path; max sample tasks per project; stale threshold days.
  - Force refresh toggle per run (command option, not persisted).
- Commands + UI
  - `GTD: Update Project Index` (uses cache).
  - `GTD: Force Refresh Project Index` (ignores cache).
  - Progress modal/sidebar with counts and errors; resumable on interruption (best-effort).
- Tests
  - Detection logic and status filter.
  - Hashing and cache skip.
  - Prompt builder includes required fields; schema enforcement.
  - Index writer marker replacement and stable sort.

## External Dependencies (Conditional)

No new dependencies required. Reuse existing Bedrock client (`@aws-sdk/client-bedrock-runtime`) and Obsidian API. Optional: rely on already-installed Tasks plugin for tag conventions; scanning remains plain-text to avoid hard dependency.

