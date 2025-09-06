# Spec Tasks

## Tasks

- [x] 1. Enhance AI Prompt Engineering for Metadata Detection
  - [x] 1.1 Write tests for context tag detection in clarification responses
  - [x] 1.2 Update clarification prompts to request context analysis (@computer, @phone, @errands, @home, @office, @anywhere)
  - [x] 1.3 Add time estimation instructions to prompts (#5m, #10m, #15m, #30m, #45m, #1h, #2h, #3h, #4h)
  - [x] 1.4 Test prompt changes with various inbox item types
  - [x] 1.5 Verify all tests pass

- [ ] 2. Implement Response Parsing for Context Tags and Time Estimates
  - [ ] 2.1 Write tests for metadata extraction from AI responses
  - [ ] 2.2 Create parsing logic to extract context tags from clarified text
  - [ ] 2.3 Add time estimate parsing with format validation
  - [ ] 2.4 Implement fallback handling when metadata is missing
  - [ ] 2.5 Verify all tests pass

- [ ] 3. Update Task Formatting for Tasks Plugin Compatibility
  - [ ] 3.1 Write tests for enhanced task format output
  - [ ] 3.2 Modify task formatting to include context tags in @tag format
  - [ ] 3.3 Add time estimates as hashtags compatible with Tasks plugin
  - [ ] 3.4 Ensure backward compatibility with existing task format
  - [ ] 3.5 Verify all tests pass

- [ ] 4. Add User Settings and Configuration Options
  - [ ] 4.1 Write tests for settings panel enhancements
  - [ ] 4.2 Add toggle settings for context detection feature
  - [ ] 4.3 Add toggle settings for time estimation feature
  - [ ] 4.4 Update settings UI to include new configuration options
  - [ ] 4.5 Verify all tests pass

- [ ] 5. Integration Testing and Quality Assurance
  - [ ] 5.1 Write integration tests for complete clarification workflow
  - [ ] 5.2 Test various inbox item types with new metadata features
  - [ ] 5.3 Verify Tasks plugin compatibility with enhanced output
  - [ ] 5.4 Test error handling and graceful degradation scenarios
  - [ ] 5.5 Run full test suite and ensure all tests pass