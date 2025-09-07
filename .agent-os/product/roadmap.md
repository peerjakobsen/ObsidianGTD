# Product Roadmap

## Phase 1: Core MVP

**Goal:** Deliver functional inbox clarification with AI-powered next action identification
**Success Criteria:** 80% of clarified actions require no manual editing, <3 seconds clarification time

### Features

- [x] Basic Obsidian plugin scaffold with settings panel `S`
- [x] Direct AWS Bedrock integration via TypeScript client `M`
- [x] Text selection to inbox clarification command `M`
- [x] Tasks plugin compatible output format `M`
- [x] Context tag detection (computer, phone, errands, etc.) `S`
- [x] Time estimation generation (#5m to #4h format) `S`

### Dependencies

- AWS account with Bedrock access
- Obsidian Tasks plugin installed
- Node.js development environment

## Phase 2: Direct AWS Integration

**Goal:** Call AWS Bedrock directly from the plugin (no server)
**Success Criteria:** Plugin works without any local server, same functionality preserved

### Features

- [x] AWS SDK integration with `@aws-sdk/client-bedrock-runtime` `M`
- [x] TypeScript Bedrock client wrapper with retry + HTTP/SDK fallback `L`
- [x] AWS bearer token configuration in plugin settings `S`
- [x] Port legacy client logic to TypeScript `M`
- [x] Connection testing for direct AWS access `S`
- [x] Remove server dependency from documentation `S`

### Dependencies

- AWS Bedrock bearer token access (no access keys)
- Phase 1 completion and validation
- Bundle size optimization testing

### Benefits

- Simpler deployment (no server required)
- Faster response times (direct API calls)
- Better user experience (no localhost setup)
- Single codebase maintenance

## Phase 3: Conversational Assistant (Chat Sidebar)

**Goal:** Add a multi-turn conversational mode to iteratively refine GTD outputs and insert tasks on demand
**Success Criteria:** Users can refine results in a sidebar and insert tasks when ready; ≥90% turns yield valid, parseable JSON; median round-trip ≤4s

### Features

- [x] `BedrockClient.converse({ system, messages, inferenceConfig })` API `M`
- [x] Sidebar chat view (ItemView) with history, input, and status `L`
- [x] Pre-fill current selection into input (no auto-send); prompt dropdown (default Clarify) `S`
- [x] Controls: Send, Insert Tasks, New Chat, Close (×), Compact toggle `S`
- [x] Output mode: free-form chat; JSON-only enforced on “Insert Tasks” via minimal final instruction `M`
- [ ] Strict JSON every turn (opt-in) `M`
- [ ] Thread scope options: per-note vs. global; auto-clear on file change `M`
- [ ] Settings (chat): model params (temperature, tokens), auto-insert defaults, thread scope `S`
- [x] Error handling: surfaced in UI with status + notices; progress indicator `S`

### Dependencies

- Phase 2 completion (direct AWS calls)
- Stable prompt generator and JSON parsing pipeline

### Technical Notes

- Extend Bedrock client with `converse` reusing retry + HTTP/SDK fallback
- Manage message thread in service; keep one-shot `generateText` for current command
- Parse assistant replies (JSON array, code block tolerant); surface parse errors politely
- Reuse existing insertion logic and `convertToTasksFormat`
- Minimal telemetry for failure categories (timeout, parse, network)
- Prompt architecture: base GTD persona + small task variants layered as system array (Clarify, Weekly Review types)
- Prompt registry + dropdown selector in sidebar
- Strictness: avoid schema duplication; add a tiny “JSON array only” instruction before inserts

### Benefits

- Iterative refinement without leaving Obsidian
- Safer insertion by separating exploration from commit
- Reduced prompt fragility; clearer control over output format

## Phase 3.5: Project Note Template

**Goal:** Generate a GTD-aligned project note from a raw description with consistent YAML and Tasks queries
**Success Criteria:** Command creates/updates a structured project note; re-runs are idempotent; tasks queries surface actions across the vault via project tag

### Features

- [ ] Command: "GTD: Structure Project Note" `M`
- [ ] YAML frontmatter: `status`, `project_tag` with computed slug `S`
- [ ] Structured section (Objective, DoD, Scope, Milestones, Risks, Stakeholders, Links, Notes) generated via Bedrock `M`
- [ ] Managed markers for idempotent updates (structured/raw) `S`
- [ ] Standard Tasks queries for Next Actions and Waiting For by project tag `S`
- [ ] Settings: tag prefix, default status, review interval; offline skeleton fallback `S`

### Dependencies

- Phase 2 completion (direct Bedrock calls)
- Obsidian Tasks plugin installed

### Benefits

- Uniform project notes aligned to GTD best practices
- Immediate visibility of related tasks across the vault
- Foundation for Review Projects and project health checks

## Phase 4: Intelligent Processing

**Goal:** Add advanced metadata detection and project association
**Success Criteria:** Users report 90% satisfaction with clarified next action quality

### Features

- [ ] Energy level assessment (#e-low/medium/high) `S`
- [ ] Project association detection and tagging `M`
- [ ] Action verb optimization for better next action formatting `S`
- [ ] Batch processing for multiple inbox items `M`
- [ ] Custom prompt template configuration `L`
- [ ] Clarification history and undo functionality `M`

### Dependencies

- Phase 2 completion
- User feedback on direct integration

## Phase 5: Weekly Review Assistant

**Goal:** Automate weekly review insights with targeted analysis per GTD list
**Success Criteria:** 30% reduction in weekly review time, 100% stale item detection, actionable insights per list

### Core Review Commands

- [x] Review Next Actions (prompt-based in chat) `M`
 - Detect stale actions (>14 days)
 - Identify actions that are actually projects
 - Find missing metadata (context, time)
 - Highlight quick wins (≤15min tasks)
 - Suggest clarity improvements for vague actions

- [x] Review Waiting For (prompt-based in chat) `M`
 - Flag aging items (>2 weeks)
 - Check for unclear ownership
 - Suggest follow-up actions

- [x] Review Someday/Maybe (prompt-based in chat) `M`
 - Identify items to activate now
 - Mark others as #someday; project-candidate tagging

- [ ] Review Projects command (note/file scanning) `L`
 - Detect projects without next actions
 - Identify stalled projects
 - Check for unclear outcomes
 - Analyze project load and balance

### Analysis Engine

- [ ] Task parser for markdown format (file-based analysis) `M`
 - Extract tasks with Obsidian Tasks format
 - Parse dates, tags, and metadata
 - Build structured task objects for analysis

- [x] Review prompt templates (base persona + list variants) `S`
 - Context-aware analysis rules encoded via prompt variants
 - Future: user-configurable review criteria

- [ ] Pattern detection system `L`
 - Track recurring issues across reviews
 - Identify procrastination patterns
 - Bottleneck analysis (people, contexts, projects)

### Output & Reporting

- [ ] Review insights modal `M`
 - Display categorized findings
 - Show actionable recommendations
 - Quick action buttons (move, modify, delete)

- [ ] Markdown report generation `M`
 - Statistics summary
 - Prioritized action items
 - Suggested changes with diffs
 - Executive summary for comprehensive review

- [ ] Comprehensive weekly review command `L`
 - Run all reviews in sequence
 - Generate unified dashboard
 - Cross-list insights (e.g., waiting-for items that block next actions)
 - Weekly focus recommendations

### Configuration & Persistence

- [ ] **Review settings panel** `S`
 - Stale item thresholds per list type
 - Custom review criteria
 - Report format preferences

- [ ] **Review history tracking** `M`
 - Store review snapshots
 - Track improvement over time
 - Trend analysis for system health

### Nice-to-Have Enhancements

- [ ] **Batch operations from review** `M`
 - Apply suggested changes in bulk
 - Move items between lists
 - Update metadata across multiple tasks

- [ ] **Smart scheduling suggestions** `M`
 - Recommend optimal task scheduling based on calendar
 - Energy/context batching recommendations

- [ ] **Integration with daily notes** `S`
 - Auto-generate weekly review note
 - Link to previous reviews
 - Track review completion

### Technical Implementation Notes

**Priority Order:**
1. Task parser (foundation for everything)
2. Review Next Actions command (most used)
3. Review Projects command (critical for GTD)
4. Comprehensive review (ties everything together)
5. Other list reviews
6. Enhancements

**Size Estimates:**
- S = 1-2 hours
- M = 3-5 hours  
- L = 6-10 hours






### Dependencies

- Sufficient next action history for analysis
- User adoption of Phase 1/2 features
