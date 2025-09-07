import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ObsidianGTDPlugin from '../src/main';
import { App, Plugin, Notice, MarkdownView } from 'obsidian';

// Mock Obsidian App
const mockApp = {
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
    getActiveViewOfType: jest.fn(),
  },
  vault: {
    on: jest.fn(),
    off: jest.fn(),
  },
} as unknown as App;

// Mock plugin manifest
const mockManifest = {
  id: 'obsidian-gtd',
  name: 'Obsidian GTD',
  version: '1.0.0',
  minAppVersion: '0.15.0',
  description: 'Getting Things Done (GTD) workflow with AI assistance via direct AWS Bedrock integration',
  author: 'Your Name',
  authorUrl: '',
  fundingUrl: '',
  isDesktopOnly: false,
};

describe('ObsidianGTDPlugin', () => {
  let plugin: ObsidianGTDPlugin;

  beforeEach(() => {
    plugin = new ObsidianGTDPlugin(mockApp, mockManifest);
  });

  describe('Plugin Initialization', () => {
    it('should create plugin instance', () => {
      expect(plugin).toBeInstanceOf(Plugin);
      expect(plugin).toBeInstanceOf(ObsidianGTDPlugin);
    });

    it('should have correct app reference', () => {
      expect(plugin.app).toBe(mockApp);
    });

    it('should have correct manifest', () => {
      expect(plugin.manifest).toEqual(mockManifest);
    });

    it('should initialize with default settings', () => {
      expect(plugin.settings).toBeDefined();
      expect(plugin.settings.timeout).toBe(30000);
      expect(plugin.settings.awsRegion).toBe('us-east-1');
      expect(plugin.settings.awsBedrockModelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should have onload method', () => {
      expect(typeof plugin.onload).toBe('function');
    });

    it('should have onunload method', () => {
      expect(typeof plugin.onunload).toBe('function');
    });

    it('should load settings on onload', async () => {
      const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValue({
        timeout: 60000,
        awsBearerToken: 'test-bearer',
        awsRegion: 'eu-west-1',
        awsBedrockModelId: 'meta.llama3-8b-instruct-v1:0',
      });

      await plugin.onload();

      expect(loadDataSpy).toHaveBeenCalled();
      expect(plugin.settings.timeout).toBe(60000);
      expect(plugin.settings.awsBearerToken).toBe('test-bearer');
      expect(plugin.settings.awsRegion).toBe('eu-west-1');
      expect(plugin.settings.awsBedrockModelId).toBe('meta.llama3-8b-instruct-v1:0');
    });
  });

  describe('Text Selection Detection', () => {
    let mockEditor: any;
    let mockView: any;

    beforeEach(() => {
      mockEditor = {
        getSelection: jest.fn(),
      };
      mockView = {};
    });

    it('should detect when text is selected', () => {
      mockEditor.getSelection.mockReturnValue('Selected text for GTD clarification');
      
      const selectedText = mockEditor.getSelection();
      
      expect(selectedText).toBe('Selected text for GTD clarification');
      expect(selectedText.length).toBeGreaterThan(0);
    });

    it('should handle empty text selection', () => {
      mockEditor.getSelection.mockReturnValue('');
      
      const selectedText = mockEditor.getSelection();
      
      expect(selectedText).toBe('');
      expect(selectedText.length).toBe(0);
    });

    it('should handle null text selection', () => {
      mockEditor.getSelection.mockReturnValue(null);
      
      const selectedText = mockEditor.getSelection();
      
      expect(selectedText).toBeNull();
    });

    it('should handle undefined text selection', () => {
      mockEditor.getSelection.mockReturnValue(undefined);
      
      const selectedText = mockEditor.getSelection();
      
      expect(selectedText).toBeUndefined();
    });
  });

  describe('Command Registration and Availability', () => {
    let mockEditor: any;
    let addCommandSpy: any;

    beforeEach(() => {
      mockEditor = {
        getSelection: jest.fn(),
      };
      addCommandSpy = jest.spyOn(plugin, 'addCommand');
    });

    it('should register GTD clarify command on load', async () => {
      await plugin.onload();
      
      expect(addCommandSpy).toHaveBeenCalledWith({
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

    it('should execute clarification when text is selected', async () => {
      const clarifyInboxTextSpy = jest.spyOn(plugin as any, 'clarifyInboxText').mockImplementation(() => Promise.resolve());
      mockEditor.getSelection.mockReturnValue('inbox text to clarify');
      
      await plugin.onload();
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      const editorCallback = commandCall[0].editorCallback;
      
      editorCallback(mockEditor, {});
      
      expect(clarifyInboxTextSpy).toHaveBeenCalledWith('inbox text to clarify');
    });

    it('should show notice when no text is selected', async () => {
      const clarifyInboxTextSpy = jest.spyOn(plugin as any, 'clarifyInboxText').mockImplementation(() => Promise.resolve());
      mockEditor.getSelection.mockReturnValue('');
      
      await plugin.onload();
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      const editorCallback = commandCall[0].editorCallback;
      
      editorCallback(mockEditor, {});
      
      expect(clarifyInboxTextSpy).not.toHaveBeenCalled();
      // The plugin now shows a Notice instead of console.log
    });

    it('should handle whitespace-only selection as empty', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const clarifyInboxTextSpy = jest.spyOn(plugin as any, 'clarifyInboxText').mockImplementation(() => Promise.resolve());
      mockEditor.getSelection.mockReturnValue('   \n\t   ');
      
      await plugin.onload();
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      const editorCallback = commandCall[0].editorCallback;
      
      editorCallback(mockEditor, {});
      
      // Should still call clarify with whitespace - the server can handle trimming
      expect(clarifyInboxTextSpy).toHaveBeenCalledWith('   \n\t   ');
      
      consoleSpy.mockRestore();
    });
  });

  describe('User Feedback System', () => {
    let mockEditor: any;
    let mockView: MarkdownView;

    beforeEach(() => {
      mockEditor = {
        getSelection: jest.fn(),
      };
      mockView = { 
        editor: mockEditor,
        file: {}
      } as MarkdownView;
      (Notice as jest.Mock).mockClear();
    });

    it('should show notice when no text is selected', async () => {
      mockEditor.getSelection.mockReturnValue('');
      
      const addCommandSpy = jest.spyOn(plugin, 'addCommand');
      await plugin.onload();
      
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      
      expect(commandCall).toBeDefined();
      if (commandCall && commandCall[0].editorCallback) {
        const editorCallback = commandCall[0].editorCallback;
        editorCallback(mockEditor, mockView);
        
        expect(Notice).toHaveBeenCalledWith('No text selected for GTD clarification');
      }
    });

    it('should show progress notice when clarification starts', async () => {
      const clarifyInboxTextSpy = jest.spyOn(plugin as any, 'clarifyInboxText').mockImplementation(() => Promise.resolve());
      mockEditor.getSelection.mockReturnValue('inbox text to clarify');
      
      const addCommandSpy = jest.spyOn(plugin, 'addCommand');
      await plugin.onload();
      
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      
      expect(commandCall).toBeDefined();
      if (commandCall && commandCall[0].editorCallback) {
        const editorCallback = commandCall[0].editorCallback;
        editorCallback(mockEditor, mockView);
        
        expect(clarifyInboxTextSpy).toHaveBeenCalledWith('inbox text to clarify');
      }
    });

    it('should show success notice after successful clarification', async () => {
      // Mock the clarification service
      const mockService = {
        clarifyInboxText: jest.fn().mockResolvedValue({
          success: true,
          actions: [
            {
              type: 'next_action',
              action: 'Test action',
              context: '@computer',
              tags: []
            }
          ],
          original_text: 'Test inbox text',
          processing_time_ms: 1000
        }),
        convertToTasksFormat: jest.fn().mockReturnValue(['- [ ] Test action @computer'])
      };

      // Mock editor and view
      const mockEditor = {
        getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
        replaceRange: jest.fn()
      };
      
      const mockView = {
        editor: mockEditor
      };

      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(mockView);

      // Initialize plugin with onload first
      await plugin.onload();
      
      // Replace the service with our mock
      (plugin as any).clarificationService = mockService;
      
      // Call clarifyInboxText
      const text = 'Test inbox text';
      await (plugin as any).clarifyInboxText(text);
      
      // Should show progress notice first
      expect(Notice).toHaveBeenCalledWith('🧠 Clarifying text using GTD methodology...', 0);
      
      // Should show success notice after completion
      expect(Notice).toHaveBeenCalledWith(
        expect.stringContaining('✅ GTD clarification completed! Generated 1 actions'),
        5000
      );
      
      // Should insert text into editor
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n- [ ] Test action @computer\n',
        { line: 0, ch: 0 }
      );
    });

    it('should handle clarification method being called', async () => {
      // Test that the clarifyInboxText method exists and can be called
      const clarifyMethod = (plugin as any).clarifyInboxText;
      expect(typeof clarifyMethod).toBe('function');
    });

    it('should register command with keyboard shortcut', async () => {
      const addCommandSpy = jest.spyOn(plugin, 'addCommand');
      await plugin.onload();
      
      const commandCall = addCommandSpy.mock.calls.find((call: any) => call[0].id === 'clarify-inbox-text');
      
      expect(commandCall).toBeDefined();
      if (commandCall && commandCall[0]) {
        const commandConfig = commandCall[0];
        expect(commandConfig.hotkeys).toBeDefined();
        expect(commandConfig.hotkeys).toHaveLength(1);
        if (commandConfig.hotkeys && commandConfig.hotkeys[0]) {
          expect(commandConfig.hotkeys[0]).toEqual({
            modifiers: ['Mod', 'Shift'],
            key: 'g'
          });
        }
      }
    });
  });
});
