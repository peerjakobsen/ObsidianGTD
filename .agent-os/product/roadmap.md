# Product Roadmap

## Phase 1: Core MVP

**Goal:** Deliver functional inbox clarification with AI-powered next action identification
**Success Criteria:** 80% of clarified actions require no manual editing, <3 seconds clarification time

### Features

- [x] Basic Obsidian plugin scaffold with settings panel `S`
- [x] FastAPI backend service with health check endpoint `S`
- [x] AWS Bedrock integration with Claude API `M`
- [x] Text selection to inbox clarification command `M`
- [x] Tasks plugin compatible output format `M`
- [x] Context tag detection (computer, phone, errands, etc.) `S`
- [x] Time estimation generation (#5m to #4h format) `S`

### Dependencies

- AWS account with Bedrock access
- Obsidian Tasks plugin installed
- Node.js development environment

## Phase 2: Direct AWS Integration

**Goal:** Eliminate FastAPI server and call AWS Bedrock directly from plugin
**Success Criteria:** Plugin works without running local server, same functionality preserved

### Features

- [x] AWS SDK integration with @aws-sdk/client-bedrock-runtime `M`
- [x] Direct Bedrock client service using AWS SDK HTTP handler `L`
- [x] AWS bearer token configuration in plugin settings `S`
- [x] Port server bedrock_client.py logic to TypeScript `M`
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

## Phase 3: Intelligent Processing

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

## Phase 4: Weekly Review Assistant

**Goal:** Automate weekly review insights and system health analysis
**Success Criteria:** 30% reduction in weekly review time, 100% stale project detection

### Features

- [ ] Weekly review template generation `M`
- [ ] Stale item detection with configurable timeframes `L`
- [ ] Orphaned project identification `M`
- [ ] System health metrics dashboard `L`
- [ ] Actionable recommendation engine `XL`
- [ ] Review scheduling and notifications `S`

### Dependencies

- Sufficient next action history for analysis
- User adoption of Phase 1/2 features
