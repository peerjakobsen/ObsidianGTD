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

- [ ] 2. Create AWS Bedrock Client Implementation
  - [ ] 2.1 Write tests for BedrockClient class functionality
  - [ ] 2.2 Create BedrockClient class with BedrockRuntimeClient integration
  - [ ] 2.3 Implement ConverseCommand for GTD clarification requests
  - [ ] 2.4 Add bearer token authentication configuration
  - [ ] 2.5 Implement error handling and retry logic for AWS SDK calls
  - [ ] 2.6 Verify all tests pass and functionality matches current behavior

- [ ] 3. Update Settings Panel for AWS Configuration
  - [ ] 3.1 Write tests for new AWS settings fields and validation
  - [ ] 3.2 Add AWS bearer token input field to settings panel
  - [ ] 3.3 Add AWS region selector dropdown
  - [ ] 3.4 Implement connection testing for direct AWS access
  - [ ] 3.5 Add settings validation and error messaging
  - [ ] 3.6 Verify all tests pass and settings work correctly

- [ ] 4. Replace API Client Architecture
  - [ ] 4.1 Write tests for updated clarification service integration
  - [ ] 4.2 Update GTDClarificationService to use BedrockClient
  - [ ] 4.3 Remove GTDAPIClient and all HTTP-based client code
  - [ ] 4.4 Update service factory to create BedrockClient instances
  - [ ] 4.5 Remove all server URL and localhost configuration references
  - [ ] 4.6 Verify all tests pass and clarification workflow functions correctly

- [ ] 5. Remove Server Dependencies and Documentation
  - [ ] 5.1 Write tests to ensure plugin works without server dependencies
  - [ ] 5.2 Remove server-related settings and configuration
  - [ ] 5.3 Update plugin README and installation instructions
  - [ ] 5.4 Remove FastAPI server references from documentation
  - [ ] 5.5 Add AWS bearer token setup instructions
  - [ ] 5.6 Verify all tests pass and complete end-to-end functionality works