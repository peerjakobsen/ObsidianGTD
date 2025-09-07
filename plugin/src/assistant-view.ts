import { ItemView, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import type ObsidianGTDPlugin from './main';
import { createConversationService, GTDConversationService } from './conversation-service';
import { createBedrockServiceClient } from './bedrock-client';
import { GTDLogger } from './logger';

export const GTD_ASSISTANT_VIEW_TYPE = 'gtd-assistant-view';

export class GTDAssistantView extends ItemView {
  private plugin: ObsidianGTDPlugin;
  private conversation: GTDConversationService;
  private logger = GTDLogger.getInstance();

  // UI state
  private didAutoSendInitial = false;
  private isSending = false;
  private lastError: string | null = null;

  // UI elements
  private container!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private insertBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private statusEl!: HTMLElement;
  private closeBtn!: HTMLButtonElement;
  private newChatBtn!: HTMLButtonElement;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianGTDPlugin, deps?: { conversationService?: GTDConversationService }) {
    super(leaf);
    this.plugin = plugin;

    // Allow dependency injection for tests
    if (deps?.conversationService) {
      this.conversation = deps.conversationService;
    } else {
      const cfg = this.plugin.settings;
      const bedrock = createBedrockServiceClient(cfg.awsBearerToken, cfg.awsRegion, cfg.awsBedrockModelId, { timeout: cfg.timeout });
      this.conversation = createConversationService(bedrock, { strictJsonMode: true });
    }
  }

  getViewType(): string {
    return GTD_ASSISTANT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'GTD Assistant';
  }

  async onOpen(): Promise<void> {
    this.container = document.createElement('div');
    this.container.className = 'gtd-assistant-view';
    const host: HTMLElement = (this as any).containerEl ?? document.body;
    host.appendChild(this.container);
    this.render();
    try { this.inputEl?.focus(); } catch (e) { /* ignore */ }

    // Preload selection and auto-send on first open
    if (!this.didAutoSendInitial) {
      this.didAutoSendInitial = true;
      const selection = this.getCurrentSelection();
      if (selection) {
        // Treat initial selection as the first message
        await this.handleSend(selection);
      }
    }
  }

  async onClose(): Promise<void> {
    // No-op; DOM will be cleaned by Obsidian
  }

  // Controller: Send message
  async handleSend(text?: string): Promise<void> {
    const message = (text ?? this.inputEl?.value ?? '').trim();
    if (!message) {
      new Notice('Enter a message to send');
      return;
    }

    this.setSending(true, 'Sending…');
    this.lastError = null;
    try {
      await this.conversation.send(message);
      this.refreshMessages();
      if (!text && this.inputEl) this.inputEl.value = '';
      this.setStatus('Ready');
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.lastError = msg;
      this.setStatus(`Error: ${msg}`);
      new Notice(`GTD Assistant error: ${msg}`);
    } finally {
      this.setSending(false);
    }
  }

  // Controller: Insert tasks at cursor
  async handleInsertTasks(): Promise<void> {
    this.setSending(true, 'Preparing tasks for insert…');
    this.lastError = null;
    try {
      const result = await this.conversation.prepareForInsert();

      // Determine target markdown view (active or last open) first
      const ws: any = this.plugin.app?.workspace;
      let view = ws?.getActiveViewOfType?.(MarkdownView);
      let leaf: any = null;
      if (!view || !(view as any).editor) {
        const leaves = ws?.getLeavesOfType?.('markdown');
        if (leaves && leaves.length > 0) {
          leaf = leaves[leaves.length - 1];
          view = leaf.view;
        }
      }

      // Determine note context by filename and filter actions accordingly
      const fileName: string = ((view as any)?.file?.name) || ((view as any)?.file?.basename) || ((view as any)?.file?.path) || '';
      const context = this.getNoteContext(fileName);
      const filteredActions = this.filterActionsForNoteContext(result.actions || [], context);

      if (filteredActions.length === 0) {
        new Notice('No tasks to insert for this note');
        this.setStatus('Nothing to insert');
        return;
      }

      const filteredResult = { ...result, actions: filteredActions } as any;
      const lines = this.plugin.clarificationService.convertToTasksFormat(filteredResult);

      // Insert at cursor in markdown editor: prefer active view, else fall back to last markdown leaf
      // 'view' and 'leaf' already resolved above

      if (leaf && ws?.revealLeaf) {
        try { ws.revealLeaf(leaf); } catch (e) { /* ignore */ }
      }

      if (view && (view as any).editor) {
        const editor = (view as any).editor;
        const cursor = editor.getCursor();
        const text = '\n' + lines.join('\n') + '\n';
        try {
          editor.replaceRange(text, cursor);
        } catch (e) {
          // In tests/mocks, replaceRange may be missing
        }
        new Notice(`Inserted ${lines.length} task(s)`);
        this.setStatus('Tasks inserted');
      } else {
        new Notice('No markdown editor found. Open a note in edit mode and try again.');
        this.setStatus('Editor not found');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.lastError = msg;
      this.setStatus(`Error: ${msg}`);
      new Notice(`Failed to prepare tasks: ${msg}`);
    } finally {
      this.setSending(false);
    }
  }

  private getNoteContext(fileName: string): 'next' | 'waiting' | 'someday' | 'unknown' {
    const f = (fileName || '').toLowerCase();
    if (f.includes('waiting-for')) return 'waiting';
    if (f.includes('someday-maybe')) return 'someday';
    if (f.includes('next-actions') || f.includes('next_action') || f.includes('next-actions')) return 'next';
    return 'unknown';
  }

  private filterActionsForNoteContext(actions: Array<any>, context: 'next' | 'waiting' | 'someday' | 'unknown') {
    switch (context) {
      case 'next':
        return actions.filter(a => (a?.type === 'next_action') && !this.hasTag(a, '#waiting') && !this.hasTag(a, '#someday'));
      case 'waiting':
        return actions.filter(a => a?.type === 'waiting_for' || this.hasTag(a, '#waiting'));
      case 'someday':
        return actions.filter(a => a?.type === 'someday_maybe' || this.hasTag(a, '#someday'));
      default:
        return actions;
    }
  }

  private hasTag(action: any, tag: string): boolean {
    const tags: string[] = Array.isArray(action?.tags) ? action.tags : [];
    return tags.some(t => (t || '').toLowerCase() === tag.toLowerCase());
  }

  // Controller: Clear thread and UI
  handleClear(): void {
    this.conversation.resetThread();
    this.refreshMessages();
    this.setStatus('Cleared');
  }

  // ————— UI helpers —————
  private render(): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'gtd-assistant-header';
    const bar = document.createElement('div');
    bar.className = 'gtd-toolbar';
    const title = document.createElement('h3');
    title.textContent = 'GTD Assistant';
    const right = document.createElement('div');
    right.className = 'gtd-toolbar-right';
    this.newChatBtn = document.createElement('button');
    this.newChatBtn.textContent = 'New Chat';
    this.newChatBtn.className = 'gtd-toolbar-btn';
    this.newChatBtn.addEventListener('click', () => { this.handleClear(); this.inputEl?.focus(); });
    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = 'Close';
    this.closeBtn.className = 'gtd-toolbar-btn';
    this.closeBtn.addEventListener('click', () => {
      try {
        const ws: any = this.plugin?.app?.workspace;
        if (ws?.detachLeavesOfType) {
          ws.detachLeavesOfType(GTD_ASSISTANT_VIEW_TYPE);
        } else if ((this as any).leaf?.detach) {
          (this as any).leaf.detach();
        }
      } catch (e) { /* ignore */ }
    });
    right.appendChild(this.newChatBtn);
    right.appendChild(this.closeBtn);
    bar.appendChild(title);
    bar.appendChild(right);
    header.appendChild(bar);
    this.container.appendChild(header);

    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'gtd-assistant-messages';
    this.container.appendChild(this.messagesEl);
    this.refreshMessages();

    const inputWrap = document.createElement('div');
    inputWrap.className = 'gtd-assistant-input';
    this.container.appendChild(inputWrap);

    this.inputEl = document.createElement('textarea');
    this.inputEl.rows = 3;
    this.inputEl.placeholder = 'Type a message…';
    inputWrap.appendChild(this.inputEl);
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      const isSend = e.key === 'Enter' && ((e as any).metaKey || (e as any).ctrlKey);
      if (isSend) { e.preventDefault(); this.handleSend(); }
    });

    const btnRow = document.createElement('div');
    btnRow.className = 'gtd-assistant-buttons';
    inputWrap.appendChild(btnRow);

    this.sendBtn = document.createElement('button');
    this.sendBtn.textContent = 'Send';
    btnRow.appendChild(this.sendBtn);

    this.insertBtn = document.createElement('button');
    this.insertBtn.textContent = 'Insert Tasks';
    btnRow.appendChild(this.insertBtn);

    this.clearBtn = document.createElement('button');
    this.clearBtn.textContent = 'Clear';
    btnRow.appendChild(this.clearBtn);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'gtd-assistant-status';
    this.statusEl.textContent = 'Ready';
    inputWrap.appendChild(this.statusEl);

    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.insertBtn.addEventListener('click', () => this.handleInsertTasks());
    this.clearBtn.addEventListener('click', () => this.handleClear());
    this.updateButtonStates();
  }

  private refreshMessages(): void {
    if (!this.messagesEl) return;
    this.messagesEl.textContent = '';
    const thread = this.conversation.getThread();
    if (thread.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gtd-msg-empty';
      empty.textContent = 'No messages yet';
      this.messagesEl.appendChild(empty);
      return;
    }
    for (const m of thread) {
      const row = document.createElement('div');
      row.className = `gtd-msg gtd-msg-${m.role}`;
      const role = document.createElement('div');
      role.className = 'gtd-msg-role';
      role.textContent = m.role === 'user' ? 'You' : 'Assistant';
      row.appendChild(role);

      if (m.role === 'assistant') {
        this.renderAssistantContent(row, m.content);
      } else {
        const content = document.createElement('div');
        content.className = 'gtd-msg-content';
        content.textContent = m.content;
        row.appendChild(content);
      }
      this.messagesEl.appendChild(row);
    }
    // Auto-scroll to bottom after rendering
    try {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    } catch (e) {
      // ignore in test environments
    }
    this.updateButtonStates();
  }

  // Try to render assistant output as a tasks preview when it contains a JSON array
  private renderAssistantContent(container: HTMLElement, text: string): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'gtd-msg-content';

    const parsed = this.tryParseActions(text);
    if (!parsed) {
      // Fallback: show raw
      wrapper.textContent = text;
      container.appendChild(wrapper);
      return;
    }

    // Build preview using convertToTasksFormat
    const preview = document.createElement('div');
    preview.className = 'gtd-msg-preview';
    const result = { success: true, actions: parsed, original_text: text, processing_time_ms: 0 } as any;
    const lines = this.plugin.clarificationService.convertToTasksFormat(result);
    for (const line of lines) {
      const lineEl = document.createElement('div');
      lineEl.className = 'gtd-task-line';
      lineEl.textContent = line;
      preview.appendChild(lineEl);
    }

    // Raw JSON view
    const raw = document.createElement('pre');
    raw.className = 'gtd-msg-raw';
    raw.textContent = text;
    raw.style.display = 'none';

    // Toggle control
    const toggle = document.createElement('a');
    toggle.href = '#';
    toggle.textContent = 'View raw JSON';
    toggle.className = 'gtd-toggle-raw';
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const showingRaw = raw.style.display !== 'none';
      if (showingRaw) {
        raw.style.display = 'none';
        preview.style.display = '';
        toggle.textContent = 'View raw JSON';
      } else {
        raw.style.display = '';
        preview.style.display = 'none';
        toggle.textContent = 'View preview';
      }
    });

    wrapper.appendChild(preview);
    wrapper.appendChild(raw);
    wrapper.appendChild(toggle);
    container.appendChild(wrapper);
  }

  // Extract actions array from assistant text; tolerant of fenced code blocks
  private tryParseActions(text: string): Array<any> | null {
    try {
      let jsonContent = text;
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }
      // If text contains prose + JSON, attempt to isolate first array
      if (!codeBlockMatch && !/^[\s\n]*\[/.test(jsonContent.trim())) {
        const firstArray = jsonContent.match(/\[[\s\S]*\]/);
        if (firstArray) jsonContent = firstArray[0];
      }
      const parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) return null;
      // Normalize minimal fields
      return parsed.map((item: any) => ({
        type: item.type || 'next_action',
        action: String(item.action || '').trim(),
        context: item.context || '',
        project: item.project || '',
        due_date: item.due_date || '',
        priority: item.priority || 'normal',
        scheduled_date: item.scheduled_date || '',
        start_date: item.start_date || '',
        recurrence: item.recurrence || '',
        time_estimate: item.time_estimate || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
      })).filter((a: any) => a.action);
    } catch {
      return null;
    }
  }

  private setSending(sending: boolean, statusWhenSending?: string): void {
    this.isSending = sending;
    if (this.sendBtn) this.sendBtn.disabled = sending;
    this.updateButtonStates();
    if (this.clearBtn) this.clearBtn.disabled = false; // Clear stays enabled
    if (sending && statusWhenSending) this.setStatus(statusWhenSending);
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  private updateButtonStates(): void {
    if (!this.sendBtn || !this.insertBtn) return;
    const thread = this.conversation.getThread();
    const hasAssistant = thread.some(m => m.role === 'assistant');
    this.sendBtn.disabled = !!this.isSending;
    this.insertBtn.disabled = !!this.isSending || !hasAssistant;
  }

  private getCurrentSelection(): string | null {
    try {
      const view = this.plugin.app?.workspace?.getActiveViewOfType(MarkdownView);
      const sel = (view as any)?.editor?.getSelection?.();
      const s = typeof sel === 'string' ? sel.trim() : '';
      return s?.length ? s : null;
    } catch (e) {
      this.logger.debug('AssistantView', 'Selection not available in this environment');
      return null;
    }
  }
}
