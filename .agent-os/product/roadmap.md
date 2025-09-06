# Product Roadmap

## Phase 1: Core MVP

**Goal:** Deliver functional inbox processing with AI-powered task generation
**Success Criteria:** 80% of generated tasks require no manual editing, <3 seconds processing time

### Features

- [ ] Basic Obsidian plugin scaffold with settings panel `S`
- [ ] FastAPI backend service with health check endpoint `S`
- [ ] AWS Bedrock integration with Claude API `M`
- [ ] Text selection to task conversion command `M`
- [ ] Tasks plugin compatible output format `M`
- [ ] Context tag detection (computer, phone, errands) `S`
- [ ] Time estimation generation (#5m to #4h format) `S`

### Dependencies

- AWS account with Bedrock access
- Obsidian Tasks plugin installed
- Node.js development environment

## Phase 2: Intelligent Processing

**Goal:** Add advanced metadata detection and project association
**Success Criteria:** Users report 90% satisfaction with generated task quality

### Features

- [ ] Energy level assessment (#e-low/medium/high) `S`
- [ ] Project association detection and tagging `M`
- [ ] Action verb optimization for better task formatting `S`
- [ ] Batch processing for multiple inbox items `M`
- [ ] Custom prompt template configuration `L`
- [ ] Processing history and undo functionality `M`

### Dependencies

- Phase 1 completion
- User feedback on MVP features

## Phase 3: Weekly Review Assistant

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

- Sufficient task history for analysis
- User adoption of Phase 1/2 features