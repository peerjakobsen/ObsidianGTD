# Spec Requirements Document

> Spec: Direct AWS Integration
> Created: 2025-09-06
> Status: Planning

## Overview

Eliminate the FastAPI server dependency and integrate AWS Bedrock directly into the Obsidian plugin using the AWS JavaScript SDK and bearer token authentication. This change simplifies deployment by removing the localhost server requirement while maintaining identical GTD clarification functionality and improving response times through direct API calls.

## User Stories

### GTD User - Simplified Setup

As a GTD practitioner using Obsidian, I want to use the GTD Assistant plugin without running a local server, so that I can start clarifying inbox items immediately after installing the plugin without complex setup steps.

The user installs the plugin, enters their AWS Bedrock bearer token in settings, and immediately begins clarifying text selections. No terminal commands, server startup, or localhost troubleshooting required.

### GTD User - Reliable Operation

As a GTD practitioner, I want the plugin to work reliably without network connectivity issues to localhost, so that I can focus on processing my inbox without technical interruptions.

The user experiences consistent operation regardless of local network configuration, firewall settings, or system security policies that might block localhost connections.

## Spec Scope

1. **AWS SDK Integration** - Install and configure @aws-sdk/client-bedrock-runtime for direct AWS API access
2. **Direct Bedrock Client** - Replace HTTP-based api-client.ts with AWS SDK-based implementation using bearer token authentication
3. **Bearer Token Configuration** - Add AWS bearer token settings field with validation and secure storage

## Out of Scope

- Migration of existing user data or settings
- Support for AWS access keys or IAM role authentication  
- Caching or offline functionality improvements
- Changes to GTD prompt generation or clarification logic
- Use of Obsidian requestUrl API (AWS SDK handles HTTP internally)

## Expected Deliverable

1. Plugin functions identically to current version without requiring local FastAPI server
2. Settings panel includes AWS bearer token configuration with connection testing
3. Bundle size remains under 500KB total with AWS SDK included

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-06-direct-aws-integration/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-06-direct-aws-integration/sub-specs/technical-spec.md