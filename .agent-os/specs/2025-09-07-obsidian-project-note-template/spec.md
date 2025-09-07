# Spec Requirements Document

> Spec: Obsidian Project Note Template
> Created: 2025-09-07

## Overview

Add a command in the Obsidian plugin that converts a raw project description into a structured, GTD‑aligned project note with consistent YAML metadata and built‑in Tasks queries for Next Actions and Waiting For. The flow should be idempotent: re‑running the command updates only the structured section while preserving the raw description.

## User Stories

### Create a structured project note
As a GTD user, I want to take a raw project description and generate a structured project note with objective, definition of done, scope, milestones, risks, stakeholders, and standard Tasks queries so that my projects are uniform and immediately actionable.

Detailed workflow: From a new or existing note, I enter rough thoughts, invoke “GTD: Structure Project Note”, and the note is organized with YAML metadata (status, project_tag), a structured section generated with Bedrock, and tasks queries referencing the computed project tag.

### Safe re-run without losing raw content
As a user, I want to re‑run the command on the same note to refine the structured section without losing my raw description or non‑managed content, so that I can iteratively improve the project definition.

Detailed workflow: Re‑running the command only replaces content between structured markers and refreshes YAML defaults if missing, leaving raw text intact between dedicated raw markers.

### Consistent tagging and discovery
As a user, I want the plugin to compute and set a `project_tag` (e.g., `#project/my-project`) so that all tasks tagged with this value show up in the project’s Next Actions and Waiting For queries across the vault.

Detailed workflow: The plugin derives a slug from the note title (or filename), writes it to YAML as `project_tag: "#project/<slug>"`, ensures a top‑level title exists, and injects standardized Tasks queries that filter by this tag.

## Spec Scope

1. **Command: Structure Project Note** – Register a command palette action that structures the current note.
2. **YAML metadata injection** – Ensure frontmatter exists and includes `status` and `project_tag` (with configurable defaults).
3. **Structured + Raw blocks** – Insert or update two managed sections: a Bedrock‑generated structured section and a preserved raw description section.
4. **Tasks queries** – Insert standard Tasks queries for Next Actions and Waiting For that filter by the computed `project_tag`.
5. **Idempotent updates** – On re‑run, only replace the structured section; preserve raw section and user content outside managed markers.

## Out of Scope

- Automatic scanning or refactoring of existing tasks in the vault beyond the Tasks queries.
- Project dashboards or cross‑project reporting UI.
- Multi‑note project structures or templates spanning multiple files.
- Database/storage beyond the note file itself.
- API changes or server components; feature is implemented entirely in the plugin using existing Bedrock client.

## Expected Deliverable

1. Running the command on a note produces YAML with `status` and `project_tag`, inserts/updates a structured section with GTD fields, and adds standard Tasks queries that correctly filter by the tag.
2. Re‑running the command updates only the structured section while preserving the raw description and any content outside the managed markers.
3. Settings allow configuring project tag prefix and default status; behavior works offline by inserting a skeleton template when Bedrock is unavailable.

