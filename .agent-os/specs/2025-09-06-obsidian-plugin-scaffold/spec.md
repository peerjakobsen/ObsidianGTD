# Spec Requirements Document

> Spec: Obsidian Plugin Scaffold with Task Conversion
> Created: 2025-09-06
> Status: Planning

## Overview

Implement the foundational Obsidian plugin structure with a settings panel for backend configuration and a text selection command that converts selected text into properly formatted GTD tasks. This MVP enables users to process inbox items directly within Obsidian using AI-powered task generation that can produce multiple task types (Next Actions, Waiting For, Someday Maybe) while maintaining full compatibility with the existing Tasks plugin ecosystem.

## User Stories

1. **Plugin Setup and Configuration**
   As a GTD practitioner, I want to install and configure the plugin through a settings panel, so that I can connect to the local backend service and customize processing preferences.
   
   User installs the plugin, opens settings, configures backend URL (default: localhost:8000), sets processing timeout, and enables/disables features as needed.

2. **Text to Multiple Tasks Conversion**
   As an Obsidian user, I want to select raw inbox text and convert it into one or more formatted tasks with appropriate GTD categories, so that I can quickly process complex captured thoughts into actionable items, waiting items, or future considerations without leaving my note-taking flow.
   
   User selects text in any note, runs the "Convert to Task" command from command palette, receives multiple formatted tasks as needed: Next Actions (standard tasks), Waiting For items (#waiting tag), and Someday Maybe items (#someday tag). All tasks use proper Tasks plugin syntax and can be immediately integrated into their GTD workflow.

## Spec Scope

1. **Plugin Scaffold** - Complete Obsidian plugin structure with manifest, main class, and build configuration
2. **Settings Panel** - Configuration interface for backend URL, timeout settings, and feature toggles
3. **Command Registration** - Text selection to task conversion command integrated with Obsidian's command palette
4. **API Integration** - Connection to existing FastAPI backend with proper error handling
5. **Multi-Task Output** - Support for generating multiple tasks from single inbox text with proper GTD categorization
6. **GTD Task Types** - Generate Next Actions, Waiting For (#waiting), and Someday Maybe (#someday) tasks as appropriate

## Out of Scope

- Batch processing of multiple text selections simultaneously
- Preview functionality before task generation  
- Custom prompt template configuration
- Processing history and undo functionality
- Advanced metadata like energy levels or complex project associations
- Manual task type selection (AI determines appropriate categories)

## Expected Deliverable

1. Functional Obsidian plugin that can be loaded and configured through settings panel
2. Working text-to-task conversion command that can produce multiple tasks with appropriate GTD tags (#waiting, #maybe)
3. Successful integration with existing FastAPI backend for AI-powered multi-task generation

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-06-obsidian-plugin-scaffold/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-06-obsidian-plugin-scaffold/sub-specs/technical-spec.md