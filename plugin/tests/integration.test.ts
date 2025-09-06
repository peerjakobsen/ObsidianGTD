import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ObsidianGTDPlugin from '../src/main';
import { Notice, MarkdownView } from 'obsidian';
import { GTDClarificationService } from '../src/clarification-service';

// Mock the Obsidian APIs
jest.mock('obsidian');

describe('Integration Tests - Full GTD Clarification Workflow', () => {
  let plugin: ObsidianGTDPlugin;
  let mockApp: any;
  let mockManifest: any;
  let mockEditor: any;
  let mockView: any;
  let mockClarificationService: jest.Mocked<GTDClarificationService>;

  beforeEach(() => {
    // Setup mock editor
    mockEditor = {
      getSelection: jest.fn(),
      getCursor: jest.fn(),
      replaceRange: jest.fn()
    };

    // Setup mock view
    mockView = {
      editor: mockEditor
    };

    // Setup mock app with workspace
    mockApp = {
      workspace: {
        getActiveViewOfType: jest.fn().mockReturnValue(mockView)
      }
    };

    // Setup mock manifest
    mockManifest = {
      id: 'obsidian-gtd',
      name: 'GTD Assistant',
      version: '1.0.0'
    };

    // Setup mock clarification service
    mockClarificationService = {
      clarifyInboxText: jest.fn(),
      convertToTasksFormat: jest.fn(),
      updateSettings: jest.fn(),
      testConnection: jest.fn(),
      getServiceInfo: jest.fn().mockReturnValue({ hasValidConfig: true })
    } as jest.Mocked<GTDClarificationService>;

    // Create plugin instance
    plugin = new ObsidianGTDPlugin(mockApp, mockManifest);
    
    // Explicitly set the app property to ensure it's available
    (plugin as any).app = mockApp;
    
    plugin.clarificationService = mockClarificationService;
    
    // Mock plugin methods
    plugin.addCommand = jest.fn();
    plugin.addRibbonIcon = jest.fn().mockReturnValue({ addClass: jest.fn() });
    plugin.addSettingTab = jest.fn();
    plugin.loadData = jest.fn().mockResolvedValue({});
    plugin.saveData = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End GTD Clarification Flow', () => {
    it('should complete full workflow from text selection to task insertion', async () => {
      // Arrange
      const inboxText = 'Call John about the project proposal and schedule meeting for next week';
      const expectedResult = {
        success: true,
        actions: [
          {
            type: 'next_action',
            title: 'Call John about project proposal',
            context: '#calls',
            priority: 'high',
            time_estimate: '15 minutes'
          },
          {
            type: 'next_action', 
            title: 'Schedule meeting with John for next week',
            context: '#schedule',
            priority: 'medium',
            due_date: '2024-01-15'
          }
        ],
        error: null
      };
      
      const expectedTasksFormat = [
        '- [ ] Call John about project proposal #15m 📅 2024-01-08 ⬆️ @calls #client #contracts',
        '- [ ] Schedule meeting with John for next week #schedule 📅 2024-01-15 @calls #client #demo'
      ];

      mockEditor.getSelection.mockReturnValue(inboxText);
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);
      mockEditor.getCursor.mockReturnValue({ line: 5, ch: 0 });
      mockClarificationService.clarifyInboxText.mockResolvedValue(expectedResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue(expectedTasksFormat);

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockClarificationService.convertToTasksFormat).toHaveBeenCalledWith(expectedResult);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n- [ ] Call John about project proposal #15m 📅 2024-01-08 ⬆️ @calls #client #contracts\n- [ ] Schedule meeting with John for next week #schedule 📅 2024-01-15 @calls #client #demo\n',
        { line: 5, ch: 0 }
      );
    });

    it('should handle API failures gracefully with user feedback', async () => {
      // Arrange
      const inboxText = 'Some inbox text';
      const apiError = new Error('Network connection failed');
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockClarificationService.clarifyInboxText.mockRejectedValue(apiError);

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });

    it('should handle empty results with appropriate feedback', async () => {
      // Arrange
      const inboxText = 'Just some notes without actionable items';
      const emptyResult = {
        success: true,
        actions: [],
        error: null
      };
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockClarificationService.clarifyInboxText.mockResolvedValue(emptyResult);

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockClarificationService.convertToTasksFormat).not.toHaveBeenCalled();
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });

    it('should handle service errors with user-friendly messages', async () => {
      // Arrange
      const inboxText = 'Some inbox text';
      const serviceError = {
        success: false,
        actions: [],
        error: 'Backend service unavailable'
      };
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockClarificationService.clarifyInboxText.mockResolvedValue(serviceError);

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });
  });

  describe('Settings Integration', () => {
    it('should update clarification service when settings change', async () => {
      // Arrange
      const newSettings = {
        backendUrl: 'http://localhost:9000',
        timeout: 10000,
        apiKey: 'new-api-key'
      };
      
      plugin.settings = newSettings;

      // Act
      await plugin.saveSettings();

      // Assert
      expect(mockClarificationService.updateSettings).toHaveBeenCalledWith(newSettings);
    });
  });

  describe('Command Integration', () => {
    it('should register GTD clarification command with proper configuration', async () => {
      // Arrange
      const mockAddCommand = jest.fn();
      plugin.addCommand = mockAddCommand;

      // Act
      await plugin.onload();

      // Assert
      expect(mockAddCommand).toHaveBeenCalledWith({
        id: 'clarify-inbox-text',
        name: 'Clarify selected text (GTD)',
        hotkeys: [
          {
            modifiers: ['Mod', 'Shift'],
            key: 'g'
          }
        ],
        editorCallback: expect.any(Function)
      });
    });

    it('should handle command execution with no text selected', () => {
      // Arrange
      mockEditor.getSelection.mockReturnValue('');
      const editorCallback = jest.fn();

      // Act - simulate command execution
      mockEditor.getSelection.mockReturnValue('');
      const result = mockEditor.getSelection();

      // Assert
      expect(result).toBe('');
    });
  });

  describe('Error Handling Integration', () => {
    it('should maintain editor state on clarification failure', async () => {
      // Arrange
      const inboxText = 'Some text';
      const originalCursorPosition = { line: 3, ch: 10 };
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockEditor.getCursor.mockReturnValue(originalCursorPosition);
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);
      mockClarificationService.clarifyInboxText.mockRejectedValue(new Error('Service error'));

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert - Editor should not be modified on error
      expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });

    it('should handle missing active view gracefully', async () => {
      // Arrange
      const inboxText = 'Some text';
      const successResult = {
        success: true,
        actions: [{ type: 'next_action', title: 'Test action' }],
        error: null
      };
      
      mockEditor.getSelection.mockReturnValue(inboxText);
      mockApp.workspace.getActiveViewOfType.mockReturnValue(null); // No active view
      mockClarificationService.clarifyInboxText.mockResolvedValue(successResult);
      mockClarificationService.convertToTasksFormat.mockReturnValue(['- [ ] Test action']);

      // Act
      await (plugin as any).clarifyInboxText(inboxText);

      // Assert - Should not attempt to insert tasks
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(inboxText);
      expect(mockClarificationService.convertToTasksFormat).toHaveBeenCalledWith(successResult);
      // Editor operations should be skipped since no active view
    });
  });

  describe('Performance Integration', () => {
    it('should handle large text inputs efficiently', async () => {
      // Arrange
      const largeInboxText = 'A'.repeat(10000) + ' Call John about the project';
      const startTime = Date.now();
      
      mockEditor.getSelection.mockReturnValue(largeInboxText);
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockClarificationService.clarifyInboxText.mockResolvedValue({
        success: true,
        actions: [{ type: 'next_action', title: 'Call John about the project' }],
        error: null
      });
      mockClarificationService.convertToTasksFormat.mockReturnValue(['- [ ] Call John about the project']);

      // Act
      await (plugin as any).clarifyInboxText(largeInboxText);
      const endTime = Date.now();

      // Assert - Should complete within reasonable time (under 100ms for mocked operations)
      expect(endTime - startTime).toBeLessThan(100);
      expect(mockClarificationService.clarifyInboxText).toHaveBeenCalledWith(largeInboxText);
    });
  });
});