import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ObsidianGTDPlugin from '../src/main';
import { GTDClarificationService } from '../src/clarification-service';

// Mock the Obsidian APIs
jest.mock('obsidian');

/**
 * User Acceptance Tests for GTD Clarification Workflows
 * 
 * These tests simulate real user interactions and workflows to ensure
 * the plugin behaves correctly from an end-user perspective.
 */
describe('User Acceptance Tests - GTD Clarification Workflows', () => {
  let plugin: ObsidianGTDPlugin;
  let mockApp: any;
  let mockEditor: any;
  let mockView: any;
  let mockClarificationService: jest.Mocked<GTDClarificationService>;

  beforeEach(() => {
    // Setup mock Obsidian environment
    mockEditor = {
      getSelection: jest.fn(),
      getCursor: jest.fn(),
      replaceRange: jest.fn(),
      setValue: jest.fn(),
      getValue: jest.fn()
    };

    mockView = {
      editor: mockEditor,
      file: { path: 'inbox.md' }
    };

    mockApp = {
      workspace: {
        getActiveViewOfType: jest.fn().mockReturnValue(mockView)
      }
    };

    // Setup plugin
    plugin = new ObsidianGTDPlugin(mockApp, { id: 'obsidian-gtd', name: 'GTD Assistant', version: '1.0.0' });
    
    // Explicitly set the app property to ensure it's available
    (plugin as any).app = mockApp;
    
    // Mock plugin methods to prevent actual initialization
    (plugin as any).addCommand = jest.fn().mockReturnValue({});
    (plugin as any).addRibbonIcon = jest.fn().mockReturnValue({ addClass: jest.fn() });
    (plugin as any).addSettingTab = jest.fn();
    (plugin as any).loadData = jest.fn().mockImplementation(() => Promise.resolve({}));
    (plugin as any).saveData = jest.fn().mockImplementation(() => Promise.resolve());
    
    // Setup mock service
    mockClarificationService = {
      clarifyInboxText: jest.fn(),
      convertToTasksFormat: jest.fn(),
      testConnection: jest.fn(),
      updateSettings: jest.fn(),
      getServiceInfo: jest.fn().mockReturnValue({ 
        hasValidConfig: true, 
        backendUrl: 'http://localhost:8000',
        hasApiKey: true,
        timeout: 30000
      })
    } as any;
    
    // Replace plugin service with mock
    (plugin as any).clarificationService = mockClarificationService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UAT-001: Daily Inbox Processing', () => {
    it('should allow user to process a typical daily inbox entry', async () => {
      // Scenario: User has selected some text from their daily inbox and wants to clarify it using GTD

      // Given: User has some inbox text selected
      const inboxText = `Email from client: Need to review the contract and get back to them by Friday. 
      Also mentioned they want to schedule a demo call next week.`;
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockEditor.getCursor.mockReturnValue({ line: 10, ch: 0 });
      
      // Mock successful clarification
      const expectedResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Review contract from client',
            due_date: '2024-01-12',
            context: '@computer',
            priority: 'high' as const,
            time_estimate: '#1h',
            tags: ['#client', '#contracts']
          },
          {
            type: 'next_action' as const,
            action: 'Schedule demo call with client for next week',
            context: '@calls',
            time_estimate: '#15m',
            tags: ['#client', '#demo']
          }
        ],
        original_text: inboxText,
        processing_time_ms: 1200
      };

      const expectedTasksFormat = [
        '- [ ] Review contract from client #1h 📅 2024-01-12 ⬆️ @computer #client #contracts',
        '- [ ] Schedule demo call with client for next week #15m @calls #client #demo'
      ];

      mockClarificationService.clarifyInboxText.mockResolvedValue(expectedResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue(expectedTasksFormat);

      // When: User triggers the clarification process
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: The service should process the text and convert to task format
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockClarificationService.convertToTasksFormat).toHaveBeenCalledWith(expectedResult);
      
      // And: Tasks should be inserted in the editor at cursor position
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n' + expectedTasksFormat.join('\n') + '\n',
        { line: 10, ch: 0 }
      );
    });

    it('should handle user workflow when no actionable items are found', async () => {
      // Scenario: User selects text that contains no actionable items
      
      const nonActionableText = `Just a note about the weather today. It was quite pleasant outside and I enjoyed my walk in the park.`;
      
      mockEditor.getSelection.mockReturnValue(nonActionableText);
      
      const noActionsResult = {
        success: true,
        actions: [],
        original_text: nonActionableText,
        processing_time_ms: 800,
        error: undefined
      };

      mockClarificationService.clarifyInboxText.mockResolvedValue(noActionsResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue(['- [ ] No actionable items found in the selected text.']);

      // When: User processes non-actionable text
      await (plugin as any).clarifyInboxText(nonActionableText);

      // Then: Service should be called but no tasks inserted
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(nonActionableText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });
  });

  describe('UAT-002: Meeting Notes Processing', () => {
    it('should handle complex meeting notes with multiple participants and action items', async () => {
      // Scenario: User processes comprehensive meeting notes with various action types

      const meetingNotes = `Team Weekly Standup - January 8, 2024
      
      Attendees: Alice (PM), Bob (Dev), Carol (Design), David (QA)
      
      Alice's Updates:
      - Completed user research analysis
      - Need Bob to review the authentication code by EOD Friday
      - Waiting for legal approval on new privacy policy
      
      Bob's Updates:
      - Fixed critical bug in payment system
      - Will implement Alice's auth requirements this week
      - Need to schedule code review session with team
      
      Carol's Updates:
      - Finished mockups for dashboard redesign
      - Need feedback from Alice on user flow by Thursday
      - Planning to start prototype next week
      
      David's Updates:
      - Completed testing on mobile app
      - Found 3 minor UI issues that need fixing
      - Will coordinate with Carol on design QA process
      
      Action Items:
      - Everyone: Submit quarterly goal updates by Friday
      - Bob: Code review session next Tuesday
      - Alice: Call client about feedback, high priority
      - Team: Retrospective meeting next Friday
      - David: UI bug fixes coordination`;

      const expectedResult = {
        success: true,
        actions: [
          {
            type: 'waiting_for' as const,
            action: 'Review Alice\'s authentication code',
            due_date: '2024-01-09',
            context: '@waiting-for',
            priority: 'normal' as const,
            tags: ['#code-review', '#alice']
          },
          {
            type: 'waiting_for' as const,
            action: 'Legal approval on new privacy policy',
            context: '@waiting-for',
            tags: ['#legal', '#privacy', '#waiting']
          },
          {
            type: 'next_action' as const,
            action: 'Schedule code review session with team',
            context: '@computer',
            tags: ['#meeting', '#code-review']
          },
          {
            type: 'next_action' as const,
            action: 'Call client about feedback',
            priority: 'high' as const,
            context: '@calls',
            time_estimate: '#30m',
            tags: ['#client']
          },
          {
            type: 'next_action' as const,
            action: 'Schedule team retrospective',
            due_date: '2024-01-12',
            context: '@computer',
            time_estimate: '#15m',
            tags: ['#team', '#meeting']
          }
        ],
        original_text: meetingNotes,
        processing_time_ms: 2000
      };

      const expectedTasks = [
        '- [ ] Review Alice\'s authentication code 📅 2024-01-09 @waiting-for #code-review #alice #waiting',
        '- [ ] Legal approval on new privacy policy @waiting-for #legal #privacy #waiting',
        '- [ ] Schedule code review session with team @computer #meeting #code-review',
        '- [ ] Call client about feedback #30m 📅 2024-01-09 ⬆️ @calls #client',
        '- [ ] Schedule team retrospective #15m 📅 2024-01-12 @computer #team #meeting'
      ];

      mockEditor.getSelection.mockReturnValue(meetingNotes);
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockClarificationService.clarifyInboxText.mockResolvedValue(expectedResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue(expectedTasks);

      // When: User processes the meeting notes
      await (plugin as any).clarifyInboxText(meetingNotes);

      // Then: All action items should be properly categorized and formatted
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(meetingNotes);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('Review Alice\'s authentication code'),
        { line: 0, ch: 0 }
      );
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('#waiting'),
        { line: 0, ch: 0 }
      );
    });
  });

  describe('UAT-003: Email Processing Workflow', () => {
    it('should handle urgent email processing with deadlines', async () => {
      // Scenario: User receives urgent email with specific deadlines
      
      const urgentEmail = `URGENT: Client Issue
      From: support@client.com
      
      Hi there,
      
      We're experiencing a critical issue with the login system that's affecting 
      our production users. Can you please:
      
      1. Investigate the authentication service logs immediately
      2. Deploy the hotfix to production by 3 PM today
      3. Send a status update to all affected customers
      4. Schedule a post-mortem meeting for tomorrow
      
      This is blocking about 200 users right now.
      
      Thanks,
      Support Team`;

      const urgentResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Investigate authentication service logs for login issue',
            priority: 'highest' as const,
            context: '@computer',
            time_estimate: '#30m',
            tags: ['#urgent', '#production', '#investigation']
          },
          {
            type: 'next_action' as const,
            action: 'Deploy hotfix to production',
            due_date: '2024-01-08', // Today
            priority: 'highest' as const,
            context: '@computer',
            time_estimate: '#45m',
            tags: ['#deployment', '#hotfix', '#urgent']
          },
          {
            type: 'next_action' as const,
            action: 'Send status update to affected customers',
            context: '@computer',
            time_estimate: '#15m',
            tags: ['#communication', '#customers']
          },
          {
            type: 'next_action' as const,
            action: 'Schedule post-mortem meeting',
            scheduled_date: '2024-01-09', // Tomorrow
            context: '@computer',
            time_estimate: '#10m',
            tags: ['#meeting', '#post-mortem']
          }
        ],
        original_text: urgentEmail,
        processing_time_ms: 1500
      };

      mockEditor.getSelection.mockReturnValue(urgentEmail);
      mockEditor.getCursor.mockReturnValue({ line: 5, ch: 0 });
      mockClarificationService.clarifyInboxText.mockResolvedValue(urgentResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Investigate authentication service logs for login issue #30m 🔺 @computer #urgent #production #investigation',
        '- [ ] Deploy hotfix to production #45m 📅 2024-01-08 🔺 @computer #deployment #hotfix #urgent',
        '- [ ] Send status update to affected customers #15m @computer #communication #customers',
        '- [ ] Schedule post-mortem meeting #10m ⏳ 2024-01-09 @computer #meeting #post-mortem'
      ]);

      // When: User processes urgent email
      await (plugin as any).clarifyInboxText(urgentEmail);

      // Then: Actions should be created with appropriate priority and timing
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(urgentEmail);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('🔺'), // Highest priority symbol
        { line: 5, ch: 0 }
      );
    });
  });

  describe('UAT-004: Project Planning Session', () => {
    it('should handle brainstorming session output with mixed action types', async () => {
      // Scenario: User processes output from a project planning/brainstorming session
      
      const planningNotes = `Project Kickoff: New Customer Portal
      Date: January 8, 2024
      
      Ideas and Tasks:
      
      Immediate Actions:
      - Set up project repository and initial structure
      - Create project roadmap and share with stakeholders  
      - Research competitor solutions for inspiration
      - Schedule weekly team check-ins
      
      Research Phase:
      - User interviews with 5 existing customers (maybe do this later)
      - Market analysis of similar products (not urgent)
      - Technical feasibility study for advanced features
      
      Development Phase:
      - Backend API development
      - Frontend React components
      - Database schema design
      - Authentication integration
      
      Future Considerations:
      - Mobile app version (someday/maybe)
      - Advanced analytics dashboard (nice to have)
      - Third-party integrations (evaluate later)
      
      Waiting For:
      - Legal review of customer data handling
      - Budget approval from finance team`;

      const planningResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Set up project repository and initial structure',
            context: '@computer',
            time_estimate: '#1h',
            project: 'Customer Portal',
            tags: ['#setup', '#development']
          },
          {
            type: 'next_action' as const,
            action: 'Create project roadmap and share with stakeholders',
            context: '@computer',
            time_estimate: '#2h',
            project: 'Customer Portal',
            tags: ['#planning', '#stakeholders']
          },
          {
            type: 'next_action' as const,
            action: 'Research competitor solutions for inspiration',
            context: '@computer',
            time_estimate: '#3h',
            project: 'Customer Portal',
            tags: ['#research']
          },
          {
            type: 'someday_maybe' as const,
            action: 'User interviews with 5 existing customers',
            context: '@calls',
            time_estimate: '#4h',
            project: 'Customer Portal',
            tags: ['#research', '#someday']
          },
          {
            type: 'waiting_for' as const,
            action: 'Legal review of customer data handling',
            context: '@waiting-for',
            project: 'Customer Portal',
            tags: ['#legal', '#waiting']
          }
        ],
        original_text: planningNotes,
        processing_time_ms: 2500
      };

      mockEditor.getSelection.mockReturnValue(planningNotes);
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockClarificationService.clarifyInboxText.mockResolvedValue(planningResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Set up project repository and initial structure #1h @computer [[Customer Portal]] #setup #development',
        '- [ ] Create project roadmap and share with stakeholders #2h @computer [[Customer Portal]] #planning #stakeholders',
        '- [ ] Research competitor solutions for inspiration #3h @computer [[Customer Portal]] #research',
        '- [ ] User interviews with 5 existing customers #4h @calls [[Customer Portal]] #research #someday',
        '- [ ] Legal review of customer data handling @waiting-for [[Customer Portal]] #legal #waiting'
      ]);

      // When: User processes the brainstorming output
      await (plugin as any).clarifyInboxText(planningNotes);

      // Then: Mixed action types should be properly categorized
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(planningNotes);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('[[Customer Portal]]'),
        { line: 0, ch: 0 }
      );
    });
  });

  describe('UAT-005: Error Recovery and User Feedback', () => {
    it('should gracefully handle service unavailability with clear user guidance', async () => {
      // Scenario: Backend service is not available/responding
      
      const inboxText = 'Call the dentist to schedule an appointment';
      mockEditor.getSelection.mockReturnValue(inboxText);
      
      const networkError = new Error('Unable to connect to GTD service. Please ensure the service is running and your settings are correct.');
      mockClarificationService.clarifyInboxText.mockRejectedValue(networkError);

      // When: User attempts clarification with service down
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: Service should be called but graceful error handling should occur
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
      // Note: In a real scenario, this would show a user-friendly Notice
    });

    it('should handle partial service failures with degraded functionality', async () => {
      // Scenario: Service returns error but plugin creates fallback action
      
      const inboxText = 'Review contract and send feedback to legal team.';
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      
      const partialFailureResult = {
        success: false,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Review and manually process: "Review contract and send feedback to legal..."',
            context: '@computer',
            project: 'Inbox Processing',
            tags: ['#manual-review', '#parse-error']
          }
        ],
        original_text: inboxText,
        processing_time_ms: 500,
        error: 'Failed to parse API response: Unexpected token'
      };

      mockClarificationService.clarifyInboxText.mockResolvedValue(partialFailureResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Review and manually process: "Review contract and send feedback to legal..." @computer [[Inbox Processing]] #manual-review #parse-error'
      ]);

      // When: User encounters partial service failure
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: Fallback task should be created for manual processing
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('Review and manually process'),
        expect.any(Object)
      );
    });
  });

  describe('UAT-006: User Experience and Workflow Integration', () => {
    it('should provide appropriate feedback during processing', async () => {
      // Scenario: User should receive clear feedback during the clarification process
      // This test would ideally check Notice creation, but since we're mocking Obsidian,
      // we verify the clarification service is called with correct parameters
      
      const inboxText = 'Long complex meeting notes with multiple participants...';
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockEditor.getCursor.mockReturnValue({ line: 5, ch: 10 });
      
      const result = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Follow up on meeting outcomes',
            tags: ['#meeting']
          }
        ],
        original_text: inboxText,
        processing_time_ms: 3000
      };

      mockClarificationService.clarifyInboxText.mockResolvedValue(result);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Follow up on meeting outcomes #meeting'
      ]);

      // When: User processes complex text
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: Processing should complete successfully
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n- [ ] Follow up on meeting outcomes #meeting\n',
        { line: 5, ch: 10 }
      );
    });

    it('should handle rapid successive clarification requests', async () => {
      // Scenario: User processes multiple items quickly in sequence
      
      const texts = [
        'Email client about project status',
        'Buy groceries on the way home', 
        'Review quarterly reports',
        'Schedule team meeting'
      ];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        mockEditor.getSelection.mockReturnValue(text);
        mockEditor.getCursor.mockReturnValue({ line: i * 2, ch: 0 });
        
        const result = {
          success: true,
          actions: [{
            type: 'next_action' as const,
            action: text,
            tags: ['#action']
          }],
          original_text: text,
          processing_time_ms: 1000
        };

        mockClarificationService.clarifyInboxText.mockResolvedValue(result);
        mockClarificationService.convertToTasksFormat.mockReturnValue([
          `- [ ] ${text} #action`
        ]);

        // When: User processes multiple items quickly
        await (plugin as any).clarifyInboxText(text);

        // Then: Each should be processed independently
        expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(text);
      }

      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledTimes(texts.length);
      expect(mockEditor.replaceRange).toHaveBeenCalledTimes(texts.length);
    });
  });
});