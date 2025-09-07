# Spec Summary (Lite)

Generate a GTD‑aligned project note from a raw description using a command palette action. The plugin ensures YAML frontmatter (`status`, `project_tag`), inserts a structured section (Objective, DoD, Scope, Milestones, Risks, Stakeholders, Links, Notes) generated with Bedrock, and adds standard Tasks queries for Next Actions and Waiting For filtered by the computed project tag. Re‑runs are idempotent: only the structured section is replaced; the raw description is preserved.

