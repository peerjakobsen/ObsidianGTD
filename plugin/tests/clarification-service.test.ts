import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
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

describe('GTDClarificationService - Metadata Extraction', () => {
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

  describe('Metadata Extraction from AI Responses', () => {
    describe('Context Tag Detection', () => {
      it('should extract and validate predefined context tags', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test inbox text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Send email to client',
              context: '@computer',
              time_estimate: '#30m',
              tags: ['#urgent']
            },
            {
              type: 'next_action', 
              action: 'Call supplier for quote',
              context: '@phone',
              time_estimate: '#15m',
              tags: ['#followup']
            },
            {
              type: 'next_action',
              action: 'Pick up documents from office',
              context: '@errands', 
              time_estimate: '#45m',
              tags: ['#admin']
            },
            {
              type: 'next_action',
              action: 'Organize home office',
              context: '@home',
              time_estimate: '#2h',
              tags: ['#organizing']
            },
            {
              type: 'next_action',
              action: 'Attend team meeting',
              context: '@office',
              time_estimate: '#1h',
              tags: ['#meeting']
            },
            {
              type: 'next_action',
              action: 'Review quarterly reports',
              context: '@anywhere',
              time_estimate: '#1h',
              tags: ['#review']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 300,
            processing_time_ms: 2000
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test inbox text');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(6);

        // Verify context tags are correctly extracted
        expect(result.actions[0].context).toBe('@computer');
        expect(result.actions[1].context).toBe('@phone');  
        expect(result.actions[2].context).toBe('@errands');
        expect(result.actions[3].context).toBe('@home');
        expect(result.actions[4].context).toBe('@office');
        expect(result.actions[5].context).toBe('@anywhere');
      });

      it('should handle invalid context tags with fallback', async () => {
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
              action: 'Invalid context task',
              context: '@invalid_context', // Not in predefined list
              tags: ['#test']
            },
            {
              type: 'next_action',
              action: 'Missing context task',
              // No context provided
              tags: ['#test']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 100,
            processing_time_ms: 1000
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(2);
        
        // Should accept the invalid context as-is but ensure @ prefix
        expect(result.actions[0].context).toBe('@invalid_context');
        
        // Should fall back to inferred context for missing context
        expect(result.actions[1].context).toBe('@computer'); // From getSuggestedContexts mock
      });

      it('should normalize context tags by adding @ prefix when missing', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Task without @ prefix',
              context: 'computer', // Missing @ prefix
              tags: ['#test']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 50,
            processing_time_ms: 800
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions[0].context).toBe('@computer');
      });
    });

    describe('Time Estimate Parsing', () => {
      it('should extract and validate time estimates in correct format', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Quick task',
              context: '@computer',
              time_estimate: '#5m',
              tags: ['#quick']
            },
            {
              type: 'next_action',
              action: 'Medium task',
              context: '@phone',
              time_estimate: '#30m',
              tags: ['#medium']
            },
            {
              type: 'next_action',
              action: 'Long task',
              context: '@home',
              time_estimate: '#2h',
              tags: ['#long']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 200,
            processing_time_ms: 1500
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(3);
        
        // Verify time estimates are correctly extracted (without # prefix internally)
        expect(result.actions[0].time_estimate).toBe('5m');
        expect(result.actions[1].time_estimate).toBe('30m');
        expect(result.actions[2].time_estimate).toBe('2h');
      });

      it('should validate time estimate format and reject invalid formats', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt', 
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Task with invalid time format',
              context: '@computer',
              time_estimate: '30 minutes', // Invalid format
              tags: ['#test']
            },
            {
              type: 'next_action',
              action: 'Task with another invalid format',
              context: '@phone',
              time_estimate: '#2.5h', // Invalid format (decimal)
              tags: ['#test']
            },
            {
              type: 'next_action',
              action: 'Task with valid format',
              context: '@home',
              time_estimate: '#45m', // Valid format
              tags: ['#test']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 150,
            processing_time_ms: 1200
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(3);
        
        // Invalid time estimates should be cleared
        expect(result.actions[0].time_estimate).toBe(''); // Invalid format cleared
        expect(result.actions[1].time_estimate).toBe(''); // Invalid format cleared
        expect(result.actions[2].time_estimate).toBe('45m'); // Valid format preserved
      });

      it('should handle missing time estimates gracefully', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Task without time estimate',
              context: '@computer',
              // No time_estimate field
              tags: ['#test']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 75,
            processing_time_ms: 900
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions[0].time_estimate).toBe(''); // Should be empty string when missing
      });

      it('should normalize time estimates by adding # prefix when missing', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Test text'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Task with time but no # prefix',
              context: '@computer',
              time_estimate: '15m', // Missing # prefix but valid format
              tags: ['#test']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 60,
            processing_time_ms: 800
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Test text');

        expect(result.success).toBe(true);
        expect(result.actions[0].time_estimate).toBe('15m'); // Should preserve valid format even without #
      });
    });

    describe('Combined Metadata Extraction', () => {
      it('should extract both context tags and time estimates together', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Complex task with both metadata'
        });

        GTDPromptGenerator.generatePrompt.mockReturnValue({
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt'
        });

        const mockAPIResponse = {
          result: JSON.stringify([
            {
              type: 'next_action',
              action: 'Research competitors online',
              context: '@computer',
              time_estimate: '#1h',
              project: 'Market Analysis',
              tags: ['#research', '#competitive-analysis']
            },
            {
              type: 'waiting_for',
              action: 'Approval from legal team',
              context: '@anywhere',
              time_estimate: '#5m',
              project: 'Product Launch',
              tags: ['#waiting', '#legal']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 180,
            processing_time_ms: 1400
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Complex task with both metadata');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(2);
        
        // Verify both context and time metadata extracted correctly
        expect(result.actions[0].context).toBe('@computer');
        expect(result.actions[0].time_estimate).toBe('1h');
        expect(result.actions[0].project).toBe('Market Analysis');
        
        expect(result.actions[1].context).toBe('@anywhere');
        expect(result.actions[1].time_estimate).toBe('5m');
        expect(result.actions[1].project).toBe('Product Launch');
        expect(result.actions[1].tags).toContain('#waiting'); // Auto-added for waiting_for
      });

      it('should handle partial metadata and provide fallbacks', async () => {
        const { GTDPromptGenerator } = require('../src/gtd-prompts');
        
        GTDPromptGenerator.validateInput.mockReturnValue({
          isValid: true,
          sanitizedText: 'Partial metadata task'
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
              action: 'Task with context only',
              context: '@phone',
              // No time_estimate
              tags: ['#partial']
            },
            {
              type: 'next_action', 
              action: 'Task with time only',
              // No context
              time_estimate: '#45m',
              tags: ['#partial']
            },
            {
              type: 'next_action',
              action: 'Task with neither',
              // No context or time_estimate
              tags: ['#minimal']
            }
          ]),
          status: 'success',
          metadata: {
            model: 'test-model',
            tokens_used: 120,
            processing_time_ms: 1100
          }
        };

        mockApiClient.clarifyText.mockResolvedValue(mockAPIResponse);

        const result = await service.clarifyInboxText('Partial metadata task');

        expect(result.success).toBe(true);
        expect(result.actions).toHaveLength(3);
        
        // First action: has context, missing time
        expect(result.actions[0].context).toBe('@phone');
        expect(result.actions[0].time_estimate).toBe('');
        
        // Second action: has time, missing context (should get fallback)
        expect(result.actions[1].context).toBe('@computer'); // From fallback
        expect(result.actions[1].time_estimate).toBe('45m');
        
        // Third action: missing both (should get context fallback, empty time)
        expect(result.actions[2].context).toBe('@computer'); // From fallback  
        expect(result.actions[2].time_estimate).toBe('');
      });
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