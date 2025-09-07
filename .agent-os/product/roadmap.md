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

- [ ] `BedrockClient.converse({ system, messages, inferenceConfig })` API `M`
- [ ] Sidebar chat view (ItemView) with history, input, and status `L`
- [ ] Preload current selection as first user message (auto-send) `S`
- [ ] Controls: Send, Insert Tasks, Clear `S`
- [ ] Output modes: strict JSON every turn (default) or free-form chat with JSON-only on “Insert Tasks” `M`
- [ ] Thread scope options: per-note vs. global; auto-clear on file change `M`
- [ ] Settings: model params (temperature, tokens), auto-insert defaults, thread scope `S`
- [ ] Error handling: timeouts/retries surfaced in UI; progress indicator `S`

### Dependencies

- Phase 2 completion (direct AWS calls)
- Stable prompt generator and JSON parsing pipeline

### Technical Notes

- Extend Bedrock client with `converse` reusing retry + HTTP/SDK fallback
- Manage message thread in service; keep one-shot `generateText` for current command
- Parse assistant replies (JSON array, code block tolerant); surface parse errors politely
- Reuse existing insertion logic and `convertToTasksFormat`
- Minimal telemetry for failure categories (timeout, parse, network)

### Benefits

- Iterative refinement without leaving Obsidian
- Safer insertion by separating exploration from commit
- Reduced prompt fragility; clearer control over output format

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

- [ ] **Review Next Actions command** `L`
 - Detect stale actions (>14 days)
 - Identify actions that are actually projects
 - Find missing metadata (context, time, energy)
 - Highlight quick wins (≤15min tasks)
 - Suggest clarity improvements for vague actions

- [ ] **Review Waiting For command** `M`
 - Flag aging items (>2 weeks)
 - Check for unclear ownership
 - Suggest follow-up actions
 - Identify patterns (bottleneck people/departments)

- [ ] **Review Someday/Maybe command** `M`
 - Identify items to activate now
 - Flag items for deletion (>6 months old)
 - Group related items into potential projects
 - Seasonal activation suggestions

- [ ] **Review Projects command** `L`
 - Detect projects without next actions
 - Identify stalled projects
 - Check for unclear outcomes
 - Analyze project load and balance

### Analysis Engine

- [ ] **Task parser for markdown format** `M`
 - Extract tasks with Obsidian Tasks format
 - Parse dates, tags, and metadata
 - Build structured task objects for analysis

- [ ] **Review prompt templates** `S`
 - Customizable prompts per list type
 - Context-aware analysis rules
 - User-configurable review criteria

- [ ] **Pattern detection system** `L`
 - Track recurring issues across reviews
 - Identify procrastination patterns
 - Bottleneck analysis (people, contexts, projects)

### Output & Reporting

- [ ] **Review insights modal** `M`
 - Display categorized findings
 - Show actionable recommendations
 - Quick action buttons (move, modify, delete)

- [ ] **Markdown report generation** `M`
 - Statistics summary
 - Prioritized action items
 - Suggested changes with diffs
 - Executive summary for comprehensive review

- [ ] **Comprehensive weekly review command** `L`
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
