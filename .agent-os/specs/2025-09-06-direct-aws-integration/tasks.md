# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-09-06-direct-aws-integration/spec.md

> Created: 2025-09-06
> Status: Ready for Implementation

## Tasks

- [x] 1. Install and Configure AWS SDK Dependencies
  - [x] 1.1 Install @aws-sdk/client-bedrock-runtime package
  - [x] 1.2 Update plugin build configuration for AWS SDK bundling
  - [x] 1.3 Configure TypeScript types and imports for AWS SDK
  - [x] 1.4 Verify bundle size is acceptable (under 500KB total)

- [x] 2. Create AWS Bedrock Client Implementation
  - [x] 2.1 Write tests for BedrockClient class functionality
  - [x] 2.2 Create BedrockClient class with BedrockRuntimeClient integration
  - [x] 2.3 Implement ConverseCommand for GTD clarification requests
  - [x] 2.4 Add bearer token authentication configuration
  - [x] 2.5 Implement error handling and retry logic for AWS SDK calls
  - [x] 2.6 Verify all tests pass and functionality matches current behavior

- [x] 3. Update Settings Panel for AWS Configuration
  - [x] 3.1 Write tests for new AWS settings fields and validation
  - [x] 3.2 Add AWS bearer token input field to settings panel
  - [x] 3.3 Add AWS Bedrock ModelID input field to settings panel
  - [x] 3.4 Add AWS region selector dropdown
  - [x] 3.5 Implement connection testing for direct AWS access
  - [x] 3.6 Add settings validation and error messaging
  - [x] 3.7 Verify all tests pass and settings work correctly

- [x] 4. Replace API Client Architecture
  - [x] 4.1 Write tests for updated clarification service integration
  - [x] 4.2 Update GTDClarificationService to use BedrockClient
  - [x] 4.3 Remove GTDAPIClient and all HTTP-based client code
  - [x] 4.4 Update service factory to create BedrockClient instances
  - [x] 4.5 Remove all server URL and localhost configuration references
  - [x] 4.6 Verify all tests pass and clarification workflow functions correctly

- [x] 5. Remove Server Dependencies and Documentation
  - [x] 5.2 Remove server-related settings and configuration
  - [x] 5.3 Update plugin README and installation instructions
  - [x] 5.4 Remove FastAPI server references from documentation
  - [x] 5.5 Add AWS bearer token setup instructions
  - [x] 5.6 Verify all tests pass and complete end-to-end functionality works
