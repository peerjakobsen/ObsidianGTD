// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDAssistantView } from '../src/assistant-view';
import type ObsidianGTDPlugin from '../src/main';
import { MarkdownView } from 'obsidian';

jest.mock('obsidian');

describe('GTDAssistantView - note-context filtering', () => {
  let mockPlugin: any;
  let mockConversation: any;
  let leaf: any;
  let mockEditor: any;
  let mockView: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockEditor = { getSelection: jest.fn(), getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }), replaceRange: jest.fn() };
    mockView = new (MarkdownView as any)();
    (mockView as any).editor = mockEditor;
    (mockView as any).file = { name: 'next-actions.md' };

    mockPlugin = {
      app: { workspace: { getActiveViewOfType: jest.fn().mockReturnValue(mockView) } },
      settings: { timeout: 5000, awsBearerToken: 't', awsBedrockModelId: 'm', awsRegion: 'r' },
      clarificationService: { convertToTasksFormat: jest.fn((r: any) => r.actions.map((a: any) => `- [ ] ${a.action} ${a.tags?.join(' ') || ''}`)) }
    } as unknown as ObsidianGTDPlugin & { clarificationService: any };

    mockConversation = {
      send: jest.fn().mockResolvedValue('ok'),
      prepareForInsert: jest.fn().mockResolvedValue({
        success: true,
        actions: [
          { type: 'next_action', action: 'Do A', tags: [] },
          { type: 'waiting_for', action: 'Bob to do B', tags: ['#waiting'] },
          { type: 'someday_maybe', action: 'Consider C', tags: ['#someday'] },
        ],
        original_text: '',
        processing_time_ms: 0,
      }),
      resetThread: jest.fn(),
      getThread: jest.fn().mockReturnValue([{ role: 'assistant', content: '[]' }])
    };

    leaf = { containerEl: document.createElement('div') };
  });

  it('inserts only next actions in next-actions.md', async () => {
    (mockView as any).file = { name: 'next-actions.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Do A');
    expect(inserted).not.toContain('Bob to do B');
    expect(inserted).not.toContain('Consider C');
  });

  it('inserts only waiting items in waiting-for.md', async () => {
    (mockView as any).file = { name: 'waiting-for.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Bob to do B');
    expect(inserted).not.toContain('Do A');
    expect(inserted).not.toContain('Consider C');
  });

  it('inserts only someday items in someday-maybe.md', async () => {
    (mockView as any).file = { name: 'someday-maybe.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Consider C');
    expect(inserted).not.toContain('Do A');
    expect(inserted).not.toContain('Bob to do B');
  });

  it('adds #task tag when inserting from sidebar even if model omitted it', async () => {
    // Return actions without #task tag
    mockConversation.prepareForInsert = jest.fn().mockResolvedValue({
      success: true,
      actions: [ { type: 'next_action', action: 'Do A', tags: [] } ],
      original_text: '',
      processing_time_ms: 0,
    });

    (mockView as any).file = { name: 'next-actions.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('#task');
  });

  it('inserts all items when note context is unknown', async () => {
    (mockView as any).file = { name: 'random.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Do A');
    expect(inserted).toContain('Bob to do B');
    expect(inserted).toContain('Consider C');
  });

  it('excludes #waiting and #someday tagged items from next-actions.md', async () => {
    // Override with data that includes tag-inferred categories
    mockConversation.prepareForInsert = jest.fn().mockResolvedValue({
      success: true,
      actions: [
        { type: 'next_action', action: 'Pure next', tags: [] },
        { type: 'next_action', action: 'Follow up with Dan', tags: ['#waiting'] },
        { type: 'next_action', action: 'Maybe relocate', tags: ['#someday'] },
      ],
      original_text: '',
      processing_time_ms: 0,
    });

    (mockView as any).file = { name: 'next-actions.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Pure next');
    expect(inserted).not.toContain('Follow up with Dan');
    expect(inserted).not.toContain('Maybe relocate');
  });

  it('includes items with #waiting in waiting-for.md even if type is next_action', async () => {
    mockConversation.prepareForInsert = jest.fn().mockResolvedValue({
      success: true,
      actions: [
        { type: 'waiting_for', action: 'Alice to send report', tags: [] },
        { type: 'next_action', action: 'Follow up with Dan', tags: ['#waiting'] },
      ],
      original_text: '',
      processing_time_ms: 0,
    });

    (mockView as any).file = { name: 'waiting-for.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Alice to send report');
    expect(inserted).toContain('Follow up with Dan');
  });

  it('includes items with #someday in someday-maybe.md even if type is next_action', async () => {
    mockConversation.prepareForInsert = jest.fn().mockResolvedValue({
      success: true,
      actions: [
        { type: 'someday_maybe', action: 'Write a novel', tags: [] },
        { type: 'next_action', action: 'Maybe relocate', tags: ['#someday'] },
      ],
      original_text: '',
      processing_time_ms: 0,
    });

    (mockView as any).file = { name: 'someday-maybe.md' };
    const view = new GTDAssistantView(leaf, mockPlugin, { conversationService: mockConversation });
    await view.onOpen();
    await view.handleInsertTasks();
    const inserted = mockEditor.replaceRange.mock.calls[0][0] as string;
    expect(inserted).toContain('Write a novel');
    expect(inserted).toContain('Maybe relocate');
  });
});
