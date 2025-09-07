import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDAssistantView } from '../src/assistant-view';
import type ObsidianGTDPlugin from '../src/main';
import { MarkdownView } from 'obsidian';

jest.mock('obsidian');

describe('GTDAssistantView - controller logic', () => {
  let mockPlugin: any;
  let mockConversation: any;
  let leaf: any;

  beforeEach(() => {
    document.body.innerHTML = '';

    // Minimal app/editor mocks
    const mockEditor = {
      getSelection: jest.fn().mockReturnValue(''),
      getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
      replaceRange: jest.fn(),
    };

    const mockView = new (MarkdownView as any)();
    (mockView as any).editor = mockEditor;

    mockPlugin = {
      app: {
        workspace: {
          getActiveViewOfType: jest.fn().mockReturnValue(mockView),
        },
      },
      settings: {
        timeout: 5000,
        awsBearerToken: 'test-token',
        awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        awsRegion: 'us-east-1',
      },
      clarificationService: {
        convertToTasksFormat: jest.fn().mockReturnValue(['- [ ] Task 1']),
      },
    } as unknown as ObsidianGTDPlugin & { clarificationService: any };

    const sendMock = jest.fn<() => Promise<string>>().mockResolvedValue('ok');
    const prepareForInsertMock = jest.fn<() => Promise<any>>().mockResolvedValue({ 
      success: true, 
      actions: [{ action: 'Task 1', tags: [] }], 
      original_text: '', 
      processing_time_ms: 0 
    });
    const resetThreadMock = jest.fn<() => void>();
    const getThreadMock = jest.fn<() => any[]>().mockReturnValue([]);

    mockConversation = {
      send: sendMock,
      prepareForInsert: prepareForInsertMock,
      resetThread: resetThreadMock,
      getThread: getThreadMock,
    };

    leaf = { containerEl: document.createElement('div') };
  });

  it('disables Send while sending and calls conversation.send', async () => {
    // Arrange: make send async to observe disabled state
    let resolveSend: any;
    mockConversation.send = jest.fn(() => new Promise(res => { resolveSend = res; }));

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = document.body.querySelector('button') as HTMLButtonElement;
    textarea.value = 'Hello';

    // Act: start send (do not await yet)
    const sendPromise = view.handleSend();
    expect(sendBtn.disabled).toBe(true);

    // Complete send
    resolveSend('ok');
    await sendPromise;

    // Assert
    expect(mockConversation.send).toHaveBeenCalledWith('Hello');
    expect(sendBtn.disabled).toBe(false);
  });

  it('inserts tasks at cursor using prepareForInsert + convertToTasksFormat', async () => {
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    await view.handleInsertTasks();

    expect(mockConversation.prepareForInsert).toHaveBeenCalled();
    expect(mockPlugin.clarificationService.convertToTasksFormat).toHaveBeenCalled();
    const editor = (mockPlugin.app.workspace.getActiveViewOfType() as any).editor;
    expect(editor.replaceRange).toHaveBeenCalledWith('\n- [ ] Task 1\n', { line: 0, ch: 0 });
  });

  it('clears the thread and UI on Clear', async () => {
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    view.handleClear();
    expect(mockConversation.resetThread).toHaveBeenCalled();
  });

  it('auto-sends selection on first open', async () => {
    (mockPlugin.app.workspace.getActiveViewOfType() as any).editor.getSelection = jest.fn().mockReturnValue('Process this');
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    expect(mockConversation.send).toHaveBeenCalledWith('Process this');
  });

  it('renders a tasks preview for assistant JSON and toggles raw view', async () => {
    // Thread with an assistant JSON response
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'user', content: 'Please clarify' },
      { role: 'assistant', content: '[{"action":"Do thing","tags":[]}]' },
    ]);

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    // Preview should show a task line
    const previewText = document.body.textContent || '';
    expect(previewText).toContain('Do thing');

    // Toggle to raw JSON
    const toggle = document.body.querySelector('.gtd-toggle-raw') as HTMLAnchorElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    const rawShown = (document.body.querySelector('.gtd-msg-raw') as HTMLElement).style.display !== 'none';
    expect(rawShown).toBe(true);
  });
});
