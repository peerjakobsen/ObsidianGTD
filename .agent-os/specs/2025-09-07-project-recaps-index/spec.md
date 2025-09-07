# Spec Requirements Document

> Spec: Project Recaps and Index
> Created: 2025-09-07

## Overview

Generate a concise, AI-assisted status recap for each GTD project note and produce a single Project Index note summarizing all projects. The plugin scans the vault for project notes, calls Bedrock once per project with a bounded context, and writes an idempotent index table and brief per-project summaries.

## User Stories

### Recap each project note
As a user, I want the plugin to detect my project notes and generate a short, standardized recap (health, key risks, next steps) so that I can quickly understand the status of each project.

Detailed workflow: The command scans for notes with `project_tag` (or `type: project`/markers), builds a small context (frontmatter + structured snippets + task counts), calls Bedrock, and stores a JSON recap per note in plugin data.

### Build a Project Index
As a user, I want a single index note listing all projects with key metrics and recommendations so that I have a high-level dashboard I can review weekly.

Detailed workflow: The command writes/updates `Projects/Project Index.md`, replacing content only between managed markers with a sortable table and brief bullets per project.

### Fast re-runs with caching
As a user, I want re-runs to be fast and inexpensive by skipping unchanged projects unless I force a refresh.

Detailed workflow: The plugin hashes relevant project content and only re-queries Bedrock when the hash changes or on explicit “Force Refresh.”

## Spec Scope

1. **Project note detection** – Identify project notes via frontmatter (`project_tag`, optional `type: project`) or structural markers; filter by status.
2. **Recap prompt + JSON schema** – Per-note Bedrock call with strict JSON schema (summary, health, counts, risks, recommendations).
3. **Lightweight task snapshot** – Compute next-action/waiting-for counts and stale items via tag-based scan; cap sample items.
4. **Caching + concurrency** – Content hashing, cache storage, command options for force refresh; queued Bedrock calls with retry/backoff.
5. **Project Index note writer** – Idempotent update of a dashboard note with table + per-project bullets and “Last updated” timestamp.

## Out of Scope

- Modifying project notes beyond reading context; no automatic task edits.
- Calendar or external system integration.
- Complex UI dashboards (use a single markdown note for v1).
- Database or server components; all local plugin logic.

## Expected Deliverable

1. Running “Update Project Index” scans projects, generates/loads recaps, and updates `Project Index.md` between markers without altering other content.
2. Re-runs skip unchanged projects using hashing unless “Force Refresh” is chosen; clear progress feedback and error handling are shown.
3. Strict JSON schema is enforced for Bedrock responses; timeouts/retries and offline behavior degrade gracefully (index notes stale entries when AI unavailable).

