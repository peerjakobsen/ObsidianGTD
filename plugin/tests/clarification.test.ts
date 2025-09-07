import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Types for GTD clarification
interface GTDPromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

interface GTDActionType {
  type: 'next_action' | 'waiting_for' | 'someday_maybe';
  action: string;
  context?: string;
  project?: string;
  due_date?: string;
  tags: string[];
}

interface GTDClarificationResponse {
  success: boolean;
  actions: GTDActionType[];
  original_text: string;
  processing_time_ms: number;
}

interface APIResponse {
  success: boolean;
  response: {
    content: string;
    model: string;
    tokens_used: number;
    processing_time_ms: number;
  };
}

interface APIError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

describe('GTD Clarification System', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Prompt Template Generation', () => {
    it('should generate GTD-specific system prompt', () => {
      const generateSystemPrompt = (): string => {
        return `You are a Getting Things Done (GTD) assistant. Your role is to clarify incoming text and identify actionable next actions.

Key GTD principles to follow:
1. A next action is a specific, physical action that moves something forward
2. Each action should be clear and contextual - start with a verb
3. Identify what project/outcome each action relates to
4. Categorize items as: Next Actions, Waiting For, or Someday/Maybe
5. Add appropriate contexts (calls, errands, computer, etc.)

Response format: Return a JSON array of actions with type, action, context, project, and tags fields.`;
      };

      const systemPrompt = generateSystemPrompt();

      expect(systemPrompt).toContain('Getting Things Done (GTD)');
      expect(systemPrompt).toContain('next action');
      expect(systemPrompt).toContain('Next Actions, Waiting For, or Someday/Maybe');
      expect(systemPrompt).toContain('JSON array');
      expect(systemPrompt.length).toBeGreaterThan(100);
    });

    it('should generate user prompt with inbox text', () => {
      const generateUserPrompt = (inboxText: string): string => {
        return `Please clarify this inbox item using GTD methodology:

"${inboxText}"

Break this down into specific, actionable next actions. For each action, determine:
- What exactly needs to be done (specific physical action)
- What category it belongs to (next action, waiting for, someday/maybe)
- What context is needed (@calls, @errands, @computer, etc.)
- What project or outcome it relates to
- Any due dates or scheduling needed

Return the results as a JSON array.`;
      };

      const inboxText = "Need to plan team meeting for next week";
      const userPrompt = generateUserPrompt(inboxText);

      expect(userPrompt).toContain(inboxText);
      expect(userPrompt).toContain('GTD methodology');
      expect(userPrompt).toContain('JSON array');
      expect(userPrompt).toContain('@calls, @errands, @computer');
    });

    it('should handle different input types with context-specific prompts', () => {
      const generateContextualPrompt = (text: string, inputType: string): GTDPromptTemplate => {
        const baseSystemPrompt = `You are a GTD assistant specializing in ${inputType} clarification.`;
        
        let contextualGuidance = '';
        switch (inputType) {
          case 'email':
            contextualGuidance = 'Focus on identifying responses needed, actions to take, and information to file.';
            break;
          case 'meeting_notes':
            contextualGuidance = 'Extract action items, follow-ups, and decisions that require further action.';
            break;
          case 'note':
            contextualGuidance = 'Identify any tasks, ideas to develop, or information to organize.';
            break;
          default:
            contextualGuidance = 'Clarify any actionable items using standard GTD methodology.';
        }

        return {
          systemPrompt: `${baseSystemPrompt} ${contextualGuidance}`,
          userPrompt: `Clarify this ${inputType}: "${text}"`
        };
      };

      const emailPrompt = generateContextualPrompt('Client wants quote by Friday', 'email');
      expect(emailPrompt.systemPrompt).toContain('email clarification');
      expect(emailPrompt.systemPrompt).toContain('responses needed');
      expect(emailPrompt.userPrompt).toContain('Clarify this email');

      const meetingPrompt = generateContextualPrompt('Discussed budget approval process', 'meeting_notes');
      expect(meetingPrompt.systemPrompt).toContain('meeting_notes clarification');
      expect(meetingPrompt.systemPrompt).toContain('action items');
      expect(meetingPrompt.userPrompt).toContain('Clarify this meeting_notes');
    });

    it('should optimize prompts for action categorization', () => {
      const generateOptimizedPrompt = (text: string): string => {
        const hasTimeReference = /\b(today|tomorrow|next week|friday|deadline|urgent)\b/i.test(text);
        const hasPersonReference = /\b(call|email|ask|tell|meeting with)\b/i.test(text);
        const hasLongTermIndicator = /\b(someday|maybe|consider|think about|explore)\b/i.test(text);

        let optimization = '';
        if (hasTimeReference) {
          optimization += ' Pay special attention to time-sensitive actions and due dates.';
        }
        if (hasPersonReference) {
          optimization += ' Identify actions that depend on other people (Waiting For items).';
        }
        if (hasLongTermIndicator) {
          optimization += ' Consider if some items belong in Someday/Maybe rather than immediate next actions.';
        }

        return `Standard GTD clarification prompt.${optimization}`;
      };

      const urgentText = 'Call client about urgent deadline by Friday';
      const optimizedPrompt = generateOptimizedPrompt(urgentText);
      expect(optimizedPrompt).toContain('time-sensitive actions');
      expect(optimizedPrompt).toContain('depend on other people');

      const futureText = 'Someday maybe learn Spanish';
      const futurePrompt = generateOptimizedPrompt(futureText);
      expect(futurePrompt).toContain('Someday/Maybe');
    });
  });

  describe('API Response Parsing', () => {
    it('should parse successful API response', () => {
      const parseAPIResponse = (response: APIResponse): GTDClarificationResponse => {
        if (!response.success) {
          throw new Error('API request failed');
        }

        let actions: GTDActionType[];
        try {
          actions = JSON.parse(response.response.content);
        } catch (error) {
          throw new Error('Failed to parse response content as JSON');
        }

        return {
          success: true,
          actions: actions,
          original_text: 'Original inbox text',
          processing_time_ms: response.response.processing_time_ms
        };
      };

      const mockAPIResponse: APIResponse = {
        success: true,
        response: {
          content: JSON.stringify([
            {
              type: 'next_action',
              action: 'Call John about project budget',
              context: '@calls',
              project: 'Website Redesign',
              tags: ['#project-alpha']
            }
          ]),
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 150,
          processing_time_ms: 2500
        }
      };

      const result = parseAPIResponse(mockAPIResponse);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('next_action');
      expect(result.actions[0].action).toBe('Call John about project budget');
      expect(result.actions[0].context).toBe('@calls');
      expect(result.processing_time_ms).toBe(2500);
    });

    it('should handle multiple actions in response', () => {
      const parseMultipleActions = (apiResponse: APIResponse): GTDActionType[] => {
        const content = JSON.parse(apiResponse.response.content);
        return content.map((action: any) => ({
          type: action.type || 'next_action',
          action: action.action,
          context: action.context || '',
          project: action.project || '',
          due_date: action.due_date || '',
          tags: action.tags || []
        }));
      };

      const multiActionResponse: APIResponse = {
        success: true,
        response: {
          content: JSON.stringify([
            {
              type: 'next_action',
              action: 'Draft proposal outline',
              context: '@computer',
              project: 'Client Proposal',
              tags: ['#urgent']
            },
            {
              type: 'waiting_for',
              action: 'Approval from manager on budget',
              context: '@waiting',
              project: 'Client Proposal',
              tags: ['#waiting']
            },
            {
              type: 'someday_maybe',
              action: 'Consider automated proposal system',
              context: '@someday',
              project: 'Process Improvement',
              tags: ['#maybe']
            }
          ]),
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 250,
          processing_time_ms: 3500
        }
      };

      const actions = parseMultipleActions(multiActionResponse);

      expect(actions).toHaveLength(3);
      expect(actions[0].type).toBe('next_action');
      expect(actions[1].type).toBe('waiting_for');
      expect(actions[2].type).toBe('someday_maybe');
      expect(actions[0].tags).toContain('#urgent');
      expect(actions[1].tags).toContain('#waiting');
      expect(actions[2].tags).toContain('#maybe');
    });

    it('should handle API error responses', () => {
      const handleAPIError = (response: APIError): never => {
        const errorMessage = response.error || 'Unknown API error';
        throw new Error(`API Error: ${errorMessage}`);
      };

      const errorResponse: APIError = {
        success: false,
        error: 'Invalid API key',
        code: 'AUTH_ERROR'
      };

      expect(() => {
        handleAPIError(errorResponse);
      }).toThrow('API Error: Invalid API key');
    });

    it('should validate action structure', () => {
      const validateAction = (action: any): GTDActionType => {
        if (!action.action || typeof action.action !== 'string') {
          throw new Error('Action must have a valid action string');
        }

        if (action.type && !['next_action', 'waiting_for', 'someday_maybe'].includes(action.type)) {
          throw new Error(`Invalid action type: ${action.type}`);
        }

        return {
          type: action.type || 'next_action',
          action: action.action,
          context: action.context || '',
          project: action.project || '',
          due_date: action.due_date || '',
          tags: Array.isArray(action.tags) ? action.tags : []
        };
      };

      const validAction = {
        type: 'next_action',
        action: 'Review contract terms',
        context: '@computer',
        tags: ['#legal']
      };

      const result = validateAction(validAction);
      expect(result.action).toBe('Review contract terms');
      expect(result.type).toBe('next_action');

      const invalidAction = {
        type: 'invalid_type',
        action: ''
      };

      expect(() => {
        validateAction(invalidAction);
      }).toThrow('Action must have a valid action string');
    });

    it('should handle malformed JSON responses', () => {
      const parseWithErrorHandling = (apiResponse: APIResponse): GTDClarificationResponse => {
        let actions: GTDActionType[];
        
        try {
          actions = JSON.parse(apiResponse.response.content);
          if (!Array.isArray(actions)) {
            throw new Error('Response content is not an array');
          }
        } catch (parseError) {
          // Fallback: try to extract actions from plain text response
          const fallbackActions = [{
            type: 'next_action' as const,
            action: 'Review and manually process the following text',
            context: '@computer',
            project: 'Inbox Processing',
            due_date: '',
            tags: ['#manual-review']
          }];
          
          return {
            success: false,
            actions: fallbackActions,
            original_text: 'Failed to parse response',
            processing_time_ms: apiResponse.response.processing_time_ms
          };
        }

        return {
          success: true,
          actions: actions,
          original_text: 'Original text',
          processing_time_ms: apiResponse.response.processing_time_ms
        };
      };

      const malformedResponse: APIResponse = {
        success: true,
        response: {
          content: 'This is not valid JSON {broken}',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 100,
          processing_time_ms: 1500
        }
      };

      const result = parseWithErrorHandling(malformedResponse);
      
      expect(result.success).toBe(false);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].action).toContain('Review and manually process');
      expect(result.actions[0].tags).toContain('#manual-review');
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle empty inbox text', () => {
      const handleEmptyText = (text: string): string | null => {
        const trimmedText = text.trim();
        if (!trimmedText) {
          return null;
        }
        return trimmedText;
      };

      expect(handleEmptyText('')).toBeNull();
      expect(handleEmptyText('   \n\t   ')).toBeNull();
      expect(handleEmptyText('Valid text')).toBe('Valid text');
    });

    it('should handle very long text inputs', () => {
      const validateTextLength = (text: string, maxLength: number = 10000): boolean => {
        return text.length <= maxLength;
      };

      const longText = 'A'.repeat(15000);
      expect(validateTextLength(longText)).toBe(false);
      
      const normalText = 'Normal length text';
      expect(validateTextLength(normalText)).toBe(true);
    });

    it('should handle network timeout scenarios', async () => {
      const makeAPIRequestWithTimeout = (timeoutMs: number): Promise<APIResponse> => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, timeoutMs);

          // Simulate fetch that never completes
          mockFetch.mockImplementation(() => new Promise(() => {}));
        });
      };

      await expect(
        makeAPIRequestWithTimeout(100)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle API server unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const makeAPIRequest = async (url: string, data: any): Promise<APIResponse> => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return await response.json();
        } catch (error) {
          throw new Error(`API server unavailable: ${error.message}`);
        }
      };

      await expect(
        makeAPIRequest('https://bedrock-runtime.us-east-1.amazonaws.com', {})
      ).rejects.toThrow('API server unavailable');
    });
  });
});
