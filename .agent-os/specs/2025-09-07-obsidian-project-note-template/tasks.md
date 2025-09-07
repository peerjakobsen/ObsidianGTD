# Spec Tasks

## Tasks

- [ ] 1. Define project note template and LLM prompt
  - [ ] 1.1 Write tests for prompt shape and markers
  - [ ] 1.2 Add template section constants (headings, markers, tasks queries)
  - [ ] 1.3 Add Bedrock prompt variant in `plugin/src/gtd-prompts.ts` (project note structuring)
  - [ ] 1.4 Constrain output to only section bodies (no YAML, no fences)
  - [ ] 1.5 Validate prompt via unit tests and snapshots
  - [ ] 1.6 Verify all tests pass

- [ ] 2. Implement YAML frontmatter + tag utilities
  - [ ] 2.1 Write tests for slugify(title) → `my-project` and tag formatting
  - [ ] 2.2 Derive `PROJECT_TITLE` from H1 or filename; ensure H1 present
  - [ ] 2.3 Ensure frontmatter exists; merge `status` (default `active`) and `project_tag`
  - [ ] 2.4 Compute `#project/<slug>` using configurable prefix
  - [ ] 2.5 Preserve unknown YAML keys and values
  - [ ] 2.6 Verify all tests pass

- [ ] 3. Insert managed sections with idempotent updates
  - [ ] 3.1 Write tests for marker detection and replacement
  - [ ] 3.2 Create structured block writer (replace only between `<!-- gtd:start:structured -->` … `<!-- gtd:end:structured -->`)
  - [ ] 3.3 Create raw block writer (create once; preserve content on re-run)
  - [ ] 3.4 Append static Tasks queries with substituted `project_tag`
  - [ ] 3.5 Offline fallback: insert skeleton sections when Bedrock fails
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Wire command palette action and orchestration
  - [ ] 4.1 Write minimal tests for command registration and handler
  - [ ] 4.2 Register `GTD: Structure Project Note` command
  - [ ] 4.3 Orchestrate: read active note → ensure YAML/tag → call Bedrock → write structured block
  - [ ] 4.4 Notices and error handling (offline, invalid tag)
  - [ ] 4.5 Light manual validation in Obsidian dev vault
  - [ ] 4.6 Verify all tests pass

- [ ] 5. Settings, docs, and polish
  - [ ] 5.1 Add settings: tag prefix, default status, review interval, default folder
  - [ ] 5.2 Persist and load settings; expose in settings UI
  - [ ] 5.3 Update README with usage and template example
  - [ ] 5.4 Add spec cross-links in docs if applicable
  - [ ] 5.5 Final test run and lint/format
  - [ ] 5.6 Verify all tests pass

