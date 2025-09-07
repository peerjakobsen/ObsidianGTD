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
});

