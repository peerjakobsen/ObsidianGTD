// Minimal Bedrock client/response typings to avoid importing heavy AWS SDK types during isolated test compiles
type ConverseMessage = { role: 'user' | 'assistant'; content: string };
type ConverseParams = { system?: string | string[]; messages: ConverseMessage[]; inferenceConfig?: any };
type BedrockResponse = { result: string; metadata?: { tokens_used?: number } };
type BedrockClient = { converse(params: ConverseParams): Promise<BedrockResponse> };
import { Clarify, generatePromptFor, PromptKind } from './gtd-prompts';
import { GTDLogger } from './logger';
import type { GTDActionType, ClarificationResult } from './clarification-service';

export interface ConversationThreadMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationServiceOptions {
  strictJsonMode?: boolean;
  inferenceConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

/**
 * Lightweight conversation service managing a message thread and strict-JSON inserts
 */
export class GTDConversationService {
  private bedrock: BedrockClient;
  private logger = GTDLogger.getInstance();
  private options: Required<ConversationServiceOptions>;

  private systemPrompt: string | string[] | undefined;
  private thread: ConversationThreadMessage[] = [];

  constructor(bedrockClient: BedrockClient, options?: ConversationServiceOptions) {
    this.bedrock = bedrockClient;
    this.options = {
      strictJsonMode: options?.strictJsonMode ?? true,
      inferenceConfig: {
        temperature: options?.inferenceConfig?.temperature ?? 0.1,
        maxTokens: options?.inferenceConfig?.maxTokens ?? 1500,
        topP: options?.inferenceConfig?.topP ?? 0.9,
        stopSequences: options?.inferenceConfig?.stopSequences,
      },
    };
  }

  /** Reset the conversation thread */
  resetThread(): void {
    this.thread = [];
    this.systemPrompt = undefined;
  }

  /** Get a shallow copy of the current thread */
  getThread(): ConversationThreadMessage[] {
    return [...this.thread];
  }

  /**
   * Initialize from current selection. Generates GTD system prompt and a contextual user prompt.
   */
  startFromSelection(selection: string, inputType?: 'note' | 'email' | 'meeting_notes' | 'general'): void {
    const template = Clarify.generatePrompt(selection, inputType);
    this.systemPrompt = template.systemPromptParts || template.systemPrompt;
    this.thread = [{ role: 'user', content: template.userPrompt }];
  }

  /**
   * Initialize with an explicit prompt kind (e.g., clarify, weekly_review_next_actions)
   */
  startWithPrompt(kind: PromptKind, text: string, inputType?: 'note' | 'email' | 'meeting_notes' | 'general'): void {
    const template = generatePromptFor(kind, text, inputType);
    this.systemPrompt = template.systemPromptParts || template.systemPrompt;
    this.thread = [{ role: 'user', content: template.userPrompt }];
  }

  /**
   * Seed the conversation with the chosen prompt and immediately send to Bedrock.
   * Returns assistant content.
   */
  async sendInitialWithPrompt(kind: PromptKind, text: string, inputType?: 'note' | 'email' | 'meeting_notes' | 'general'): Promise<string> {
    this.startWithPrompt(kind, text, inputType);
    const params: ConverseParams = {
      system: this.systemPrompt!,
      messages: this.thread.map(m => ({ role: m.role, content: m.content }) as ConverseMessage),
      inferenceConfig: this.options.inferenceConfig,
    };
    const start = Date.now();
    const response: BedrockResponse = await this.bedrock.converse(params);
    const latency = Date.now() - start;
    this.logger.info('ConversationService', 'send initial response', { ms: latency, tokens: response.metadata?.tokens_used, telemetry: true });
    const assistantContent = response.result;
    this.thread.push({ role: 'assistant', content: assistantContent });
    return assistantContent;
  }

  /**
   * Append a user message and send the full thread to Bedrock.
   * Returns the assistant plain text response and appends it to the thread.
   */
  async send(message: string): Promise<string> {
    if (!this.systemPrompt) {
      // If not started, treat first send as initialization with generic context
      // Default to clarify when no prompt was chosen explicitly
      this.startWithPrompt('clarify', message, 'general');
      // Do not push the same message twice; the generated userPrompt already contains it
    } else {
      this.thread.push({ role: 'user', content: message });
    }

    const params: ConverseParams = {
      system: this.systemPrompt,
      messages: this.thread.map(m => ({ role: m.role, content: m.content }) as ConverseMessage),
      inferenceConfig: this.options.inferenceConfig,
    };

    const start = Date.now();
    const response: BedrockResponse = await this.bedrock.converse(params);
    const latency = Date.now() - start;

    this.logger.info('ConversationService', 'send response', { ms: latency, tokens: response.metadata?.tokens_used, telemetry: true });

    const assistantContent = response.result;
    this.thread.push({ role: 'assistant', content: assistantContent });
    return assistantContent;
  }

  /**
   * Ensure latest assistant output is a strict JSON array. If strict mode is on,
   * append a final instruction asking for JSON-only output, then parse and return actions.
   */
  async prepareForInsert(): Promise<ClarificationResult> {
    // If strict mode, request JSON-only output before parsing
    if (this.options.strictJsonMode) {
      const instruction = 'Now output only a JSON array of tasks as specified earlier, with no prose, no code fences, and no explanations.';
      await this.send(instruction);
    }

    const lastAssistant = [...this.thread].reverse().find(m => m.role === 'assistant');
    const text = lastAssistant?.content || '';

    const start = Date.now();
    const parseResult = this.parseActions(text);
    const ms = Date.now() - start;
    this.logger.info('ConversationService', 'parse insert result', { success: parseResult.success, ms, telemetry: true });
    return parseResult;
  }

  /** Extract and parse actions from model text (tolerant of fenced code blocks) */
  private parseActions(text: string): ClarificationResult {
    const processing_time_ms = 0; // set by caller if desired
    const original_text = text;

    try {
      // Handle ```json ... ``` blocks or plain arrays
      let jsonContent = text;
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }

      const parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected a JSON array');
      }

      // Coerce into GTDActionType minimal shape
      const actions: GTDActionType[] = parsed.map((item: any) => ({
        type: (item.type as any) || 'next_action',
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
      })).filter(a => a.action);

      return {
        success: true,
        actions,
        original_text,
        processing_time_ms,
        model_used: '',
        tokens_used: 0,
      };
    } catch (error: any) {
      const fallback: GTDActionType = {
        type: 'next_action',
        action: `Review and manually process: "${original_text.substring(0, 50)}${original_text.length > 50 ? '...' : ''}"`,
        context: '@computer',
        project: 'Inbox Processing',
        due_date: '',
        priority: 'normal',
        scheduled_date: '',
        start_date: '',
        recurrence: '',
        time_estimate: '',
        tags: ['#manual-review', '#parse-error']
      };

      return {
        success: false,
        actions: [fallback],
        original_text,
        processing_time_ms,
        error: `Failed to parse assistant response: ${error.message}`,
      } as ClarificationResult;
    }
  }
}

export function createConversationService(bedrock: BedrockClient, options?: ConversationServiceOptions): GTDConversationService {
  return new GTDConversationService(bedrock, options);
}
