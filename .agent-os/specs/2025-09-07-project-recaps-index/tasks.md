# Spec Tasks

## Tasks

- [ ] 1. Define recap schema and prompt
  - [ ] 1.1 Write tests for schema shape and prompt boundaries
  - [ ] 1.2 Define TypeScript types and JSON schema for recap output
  - [ ] 1.3 Add Bedrock prompt variant in `plugin/src/gtd-prompts.ts` (project recap)
  - [ ] 1.4 Constrain output to strict JSON (no markdown/fences); add parser guards
  - [ ] 1.5 Snapshot tests with representative inputs and truncated contexts
  - [ ] 1.6 Verify all tests pass

- [ ] 2. Implement project detection and context assembly
  - [ ] 2.1 Write tests for detection via `project_tag`, `type: project`, and marker fallback
  - [ ] 2.2 Add scanner to enumerate candidate notes and filter by `status`
  - [ ] 2.3 Extract frontmatter + key structured snippets (Objective/DoD/Milestones/Risks)
  - [ ] 2.4 Build lightweight task snapshot by `project_tag` (counts, nearest due, stale)
  - [ ] 2.5 Cap per-section lines/items to meet token budget
  - [ ] 2.6 Verify all tests pass

- [ ] 3. Add caching and concurrency controls
  - [ ] 3.1 Write tests for `contentHash` skip and "Force Refresh" behavior
  - [ ] 3.2 Implement content hashing over selected context fields
  - [ ] 3.3 Implement queued Bedrock calls with concurrency + retry/backoff
  - [ ] 3.4 Persist per-project recap entries in plugin data store
  - [ ] 3.5 Expose settings (statuses, concurrency, timeout, token caps)
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Implement Project Index note writer
  - [ ] 4.1 Write tests for marker replacement, sorting, and stable formatting
  - [ ] 4.2 Create/update index at configured path; ensure folder exists
  - [ ] 4.3 Render table (Title, Status, Health, NAs, Waiting, Stale, Nearest Due, Attention, Last Recap)
  - [ ] 4.4 Append brief per-project bullets (top recommendations) and timestamp
  - [ ] 4.5 Verify all tests pass

- [ ] 5. Wire commands, settings UI, and progress feedback
  - [ ] 5.1 Write tests for command registration and option handling
  - [ ] 5.2 Add `GTD: Update Project Index` and `GTD: Force Refresh Project Index`
  - [ ] 5.3 Implement progress UI, notices, and error surfacing
  - [ ] 5.4 Add settings UI for recap and index options
  - [ ] 5.5 Manual validation in dev vault; adjust thresholds
  - [ ] 5.6 Verify all tests pass

