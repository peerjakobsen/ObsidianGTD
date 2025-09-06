# Spec Requirements Document

> Spec: Context Tag Detection and Time Estimation
> Created: 2025-09-06
> Status: Planning

## Overview

Enhance AI-powered inbox clarification with automatic context tag detection (computer, phone, errands, etc.) and time estimation generation (#5m to #4h format) to provide richer metadata for GTD next actions. This feature improves task organization and planning by automatically categorizing actions by context and estimated effort.

## User Stories

### Context-Aware Task Categorization

As a GTD practitioner, I want my clarified next actions to automatically include context tags like @computer, @phone, @errands, so that I can easily filter and batch similar actions during my daily work sessions.

When I clarify an inbox item like "call dentist about appointment", the system should automatically detect this requires a phone and add the @phone context tag to the resulting next action.

### Effort-Based Time Planning

As a GTD practitioner, I want automatic time estimates added to my next actions using GTD-compatible formats (#5m to #4h), so that I can better plan my available time slots and choose appropriate tasks.

When I clarify "review quarterly budget report", the system should analyze the complexity and add an appropriate time estimate like #45m to help me schedule this during longer focus blocks.

## Spec Scope

1. **Context Tag Detection** - Automatically analyze next action text and assign appropriate context tags (@computer, @phone, @errands, @home, @office, @anywhere)
2. **Time Estimation Generation** - Generate realistic time estimates in hashtag format (#5m, #15m, #30m, #1h, #2h, #4h) based on action complexity
3. **Tasks Plugin Compatibility** - Ensure generated metadata follows Obsidian Tasks plugin formatting standards
4. **Plugin Enhancement** - Update Obsidian plugin prompts and response parsing to include context and time metadata
5. **AI Prompt Engineering** - Enhance clarification prompts sent to Bedrock to request context and time estimation

## Out of Scope

- Custom context tag creation by users (limited to predefined set)
- Time tracking or actual vs estimated time comparison
- Context-based task filtering UI (handled by existing Tasks plugin)
- Advanced time estimation learning from user feedback

## Expected Deliverable

1. Clarified next actions automatically include relevant context tags in @tag format
2. Time estimates appear as hashtags (#15m, #1h, etc.) compatible with Tasks plugin
3. Plugin parses and formats enhanced AI responses with metadata

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-06-context-time-metadata/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-06-context-time-metadata/sub-specs/technical-spec.md