import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDClarificationService, GTDActionType, ClarificationResult, createClarificationService } from '../src/clarification-service';
import { GTDAPIClient } from '../src/api-client';
import { GTDSettings } from '../src/settings';

// Mock the dependencies
jest.mock('../src/api-client');
jest.mock('../src/gtd-prompts');

describe('GTDClarificationService', () => {
  let service: GTDClarificationService;
  let mockApiClient: jest.Mocked<GTDAPIClient>;
  let mockSettings: GTDSettings;

  beforeEach(() => {
    // Create mock settings
    mockSettings = {
      backendUrl: 'http://localhost:8000',
      timeout: 30000,
      apiKey: 'test-api-key'
    };

    // Create mock API client
    mockApiClient = {
      clarifyText: jest.fn(),
      testConnection: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as any;

    // Mock the GTDPromptGenerator methods
    const { GTDPromptGenerator } = require('../src/gtd-prompts');
    GTDPromptGenerator.validateInput = jest.fn();
    GTDPromptGenerator.generatePrompt = jest.fn();
    GTDPromptGenerator.getSuggestedContexts = jest.fn();

    service = new GTDClarificationService(mockApiClient, mockSettings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Clarification', () => {
    it('should successfully clarify inbox text with multiple actions', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      // Mock validation
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Call John about project and send email to team'
      });

      // Mock prompt generation
      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'You are a GTD assistant.',
        userPrompt: 'Clarify this text: Call John about project and send email to team'
      });

      // Mock API response
      const mockAPIResponse = {
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Call John about project budget',
            context: '@calls',
            project: 'Website Redesign',
            tags: ['#urgent']
          },
          {
            type: 'next_action',
            action: 'Send status email to team',
            context: '@computer',
            project: 'Website Redesign',
            tags: ['#communication']
          }
        ]),
        status: 'success',
        metadata: {
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 250,
          processing_time_ms: 2500
        }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

      const result = await service.clarifyInboxText('Call John about project and send email to team');

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].action).toBe('Call John about project budget');
      expect(result.actions[0].type).toBe('next_action');
      expect(result.actions[0].context).toBe('@calls');
      expect(result.actions[1].action).toBe('Send status email to team');
      expect(result.actions[1].context).toBe('@computer');
      expect(result.model_used).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
      expect(result.tokens_used).toBe(250);
    });

    it('should handle different action types', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Mixed actions text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      const mockAPIResponse = {
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Call client',
            context: 'calls'
          },
          {
            type: 'waiting_for',
            action: 'Approval from manager',
            context: 'waiting'
          },
          {
            type: 'someday_maybe',
            action: 'Learn new technology',
            context: 'computer'
          }
        ]),
        status: 'success',
        metadata: {
          model: 'test-model',
          tokens_used: 150,
          processing_time_ms: 1500
        }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

      const result = await service.clarifyInboxText('Mixed actions text');

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(3);
      expect(result.actions[0].type).toBe('next_action');
      expect(result.actions[1].type).toBe('waiting_for');
      expect(result.actions[2].type).toBe('someday_maybe');

      // Check automatic tags
      expect(result.actions[1].tags).toContain('#waiting');
      expect(result.actions[2].tags).toContain('#someday');
    });

    it('should normalize contexts and tags', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Test text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      GTDPromptGenerator.getSuggestedContexts.mockReturnValue(['@computer']);

      const mockAPIResponse = {
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Test action',
            context: 'calls', // Missing @ prefix
            tags: ['urgent', '#priority'] // Mixed tag formats
          }
        ]),
        status: 'success',
        metadata: {
          model: 'test-model',
          tokens_used: 50,
          processing_time_ms: 1000
        }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

      const result = await service.clarifyInboxText('Test text');

      expect(result.success).toBe(true);
      expect(result.actions[0].context).toBe('@calls'); // Should add @ prefix
      expect(result.actions[0].tags).toContain('#urgent'); // Should normalize tags
      expect(result.actions[0].tags).toContain('#priority');
      expect(result.actions[0].tags).toContain('#task'); // Should add default #task tag
    });
  });

  describe('Error Handling', () => {
    it('should handle input validation errors', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: false,
        error: 'Input text cannot be empty'
      });

      const result = await service.clarifyInboxText('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Input text cannot be empty');
      expect(result.actions).toHaveLength(0);
      expect(mockApiClient.clarifyText).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Valid text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      const apiError = new Error('API request failed');
      mockApiClient.clarifyText.mockRejectedValue(apiError);

      const result = await service.clarifyInboxText('Valid text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error: API request failed');
      expect(result.actions).toHaveLength(0);
    });

    it('should handle malformed JSON responses', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Valid text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      const mockAPIResponse = {
        result: 'Invalid JSON {broken}',
        status: 'success',
        metadata: {
          model: 'test-model',
          tokens_used: 50,
          processing_time_ms: 1000
        }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

      const result = await service.clarifyInboxText('Valid text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse API response');
      expect(result.actions).toHaveLength(1); // Should have fallback action
      expect(result.actions[0].action).toContain('Review and manually process');
      expect(result.actions[0].tags).toContain('#manual-review');
    });

    it('should handle non-array API responses', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Valid text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      const mockAPIResponse = {
        result: JSON.stringify({ message: 'Not an array' }),
        status: 'success',
        metadata: {
          model: 'test-model',
          tokens_used: 50,
          processing_time_ms: 1000
        }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

      const result = await service.clarifyInboxText('Valid text');

      expect(result.success).toBe(false);
      expect(result.actions).toHaveLength(1); // Fallback action
      expect(result.actions[0].tags).toContain('#parse-error');
    });
  });

  describe('Tasks Format Conversion', () => {
    it('should convert actions to Obsidian Tasks format', () => {
      const mockResult: ClarificationResult = {
        success: true,
        actions: [
          {
            type: 'next_action',
            action: 'Call John about project',
            context: '@calls',
            project: 'Website Redesign',
            due_date: '2024-03-15',
            tags: ['#urgent']
          },
          {
            type: 'waiting_for',
            action: 'Approval from manager',
            context: '@waiting',
            project: '',
            tags: ['#waiting']
          }
        ],
        original_text: 'Original text',
        processing_time_ms: 1000
      };

      const taskLines = service.convertToTasksFormat(mockResult);

      expect(taskLines).toHaveLength(2);
      expect(taskLines[0]).toBe('- [ ] Call John about project 📅 2024-03-15 [[Website Redesign]] @calls #urgent 🏁 delete');
      expect(taskLines[1]).toBe('- [ ] Approval from manager @waiting #waiting 🏁 delete');
    });

    it('should handle failed clarification in task format', () => {
      const failedResult: ClarificationResult = {
        success: false,
        actions: [],
        original_text: 'Failed text',
        processing_time_ms: 1000,
        error: 'API connection failed'
      };

      const taskLines = service.convertToTasksFormat(failedResult);

      expect(taskLines).toHaveLength(1);
      expect(taskLines[0]).toBe('- [ ] API connection failed');
    });

    it('should handle empty actions in task format', () => {
      const emptyResult: ClarificationResult = {
        success: true,
        actions: [],
        original_text: 'Empty result',
        processing_time_ms: 1000
      };

      const taskLines = service.convertToTasksFormat(emptyResult);

      expect(taskLines).toHaveLength(1);
      expect(taskLines[0]).toBe('- [ ] No actions generated');
    });
  });

  describe('Service Management', () => {
    it('should test connection', async () => {
      const mockConnectionResult = {
        success: true,
        message: 'Connection successful',
        responseTime: 150
      };

      mockApiClient.testConnection.mockResolvedValue(mockConnectionResult);

      const result = await service.testConnection();

      expect(result).toEqual(mockConnectionResult);
      expect(mockApiClient.testConnection).toHaveBeenCalled();
    });

    it('should update settings', () => {
      const newSettings: GTDSettings = {
        backendUrl: 'http://new-url:8000',
        timeout: 60000,
        apiKey: 'new-api-key'
      };

      service.updateSettings(newSettings);

      expect(mockApiClient.updateConfig).toHaveBeenCalledWith({
        backendUrl: 'http://new-url:8000',
        timeout: 60000,
        apiKey: 'new-api-key'
      });
    });

    it('should provide service info', () => {
      mockApiClient.getConfig.mockReturnValue({
        backendUrl: 'http://localhost:8000',
        timeout: 30000,
        hasApiKey: true
      });

      const info = service.getServiceInfo();

      expect(info.hasValidConfig).toBe(true);
      expect(info.backendUrl).toBe('http://localhost:8000');
      expect(info.hasApiKey).toBe(true);
      expect(info.timeout).toBe(30000);
    });
  });

  describe('Options Handling', () => {
    it('should pass clarification options to API client', async () => {
      const { GTDPromptGenerator } = require('../src/gtd-prompts');
      
      GTDPromptGenerator.validateInput.mockReturnValue({
        isValid: true,
        sanitizedText: 'Test text'
      });

      GTDPromptGenerator.generatePrompt.mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      });

      mockApiClient.clarifyText.mockResolvedValue({
        result: '[]',
        status: 'success',
        metadata: {
          model: 'test-model',
          tokens_used: 0,
          processing_time_ms: 1000
        }
      });

      await service.clarifyInboxText('Test text', {
        inputType: 'email',
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
        max_tokens: 500,
        temperature: 0.3
      });

      expect(GTDPromptGenerator.generatePrompt).toHaveBeenCalledWith('Test text', 'email');
      expect(mockApiClient.clarifyText).toHaveBeenCalledWith(
        expect.any(String)
      );
    });
  });
});

describe('Factory Function', () => {
  it('should create clarification service with settings', () => {
    const settings: GTDSettings = {
      backendUrl: 'http://localhost:8000',
      timeout: 30000,
      apiKey: 'test-key'
    };

    const service = createClarificationService(settings);

    expect(service).toBeInstanceOf(GTDClarificationService);
  });
});