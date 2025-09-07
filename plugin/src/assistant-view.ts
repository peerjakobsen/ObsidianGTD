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
      const lines = this.plugin.clarificationService.convertToTasksFormat(result);

      // Insert at cursor in active markdown editor
      const view = this.plugin.app?.workspace?.getActiveViewOfType(MarkdownView);
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
      } else {
        new Notice('No active markdown editor to insert tasks');
      }
      this.setStatus('Tasks inserted');
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.lastError = msg;
      this.setStatus(`Error: ${msg}`);
      new Notice(`Failed to prepare tasks: ${msg}`);
    } finally {
      this.setSending(false);
    }
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
    const h3 = document.createElement('h3');
    h3.textContent = 'GTD Assistant';
    header.appendChild(h3);
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
      const content = document.createElement('div');
      content.className = 'gtd-msg-content';
      content.textContent = m.content;
      row.appendChild(role);
      row.appendChild(content);
      this.messagesEl.appendChild(row);
    }
  }

  private setSending(sending: boolean, statusWhenSending?: string): void {
    this.isSending = sending;
    if (this.sendBtn) this.sendBtn.disabled = sending;
    if (this.insertBtn) this.insertBtn.disabled = sending;
    if (this.clearBtn) this.clearBtn.disabled = false; // Clear stays enabled
    if (sending && statusWhenSending) this.setStatus(statusWhenSending);
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
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
