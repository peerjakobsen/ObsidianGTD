import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ObsidianGTDPlugin from '../src/main';
import { GTDClarificationService } from '../src/clarification-service';
import { MarkdownView } from 'obsidian';

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
    
    // Mock plugin methods to prevent actual initialization
    plugin.addCommand = jest.fn();
    plugin.addRibbonIcon = jest.fn().mockReturnValue({ addClass: jest.fn() });
    plugin.addSettingTab = jest.fn();
    plugin.loadData = jest.fn().mockResolvedValue({});
    plugin.saveData = jest.fn();
    
    // Setup mock service
    mockClarificationService = {
      clarifyInboxText: jest.fn(),
      convertToTasksFormat: jest.fn(),
      updateSettings: jest.fn(),
      testConnection: jest.fn(),
      getServiceInfo: jest.fn().mockReturnValue({ hasValidConfig: true })
    } as jest.Mocked<GTDClarificationService>;
    
    plugin.clarificationService = mockClarificationService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UAT-001: Daily Inbox Processing', () => {
    it('should allow user to process a typical daily inbox entry', async () => {
      // Scenario: User selects inbox text and wants to convert to actionable tasks
      
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

      // When: User executes the clarification command
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: Text should be replaced with properly formatted tasks
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n- [ ] Review contract from client #1h 📅 2024-01-12 ⬆️ @computer #client #contracts\n- [ ] Schedule demo call with client for next week #15m @calls #client #demo\n',
        { line: 10, ch: 0 }
      );
    });

    it('should handle user workflow when no actionable items are found', async () => {
      // Given: User selects informational text
      const nonActionableText = `Just read an interesting article about productivity. 
      The main points were about focusing on single tasks and avoiding multitasking.`;
      
      mockEditor.getSelection.mockReturnValue(nonActionableText);
      
      const result = {
        success: true,
        actions: [],
        original_text: nonActionableText,
        processing_time_ms: 800
      };

      mockClarificationService.clarifyInboxText.mockResolvedValue(result);

      // When: User executes clarification
      await (plugin as any).clarifyInboxText(nonActionableText);

      // Then: User should see appropriate feedback and no tasks inserted
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(nonActionableText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });
  });

  describe('UAT-002: Meeting Notes Processing', () => {
    it('should handle complex meeting notes with multiple participants and action items', async () => {
      // Scenario: User processes meeting notes after a team meeting
      
      const meetingNotes = `Team Stand-up - January 8, 2024
      Attendees: Alice, Bob, Carol, David
      
      Alice: Working on user authentication, needs code review by Wednesday
      Bob: Will finish the API integration by end of week, blocked on documentation
      Carol: Starting work on the dashboard UI, needs design assets from marketing
      David: Following up on client feedback, will schedule call with them tomorrow
      
      Action Items:
      - Someone needs to review Alice's code by Wednesday
      - Bob to request documentation from backend team
      - Carol to contact marketing for design assets  
      - David to call client tomorrow
      - Schedule team retrospective for Friday`;

      const expectedResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Review Alice\'s authentication code',
            due_date: '2024-01-10',
            context: '@computer',
            time_estimate: '#30m',
            tags: ['#code-review', '#team']
          },
          {
            type: 'waiting_for' as const,
            action: 'Documentation from backend team for API integration',
            tags: ['#waiting', '#api']
          },
          {
            type: 'next_action' as const,
            action: 'Contact marketing for dashboard design assets',
            context: '@calls',
            time_estimate: '#15m',
            tags: ['#marketing', '#design']
          },
          {
            type: 'next_action' as const,
            action: 'Call client about feedback',
            due_date: '2024-01-09',
            context: '@calls',
            priority: 'high' as const,
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
        '- [ ] Review Alice\'s authentication code #30m 📅 2024-01-10 @computer #code-review #team',
        '- [ ] Documentation from backend team for API integration #waiting #api',
        '- [ ] Contact marketing for dashboard design assets #15m @calls #marketing #design',
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
      
      1. Investigate the issue immediately
      2. Provide a status update by 3 PM today  
      3. Have a fix deployed by end of business tomorrow
      4. Send a post-mortem report by Friday
      
      This is blocking our operations so please prioritize accordingly.
      
      Thanks,
      Support Team`;

      const expectedResult = {
        success: true,
        actions: [
          {
            type: 'next_action' as const,
            action: 'Investigate critical login system issue',
            priority: 'highest' as const,
            context: '@computer',
            time_estimate: '#2h',
            tags: ['#urgent', '#bug', '#production']
          },
          {
            type: 'next_action' as const,
            action: 'Send status update on login issue to client',
            due_date: '2024-01-08',
            context: '@computer',
            priority: 'highest' as const,
            time_estimate: '#15m',
            tags: ['#client', '#update']
          },
          {
            type: 'next_action' as const,
            action: 'Deploy fix for login system issue',
            due_date: '2024-01-09',
            context: '@computer',
            priority: 'high' as const,
            time_estimate: '#1h',
            tags: ['#deployment', '#fix']
          },
          {
            type: 'next_action' as const,
            action: 'Write and send post-mortem report',
            due_date: '2024-01-12',
            context: '@computer',
            time_estimate: '#1h',
            tags: ['#documentation', '#post-mortem']
          }
        ],
        original_text: urgentEmail,
        processing_time_ms: 1500
      };

      mockEditor.getSelection.mockReturnValue(urgentEmail);
      mockClarificationService.clarifyInboxText.mockResolvedValue(expectedResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Investigate critical login system issue #2h 🔺 @computer #urgent #bug #production',
        '- [ ] Send status update on login issue to client #15m 📅 2024-01-08 🔺 @computer #client #update',
        '- [ ] Deploy fix for login system issue #1h 📅 2024-01-09 ⬆️ @computer #deployment #fix',
        '- [ ] Write and send post-mortem report #1h 📅 2024-01-12 @computer #documentation #post-mortem'
      ]);

      // When: User processes urgent email
      await (plugin as any).clarifyInboxText(urgentEmail);

      // Then: Tasks should be created with appropriate urgency and deadlines
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(urgentEmail);
      const insertedText = mockEditor.replaceRange.mock.calls[0][0];
      expect(insertedText).toContain('🔺'); // Highest priority symbol
      expect(insertedText).toContain('📅 2024-01-08'); // Today's deadline
      expect(insertedText).toContain('#urgent');
    });
  });

  describe('UAT-004: Project Planning Session', () => {
    it('should handle brainstorming session output with mixed action types', async () => {
      // Scenario: User processes output from a project planning session
      
      const brainstormingNotes = `Project Alpha Planning Session
      
      Immediate Actions (This Week):
      - Set up development environment
      - Create project repository and initial structure
      - Define API endpoints and database schema
      
      Short-term Goals (This Month):
      - Implement user authentication system
      - Build core functionality MVP
      - Set up automated testing pipeline
      
      Future Considerations (Someday/Maybe):
      - Mobile app version
      - Advanced analytics dashboard
      - Third-party integrations (Slack, Discord)
      - Machine learning features
      
      Waiting For:
      - Design mockups from UI team (requested last week)
      - Legal approval for data handling policies
      - Budget approval from finance team`;

      const expectedResult = {
        success: true,
        actions: [
          // Immediate actions
          {
            type: 'next_action' as const,
            action: 'Set up development environment for Project Alpha',
            context: '@computer',
            project: 'Project Alpha',
            priority: 'high' as const,
            time_estimate: '#2h',
            tags: ['#setup', '#development']
          },
          {
            type: 'next_action' as const,
            action: 'Create project repository and initial structure',
            context: '@computer',
            project: 'Project Alpha',
            time_estimate: '#1h',
            tags: ['#setup', '#git']
          },
          {
            type: 'next_action' as const,
            action: 'Define API endpoints and database schema',
            context: '@computer',
            project: 'Project Alpha',
            time_estimate: '#3h',
            tags: ['#design', '#api', '#database']
          },
          // Short-term goals
          {
            type: 'next_action' as const,
            action: 'Implement user authentication system',
            context: '@computer',
            project: 'Project Alpha',
            scheduled_date: '2024-01-15',
            time_estimate: '#8h',
            tags: ['#authentication', '#development']
          },
          {
            type: 'next_action' as const,
            action: 'Build core functionality MVP',
            context: '@computer',
            project: 'Project Alpha',
            scheduled_date: '2024-01-20',
            time_estimate: '#16h',
            tags: ['#mvp', '#development']
          },
          // Someday/Maybe items
          {
            type: 'someday_maybe' as const,
            action: 'Develop mobile app version',
            project: 'Project Alpha',
            tags: ['#mobile', '#someday', '#development']
          },
          {
            type: 'someday_maybe' as const,
            action: 'Build advanced analytics dashboard',
            project: 'Project Alpha',
            tags: ['#analytics', '#someday', '#dashboard']
          },
          // Waiting for items
          {
            type: 'waiting_for' as const,
            action: 'Design mockups from UI team',
            project: 'Project Alpha',
            tags: ['#waiting', '#design', '#ui']
          },
          {
            type: 'waiting_for' as const,
            action: 'Legal approval for data handling policies',
            project: 'Project Alpha',
            tags: ['#waiting', '#legal', '#compliance']
          }
        ],
        original_text: brainstormingNotes,
        processing_time_ms: 2500
      };

      mockEditor.getSelection.mockReturnValue(brainstormingNotes);
      mockClarificationService.clarifyInboxText.mockResolvedValue(expectedResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue([
        '- [ ] Set up development environment for Project Alpha #2h ⬆️ [[Project Alpha]] @computer #setup #development',
        '- [ ] Create project repository and initial structure #1h [[Project Alpha]] @computer #setup #git',
        '- [ ] Define API endpoints and database schema #3h [[Project Alpha]] @computer #design #api #database',
        '- [ ] Implement user authentication system #8h ⏳ 2024-01-15 [[Project Alpha]] @computer #authentication #development',
        '- [ ] Build core functionality MVP #16h ⏳ 2024-01-20 [[Project Alpha]] @computer #mvp #development',
        '- [ ] Develop mobile app version [[Project Alpha]] #mobile #someday #development',
        '- [ ] Build advanced analytics dashboard [[Project Alpha]] #analytics #someday #dashboard',
        '- [ ] Design mockups from UI team [[Project Alpha]] #waiting #design #ui',
        '- [ ] Legal approval for data handling policies [[Project Alpha]] #waiting #legal #compliance'
      ]);

      // When: User processes brainstorming notes
      await (plugin as any).clarifyInboxText(brainstormingNotes);

      // Then: Should properly categorize immediate actions, future items, and waiting items
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(brainstormingNotes);
      const insertedText = mockEditor.replaceRange.mock.calls[0][0];
      expect(insertedText).toContain('[[Project Alpha]]'); // Project links
      expect(insertedText).toContain('#waiting'); // Waiting for tags
      expect(insertedText).toContain('#someday'); // Someday maybe tags
      expect(insertedText).toContain('⏳ 2024-01-15'); // Scheduled dates
    });
  });

  describe('UAT-005: Error Recovery and User Feedback', () => {
    it('should gracefully handle service unavailability with clear user guidance', async () => {
      // Scenario: User tries to use the plugin when backend service is down
      
      const inboxText = 'Call John about the project proposal tomorrow.';
      mockEditor.getSelection.mockReturnValue(inboxText);
      
      // Mock service unavailable error
      mockClarificationService.clarifyInboxText.mockRejectedValue(
        new Error('Network request failed')
      );

      // When: User attempts clarification during service outage
      await (plugin as any).clarifyInboxText(inboxText);

      // Then: User should receive helpful error message and original text preserved
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled(); // Text not modified on error
    });

    it('should handle partial service failures with degraded functionality', async () => {
      // Scenario: Service returns error but plugin creates fallback action
      
      const inboxText = 'Review contract and send feedback to legal team.';
      mockEditor.getSelection.mockReturnValue(inboxText);
      
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
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('#manual-review'),
        expect.any(Object)
      );
    });
  });

  describe('UAT-006: User Experience and Workflow Integration', () => {
    it('should provide appropriate feedback during processing', async () => {
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
      // Scenario: User rapidly selects and clarifies multiple text blocks
      
      const texts = [
        'Call John tomorrow',
        'Email client about proposal',
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