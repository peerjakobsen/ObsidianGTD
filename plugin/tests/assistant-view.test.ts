// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDAssistantView } from '../src/assistant-view';
import type ObsidianGTDPlugin from '../src/main';
import { MarkdownView, WorkspaceLeaf, Notice } from 'obsidian';

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
          detachLeavesOfType: jest.fn(),
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
    const startWithPromptMock = jest.fn<() => void>();
    const sendInitialWithPromptMock = jest.fn<() => Promise<string>>().mockResolvedValue('ok');

    mockConversation = {
      send: sendMock,
      prepareForInsert: prepareForInsertMock,
      resetThread: resetThreadMock,
      getThread: getThreadMock,
      startWithPrompt: startWithPromptMock,
      sendInitialWithPrompt: sendInitialWithPromptMock,
    };

    leaf = new (WorkspaceLeaf as any)();
    // Ensure detach is a jest spy even if mock implementation changes
    (leaf as any).detach = jest.fn();
  });

  it('disables Send while sending and calls conversation.send when thread started', async () => {
    // Arrange: make send async to observe disabled state
    let resolveSend: any;
    mockConversation.send = jest.fn(() => new Promise(res => { resolveSend = res; }));
    mockConversation.getThread = jest.fn().mockReturnValue([{ role: 'user', content: 'Hi' }]);

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement;
    const sendBtn = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent === 'Send') as HTMLButtonElement;
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

  it('resets the thread and UI when starting a new chat', async () => {
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    (view as any).startNewChat();
    expect(mockConversation.resetThread).toHaveBeenCalled();
  });

  it('prefills input with selection and seeds prompt on first send (Clarify default)', async () => {
    (mockPlugin.app.workspace.getActiveViewOfType() as any).editor.getSelection = jest.fn().mockReturnValue('Process this');
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    // Input is prefilled with selection
    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Process this');
    // No auto send
    expect(mockConversation.send).not.toHaveBeenCalled();
    expect(mockConversation.sendInitialWithPrompt).not.toHaveBeenCalled();

    // Click Send to seed with Clarify
    await (view as any).handleSend();
    expect(mockConversation.sendInitialWithPrompt).toHaveBeenCalledWith('clarify', 'Process this', 'general');
    expect(mockConversation.send).not.toHaveBeenCalled();
  });

  it('uses selected dropdown prompt kind on first send', async () => {
    (mockPlugin.app.workspace.getActiveViewOfType() as any).editor.getSelection = jest.fn().mockReturnValue('Review list');
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    const select = document.body.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();

    // Choose Waiting For
    select.value = 'weekly_review_waiting_for';
    select.dispatchEvent(new Event('change'));
    await (view as any).handleSend();
    expect(mockConversation.sendInitialWithPrompt).toHaveBeenCalledWith('weekly_review_waiting_for', 'Review list', 'general');

    // Reset mocks and choose Someday/Maybe
    (mockConversation.sendInitialWithPrompt as jest.Mock).mockClear();
    (mockPlugin.app.workspace.getActiveViewOfType() as any).editor.getSelection = jest.fn().mockReturnValue('Maybe list');
    await view.onOpen(); // rerender
    const allSelects = Array.from(document.body.querySelectorAll('select')) as HTMLSelectElement[];
    const select2 = allSelects[allSelects.length - 1];
    select2.value = 'weekly_review_someday_maybe';
    select2.dispatchEvent(new Event('change'));
    await (view as any).handleSend('Maybe list');
    expect(mockConversation.sendInitialWithPrompt).toHaveBeenCalledWith('weekly_review_someday_maybe', 'Maybe list', 'general');
  });

  it('toggles compact mode and aria-pressed state', async () => {
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    const container = document.body.querySelector('.gtd-assistant-view') as HTMLElement;
    const compactBtn = Array.from(document.body.querySelectorAll('.gtd-toolbar-right .gtd-toolbar-btn')).find(b => b.textContent === 'Compact') as HTMLButtonElement;
    expect(compactBtn).toBeTruthy();
    expect(container.classList.contains('is-compact')).toBe(false);
    expect(compactBtn.getAttribute('aria-pressed')).toBe('false');

    compactBtn.click();
    expect(container.classList.contains('is-compact')).toBe(true);
    expect(compactBtn.getAttribute('aria-pressed')).toBe('true');

    compactBtn.click();
    expect(container.classList.contains('is-compact')).toBe(false);
    expect(compactBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders preview from JSON inside fenced code block', async () => {
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'user', content: 'Please clarify' },
      { role: 'assistant', content: '```json\n[{"action":"From block","tags":[]}]\n```' },
    ]);

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    const text = document.body.textContent || '';
    expect(text).toContain('From block');
  });

  it('falls back to raw rendering when no JSON array is present', async () => {
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'assistant', content: 'Just a plain message' },
    ]);
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    const text = document.body.textContent || '';
    expect(text).toContain('Just a plain message');
  });

  it('shows a notice and does not send when input is empty', async () => {
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await (view as any).handleSend('  ');
    expect((Notice as unknown as jest.Mock).mock.calls.some(args => String(args[0]).includes('Enter a message'))).toBe(true);
    expect(mockConversation.send).not.toHaveBeenCalled();
    expect(mockConversation.sendInitialWithPrompt).not.toHaveBeenCalled();
  });

  it('falls back to last markdown leaf when no active view and reveals it', async () => {
    const editor1 = { getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }), replaceRange: jest.fn() };
    const editor2 = { getCursor: jest.fn().mockReturnValue({ line: 1, ch: 0 }), replaceRange: jest.fn() };
    const leaf1 = { view: { editor: editor1, file: { name: 'one.md' } } };
    const leaf2 = { view: { editor: editor2, file: { name: 'two.md' } } };
    (mockPlugin.app.workspace as any).getActiveViewOfType = jest.fn().mockReturnValue(null);
    (mockPlugin.app.workspace as any).getLeavesOfType = jest.fn().mockReturnValue([leaf1, leaf2]);
    (mockPlugin.app.workspace as any).revealLeaf = jest.fn();

    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'assistant', content: '[{"action":"A","tags":[]}]' },
    ]);

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();

    expect((mockPlugin.app.workspace as any).revealLeaf).toHaveBeenCalledWith(leaf2);
    expect(editor2.replaceRange).toHaveBeenCalled();
    expect(editor1.replaceRange).not.toHaveBeenCalled();
  });

  it('does not insert when no tasks match current note context', async () => {
    // Only waiting/someday items in a next-actions note
    mockConversation.prepareForInsert = jest.fn().mockResolvedValue({
      success: true,
      actions: [
        { type: 'waiting_for', action: 'Wait for X', tags: [] },
        { type: 'someday_maybe', action: 'Maybe Y', tags: [] },
      ],
      original_text: '',
      processing_time_ms: 0,
    } as any);

    const editor = (mockPlugin.app.workspace.getActiveViewOfType() as any).editor;
    (mockPlugin.app.workspace.getActiveViewOfType() as any).file = { name: 'next-actions.md' };

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();

    expect(editor.replaceRange).not.toHaveBeenCalled();
    expect(mockPlugin.clarificationService.convertToTasksFormat).not.toHaveBeenCalled();
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

  it('Close button detaches leaf and New Chat resets thread', async () => {
    // Provide an assistant message so Insert would be enabled
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: '[{"action":"A","tags":[]}]' },
    ]);
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    const newChatBtn = Array.from(document.body.querySelectorAll('.gtd-toolbar-right .gtd-toolbar-btn')).find(b => b.textContent === 'New Chat') as HTMLButtonElement;
    expect(newChatBtn).toBeTruthy();
    newChatBtn.click();
    expect(mockConversation.resetThread).toHaveBeenCalled();

    const closeBtn = document.body.querySelector('.gtd-toolbar-right .gtd-close-btn') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(mockPlugin.app.workspace.detachLeavesOfType).toHaveBeenCalledWith('gtd-assistant-view');
  });

  it('disables Insert until an assistant reply exists', async () => {
    mockConversation.getThread = jest.fn().mockReturnValue([{ role: 'user', content: 'Hi' }]);
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    const insertBtn = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent === 'Insert Tasks') as HTMLButtonElement; // explicit match
    expect(insertBtn.disabled).toBe(true);

    // Now simulate an assistant reply and refresh
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: '[{"action":"A","tags":[]}]' },
    ]);
    (view as any).refreshMessages();
    expect(insertBtn.disabled).toBe(false);
  });

  it('auto-scrolls messages to bottom after rendering', async () => {
    // Provide a couple of messages
    mockConversation.getThread = jest.fn().mockReturnValue([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: '[{"action":"A","tags":[]}]' },
      { role: 'assistant', content: '[{"action":"B","tags":[]}]' },
    ]);

    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();

    const messages = document.body.querySelector('.gtd-assistant-messages') as HTMLElement;
    // Mock scrollHeight and capture scrollTop set
    Object.defineProperty(messages, 'scrollHeight', { value: 999, configurable: true });
    let setTop = 0;
    Object.defineProperty(messages, 'scrollTop', { 
      set: (v) => { setTop = v as number; },
      get: () => setTop,
      configurable: true,
    });

    // Force a refresh to trigger auto-scroll
    (view as any).refreshMessages();
    expect(setTop).toBe(999);
  });
});
