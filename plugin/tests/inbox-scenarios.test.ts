import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GTDClarificationService } from '../src/clarification-service';
import { GTDAPIClient } from '../src/api-client';
import { GTDSettings } from '../src/settings';

// Mock the API client
jest.mock('../src/api-client');

describe('Inbox Scenarios - Automated Testing', () => {
  let clarificationService: GTDClarificationService;
  let mockApiClient: jest.Mocked<GTDAPIClient>;
  let mockSettings: GTDSettings;

  beforeEach(() => {
    mockApiClient = {
      clarifyText: jest.fn(),
      testConnection: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as jest.Mocked<GTDAPIClient>;

    mockSettings = {
      backendUrl: 'http://localhost:8000',
      timeout: 5000,
      apiKey: 'test-api-key'
    };

    clarificationService = new GTDClarificationService(mockApiClient, mockSettings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Meeting Notes Scenarios', () => {
    it('should handle meeting notes with multiple action items', async () => {
      // Arrange
      const meetingNotes = `Meeting Notes - Project Alpha Review
      Attendees: John, Sarah, Mike
      
      - Need to follow up with client on requirements
      - Sarah will send updated timeline by Friday
      - Schedule follow-up meeting for next week
      - Mike to research new technology stack options
      `;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Follow up with client on requirements',
            context: '@calls',
            priority: 'high',
            time_estimate: '30m'
          },
          {
            type: 'waiting_for',
            action: 'Receive updated timeline from Sarah',
            due_date: '2024-01-12',
            tags: ['#waiting']
          },
          {
            type: 'next_action',
            action: 'Schedule follow-up meeting for next week',
            context: '@computer',
            time_estimate: '15m'
          },
          {
            type: 'next_action',
            action: 'Research new technology stack options',
            context: '@computer',
            project: 'Project Alpha',
            time_estimate: '2h'
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 150 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(meetingNotes, { inputType: 'meeting_notes' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(4);
      expect(result.actions[0].type).toBe('next_action');
      expect(result.actions[0].action).toBe('Follow up with client on requirements');
      expect(result.actions[1].type).toBe('waiting_for');
      expect(result.actions[1].tags).toContain('#waiting');
    });

    it('should handle meeting notes with no actionable items', async () => {
      // Arrange
      const meetingNotes = `Information sharing meeting
      - Discussed general market trends
      - Reviewed quarterly performance metrics
      - No specific actions identified
      `;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 50 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(meetingNotes, { inputType: 'meeting_notes' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('Email Scenarios', () => {
    it('should handle email with embedded action requests', async () => {
      // Arrange
      const emailContent = `Hi there,
      
      Hope you're doing well! I wanted to follow up on the proposal we discussed. 
      Can you please send me the updated pricing by end of week? Also, let's 
      schedule a call to go over the technical requirements.
      
      Looking forward to hearing from you!
      Best regards, John`;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Send updated pricing to John',
            due_date: '2024-01-12',
            context: '@computer',
            priority: 'high'
          },
          {
            type: 'next_action',
            action: 'Schedule call with John about technical requirements',
            context: '@calls',
            time_estimate: '15m'
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 120 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(emailContent, { inputType: 'email' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].action).toContain('Send updated pricing');
      expect(result.actions[1].action).toContain('Schedule call');
    });

    it('should handle spam/promotional emails with no actions', async () => {
      // Arrange
      const spamEmail = `🎉 AMAZING DEAL ALERT! 🎉
      Get 90% off everything in our store! Limited time only!
      Click here now to claim your discount!
      Unsubscribe here if you don't want these amazing deals...`;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 30 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(spamEmail, { inputType: 'email' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('General Notes Scenarios', () => {
    it('should handle brainstorming notes with mixed priority items', async () => {
      // Arrange
      const brainstormNotes = `Ideas for Q2 planning:
      - Maybe look into AI automation tools someday
      - URGENT: Fix the login bug that customers are reporting
      - Consider expanding to European markets
      - Call the vendor about pricing tomorrow
      - Someday maybe implement dark mode feature`;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            type: 'someday_maybe',
            action: 'Look into AI automation tools',
            tags: ['#research', '#someday']
          },
          {
            type: 'next_action',
            action: 'Fix login bug that customers are reporting',
            priority: 'highest',
            context: '@computer',
            time_estimate: '2h'
          },
          {
            type: 'someday_maybe',
            action: 'Expand to European markets',
            project: 'Business Development',
            tags: ['#expansion', '#someday']
          },
          {
            type: 'next_action',
            action: 'Call vendor about pricing',
            due_date: '2024-01-09',
            context: '@calls',
            priority: 'high'
          },
          {
            type: 'someday_maybe',
            action: 'Implement dark mode feature',
            project: 'UI Improvements',
            tags: ['#development', '#someday']
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 180 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(brainstormNotes, { inputType: 'general' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(5);
      expect(result.actions.filter(a => a.type === 'someday_maybe')).toHaveLength(3);
      expect(result.actions.filter(a => a.type === 'next_action')).toHaveLength(2);
      expect(result.actions.find(a => a.action.includes('login bug'))?.priority).toBe('highest');
    });

    it('should handle philosophical or abstract notes with no clear actions', async () => {
      // Arrange
      const abstractNotes = `Thoughts on productivity and time management:
      
      Time is our most precious resource. We often spend it without thinking about 
      the return on investment. The key to productivity isn't doing more things, 
      but doing the right things. Focus and intentionality matter more than speed.
      
      Interesting quote: "The way to get started is to quit talking and begin doing." - Walt Disney`;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 80 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(abstractNotes, { inputType: 'note' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle extremely long text input', async () => {
      // Arrange
      const longText = 'Very long text with action items. '.repeat(1000) + 'Call John tomorrow.';
      
      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Call John',
            due_date: '2024-01-09',
            context: '@calls'
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 500 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(longText);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it('should handle text with special characters and emojis', async () => {
      // Arrange
      const specialText = `🎯 Project Goals & Action Items 📋
      
      • Call client about 💰 pricing (ASAP!)
      • Review contract with ⚖️ legal team
      • Send 📧 follow-up email @tomorrow
      • 🤔 Think about Q2 strategy (maybe next month?)`;

      const mockApiResponse = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            type: 'next_action',
            action: 'Call client about pricing',
            priority: 'high',
            context: '@calls',
            time_estimate: '30m'
          },
          {
            type: 'next_action',
            action: 'Review contract with legal team',
            context: '@waiting',
            time_estimate: '1h'
          },
          {
            type: 'next_action',
            action: 'Send follow-up email',
            scheduled_date: '2024-01-09',
            context: '@computer',
            time_estimate: '15m'
          },
          {
            type: 'someday_maybe',
            action: 'Think about Q2 strategy',
            scheduled_date: '2024-02-01',
            tags: ['#strategy', '#someday']
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 140 }
      };

      mockApiClient.clarifyText.mockResolvedValue(mockApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(specialText);

      // Assert
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(4);
      expect(result.actions[0].action).not.toContain('💰');
      expect(result.actions[1].action).not.toContain('⚖️');
    });

    it('should handle malformed API responses gracefully', async () => {
      // Arrange
      const normalText = 'Call John tomorrow and send the report.';
      
      const malformedApiResponse = {
        status: 'success' as const,
        result: 'This is not valid JSON',
        metadata: { model: 'claude-3-sonnet', tokens_used: 50 }
      };

      mockApiClient.clarifyText.mockResolvedValue(malformedApiResponse);

      // Act
      const result = await clarificationService.clarifyInboxText(normalText);

      // Assert
      expect(result.success).toBe(false);
      expect(result.actions).toHaveLength(1); // Should contain fallback action
      expect(result.actions[0].action).toContain('Review and manually process');
      expect(result.actions[0].tags).toContain('#manual-review');
      expect(result.error).toContain('Failed to parse API response');
    });

    it('should handle empty or whitespace-only input', async () => {
      // Arrange
      const emptyInputs = ['', '   ', '\n\n\t  \n', '   \t\t   '];
      
      for (const emptyInput of emptyInputs) {
        // Act
        const result = await clarificationService.clarifyInboxText(emptyInput);

        // Assert
        expect(result.success).toBe(false);
        expect(result.actions).toHaveLength(0);
        expect(result.error).toContain('Input text cannot be empty');
      }
    });

    it('should handle API timeout scenarios', async () => {
      // Arrange
      const normalText = 'Call John tomorrow about the project.';
      
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockApiClient.clarifyText.mockRejectedValue(timeoutError);

      // Act
      const result = await clarificationService.clarifyInboxText(normalText);

      // Assert
      expect(result.success).toBe(false);
      expect(result.actions).toHaveLength(0);
      expect(result.error).toBe('Request timed out. Please check your connection and try again.');
    });

    it('should handle network connection failures', async () => {
      // Arrange
      const normalText = 'Send email to client about proposal.';
      
      const networkError = new Error('Network request failed');
      mockApiClient.clarifyText.mockRejectedValue(networkError);

      // Act
      const result = await clarificationService.clarifyInboxText(normalText);

      // Assert
      expect(result.success).toBe(false);
      expect(result.actions).toHaveLength(0);
      expect(result.error).toContain('Unable to connect to GTD service');
    });

    it('should validate and normalize action data from API', async () => {
      // Arrange
      const normalText = 'Call John tomorrow.';
      
      const apiResponseWithInvalidData = {
        status: 'success' as const,
        result: JSON.stringify([
          {
            // Missing action field - should cause validation error
            type: 'next_action',
            context: '@calls'
          },
          {
            // Invalid action type - should get normalized
            type: 'invalid_type',
            action: 'Valid action text',
            context: 'calls', // Missing @ prefix
            due_date: 'invalid-date',
            priority: 'super_high', // Invalid priority
            time_estimate: 'invalid-time'
          },
          {
            // Valid action
            type: 'next_action',
            action: 'Call John tomorrow',
            context: '@calls',
            tags: ['meeting', '#important'], // Mix of with/without # prefix
            time_estimate: '30m'
          }
        ]),
        metadata: { model: 'claude-3-sonnet', tokens_used: 100 }
      };

      mockApiClient.clarifyText.mockResolvedValue(apiResponseWithInvalidData);

      // Act
      const result = await clarificationService.clarifyInboxText(normalText);

      // Assert - Should handle validation gracefully
      expect(result.success).toBe(false); // First action fails validation
      expect(result.actions).toHaveLength(1); // Should contain fallback action
      expect(result.actions[0].action).toContain('Review and manually process');
    });
  });

  describe('Tasks Format Conversion Edge Cases', () => {
    it('should properly format actions with all metadata fields', async () => {
      // Arrange
      const clarificationResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Complete project proposal',
            context: '@computer',
            project: 'Client Work',
            due_date: '2024-01-15',
            scheduled_date: '2024-01-10',
            start_date: '2024-01-08',
            priority: 'high' as const,
            recurrence: 'every week',
            time_estimate: '#2h',
            tags: ['#important', '#client']
          }
        ],
        original_text: 'Work on proposal',
        processing_time_ms: 1000
      };

      // Act
      const taskLines = clarificationService.convertToTasksFormat(clarificationResult);

      // Assert
      expect(taskLines).toHaveLength(1);
      const taskLine = taskLines[0];
      expect(taskLine).toContain('- [ ] Complete project proposal');
      expect(taskLine).toContain('#2h'); // Time estimate
      expect(taskLine).toContain('📅 2024-01-15'); // Due date
      expect(taskLine).toContain('⏳ 2024-01-10'); // Scheduled date
      expect(taskLine).toContain('🛫 2024-01-08'); // Start date
      expect(taskLine).toContain('⬆️'); // High priority symbol
      expect(taskLine).toContain('🔁 every week'); // Recurrence
      expect(taskLine).toContain('[[Client Work]]'); // Project as wiki link
      expect(taskLine).toContain('@computer'); // Context
      expect(taskLine).toContain('#important #client'); // Tags
    });

    it('should handle actions with minimal metadata', async () => {
      // Arrange
      const clarificationResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Simple task',
            tags: []
          }
        ],
        original_text: 'Simple task',
        processing_time_ms: 500
      };

      // Act
      const taskLines = clarificationService.convertToTasksFormat(clarificationResult);

      // Assert
      expect(taskLines).toHaveLength(1);
      expect(taskLines[0]).toBe('- [ ] Simple task 🏁 delete');
    });

    it('should handle failed clarification results', async () => {
      // Arrange
      const failedResult = {
        success: false,
        actions: [],
        original_text: 'Some text',
        processing_time_ms: 100,
        error: 'API service unavailable'
      };

      // Act
      const taskLines = clarificationService.convertToTasksFormat(failedResult);

      // Assert
      expect(taskLines).toHaveLength(1);
      expect(taskLines[0]).toBe('- [ ] API service unavailable');
    });
  });
});