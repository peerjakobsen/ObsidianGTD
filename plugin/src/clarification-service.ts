/**
 * GTD Clarification Service
 * Orchestrates the full clarification workflow: prompt generation, API communication, and response processing
 */

import { GTDPromptGenerator } from './gtd-prompts';
import { BedrockClient, BedrockResponse, BedrockClientError } from './bedrock-client';
import { GTDSettings } from './settings';
import { GTDLogger } from './logger';

export interface GTDActionType {
  type: 'next_action' | 'waiting_for' | 'someday_maybe';
  action: string;
  context?: string;
  project?: string;
  due_date?: string;
  priority?: 'highest' | 'high' | 'medium' | 'normal' | 'low' | 'lowest';
  scheduled_date?: string;
  start_date?: string;
  recurrence?: string;
  time_estimate?: string;
  tags: string[];
}

export interface ClarificationResult {
  success: boolean;
  actions: GTDActionType[];
  original_text: string;
  processing_time_ms: number;
  error?: string;
  model_used?: string;
  tokens_used?: number;
  performance_metrics?: {
    original_length: number;
    processed_length: number;
    optimization_applied: boolean;
    processing_time_ms: number;
  };
}

export interface ClarificationOptions {
  inputType?: 'note' | 'email' | 'meeting_notes' | 'general';
  model?: string;
  max_tokens?: number;
  temperature?: number;
  includeDebugInfo?: boolean;
}

export class GTDClarificationService {
  private bedrockClient: BedrockClient;
  private settings: GTDSettings;
  private logger = GTDLogger.getInstance();

  constructor(bedrockClient: BedrockClient, settings: GTDSettings) {
    this.bedrockClient = bedrockClient;
    this.settings = settings;
  }

  /**
   * Main clarification method - processes inbox text into GTD actions
   * Includes performance optimizations for large text inputs
   */
  async clarifyInboxText(
    inboxText: string,
    options: ClarificationOptions = {}
  ): Promise<ClarificationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Performance pre-checks and input validation
      const validation = GTDPromptGenerator.validateInput(inboxText);
      if (!validation.isValid) {
        return {
          success: false,
          actions: [],
          original_text: inboxText,
          processing_time_ms: Date.now() - startTime,
          error: validation.error
        };
      }

      let processedText = validation.sanitizedText!;

      // Step 2: Handle large text inputs with chunking and summarization
      const maxInputLength = 5000; // Default max length before optimization
      if (processedText.length > maxInputLength) {
        processedText = await this.optimizeForLargeText(processedText, options);
      }

      // Step 3: Generate optimized prompt with performance hints
      const prompt = GTDPromptGenerator.generatePrompt(
        processedText,
        options.inputType
      );

      // Step 4: Make Bedrock request (optimization handled in prompt generation)
      const fullPrompt = prompt.systemPrompt + '\n\n' + prompt.userPrompt;
      const bedrockResponse = await this.bedrockClient.generateText(fullPrompt);

      // Step 5: Parse and validate response
      const clarificationResult = this.parseBedrockResponse(
        bedrockResponse,
        processedText,
        Date.now() - startTime
      );

      // Add performance metrics
      clarificationResult.performance_metrics = {
        original_length: inboxText.length,
        processed_length: processedText.length,
        optimization_applied: inboxText.length !== processedText.length,
        processing_time_ms: clarificationResult.processing_time_ms
      };

      return clarificationResult;

    } catch (error) {
      return {
        success: false,
        actions: [],
        original_text: inboxText,
        processing_time_ms: Date.now() - startTime,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Parse Bedrock response into structured GTD actions
   */
  private parseBedrockResponse(
    bedrockResponse: BedrockResponse,
    originalText: string,
    processingTime: number
  ): ClarificationResult {
    try {
      // Check if the Bedrock response indicates an error
      if (bedrockResponse.status === 'error') {
        throw new Error(`Bedrock processing failed: ${bedrockResponse.result}`);
      }

      // Parse JSON content from Bedrock response, handling markdown code blocks
      let jsonContent = bedrockResponse.result;
      
      // Check if the response is wrapped in markdown code blocks
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }
      
      const rawActions = JSON.parse(jsonContent);
      
      if (!Array.isArray(rawActions)) {
        throw new Error('API response is not an array of actions');
      }

      // Validate and normalize each action
      const actions: GTDActionType[] = rawActions.map((rawAction, index) => {
        return this.validateAndNormalizeAction(rawAction, index);
      });

      // Filter out any invalid actions
      const validActions = actions.filter(action => action !== null);

      return {
        success: true,
        actions: validActions,
        original_text: originalText,
        processing_time_ms: processingTime,
        model_used: bedrockResponse.metadata.model,
        tokens_used: bedrockResponse.metadata.tokens_used
      };

    } catch (parseError) {
      // Fallback: create manual review action
      const fallbackAction: GTDActionType = {
        type: 'next_action',
        action: `Review and manually process: "${originalText.substring(0, 50)}${originalText.length > 50 ? '...' : ''}"`,
        context: '@computer',
        project: 'Inbox Processing',
        tags: ['#manual-review', '#parse-error']
      };

      return {
        success: false,
        actions: [fallbackAction],
        original_text: originalText,
        processing_time_ms: processingTime,
        error: `Failed to parse API response: ${parseError.message}`
      };
    }
  }

  /**
   * Validate and normalize a single action from API response
   */
  private validateAndNormalizeAction(rawAction: any, index: number): GTDActionType {
    // Validate required fields
    if (!rawAction.action || typeof rawAction.action !== 'string') {
      throw new Error(`Action ${index + 1} missing or invalid action field`);
    }

    // Validate action type
    const validTypes = ['next_action', 'waiting_for', 'someday_maybe'];
    const actionType = rawAction.type || 'next_action';
    if (!validTypes.includes(actionType)) {
      throw new Error(`Action ${index + 1} has invalid type: ${actionType}`);
    }

    // Normalize and validate tags
    const tags = Array.isArray(rawAction.tags) ? rawAction.tags : [];
    const normalizedTags = tags
      .filter((tag: any) => typeof tag === 'string')
      .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`);

    // Add default tags based on action type
    if (actionType === 'waiting_for' && !normalizedTags.includes('#waiting')) {
      normalizedTags.push('#waiting');
    }
    if (actionType === 'someday_maybe' && !normalizedTags.includes('#someday')) {
      normalizedTags.push('#someday');
    }

    // Add #task tag to all actions for Obsidian Tasks plugin
    if (!normalizedTags.includes('#task')) {
      normalizedTags.push('#task');
    }

    // Enhanced context validation and normalization
    const context = this.validateAndNormalizeContext(rawAction.context || '');

    // Validate date formats
    let dueDate = rawAction.due_date || '';
    let scheduledDate = rawAction.scheduled_date || '';
    let startDate = rawAction.start_date || '';
    
    if (dueDate && !this.isValidDateFormat(dueDate)) {
      this.logger.warn('ClarificationService', `Invalid due date format for action ${index + 1}: ${dueDate}`);
      dueDate = '';
    }
    if (scheduledDate && !this.isValidDateFormat(scheduledDate)) {
      this.logger.warn('ClarificationService', `Invalid scheduled date format for action ${index + 1}: ${scheduledDate}`);
      scheduledDate = '';
    }
    if (startDate && !this.isValidDateFormat(startDate)) {
      this.logger.warn('ClarificationService', `Invalid start date format for action ${index + 1}: ${startDate}`);
      startDate = '';
    }

    // Validate priority
    const validPriorities = ['highest', 'high', 'medium', 'normal', 'low', 'lowest'];
    const priority = rawAction.priority || 'normal';
    if (!validPriorities.includes(priority)) {
      this.logger.warn('ClarificationService', `Invalid priority for action ${index + 1}: ${priority}`);
    }

    // Enhanced time estimate parsing and validation
    const timeEstimate = this.parseAndValidateTimeEstimate(rawAction.time_estimate || '');
    if (rawAction.time_estimate && !timeEstimate) {
      this.logger.warn('ClarificationService', `Invalid time estimate format for action ${index + 1}: ${rawAction.time_estimate}`);
    }

    return {
      type: actionType as 'next_action' | 'waiting_for' | 'someday_maybe',
      action: rawAction.action.trim(),
      context: context || this.inferContext(rawAction.action),
      project: rawAction.project || '',
      due_date: dueDate,
      priority: validPriorities.includes(priority) ? priority as 'highest' | 'high' | 'medium' | 'normal' | 'low' | 'lowest' : 'normal',
      scheduled_date: scheduledDate,
      start_date: startDate,
      recurrence: rawAction.recurrence || '',
      time_estimate: timeEstimate,
      tags: normalizedTags
    };
  }

  /**
   * Infer context from action text if not provided
   */
  private inferContext(actionText: string): string {
    const contexts = GTDPromptGenerator.getSuggestedContexts(actionText);
    return contexts[0]; // Return the first suggested context
  }

  /**
   * Basic date format validation (YYYY-MM-DD)
   */
  private isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Enhanced context tag validation and normalization
   * Validates against predefined GTD contexts and normalizes format
   */
  private validateAndNormalizeContext(context: string): string {
    if (!context) {
      return '';
    }

    // Normalize to lowercase and ensure @ prefix
    let normalizedContext = context.toLowerCase().trim();
    if (!normalizedContext.startsWith('@')) {
      normalizedContext = `@${normalizedContext}`;
    }

    // Predefined GTD contexts from spec
    const validContexts = [
      '@computer',
      '@phone', 
      '@errands',
      '@home',
      '@office',
      '@anywhere'
    ];

    // Validate against standard contexts and add telemetry
    const isStandardContext = validContexts.includes(normalizedContext.toLowerCase());

    if (!isStandardContext && normalizedContext) {
      // Log telemetry for non-standard context usage
      this.logger.info('ClarificationService', 
        `Non-standard GTD context used: ${normalizedContext}`, {
        context: normalizedContext,
        telemetry: true,
        type: 'custom_context'
      });
    }

    // Return normalized context (maintaining flexibility)
    return normalizedContext;
  }

  /**
   * Enhanced time estimate parsing with comprehensive format validation
   * Supports: #5m, #10m, #15m, #30m, #45m, #1h, #2h, #3h, #4h
   */
  private parseAndValidateTimeEstimate(timeString: string): string {
    if (!timeString) {
      return '';
    }

    const trimmed = timeString.trim();
    if (!trimmed) {
      return '';
    }

    // Remove # prefix if present for validation
    const withoutHash = trimmed.startsWith('#') ? trimmed.substring(1) : trimmed;
    
    // Valid time patterns from spec
    const validTimeFormats = [
      // Minutes: 5m, 10m, 15m, 30m, 45m
      /^(5|10|15|30|45)m$/i,
      // Hours: 1h, 2h, 3h, 4h  
      /^(1|2|3|4)h$/i
    ];

    // Check if format matches any valid pattern
    const isValidFormat = validTimeFormats.some(pattern => pattern.test(withoutHash));
    
    if (!isValidFormat) {
      return ''; // Invalid format, return empty
    }

    // Return normalized format (without # prefix as per current implementation)
    return withoutHash;
  }

  /**
   * Time estimate validation for format like #30m, #1h, #2h, #15m
   * @deprecated Use parseAndValidateTimeEstimate instead
   */
  private isValidTimeEstimate(timeString: string): boolean {
    const timeRegex = /^#?\d+[mh]$/i;
    return timeRegex.test(timeString.trim());
  }

  /**
   * Format error messages for user display
   */
  private formatError(error: any): string {
    if (error instanceof BedrockClientError) {
      return `Bedrock Error: ${error.message}`;
    }
    
    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (error.message?.includes('Network request failed')) {
      return 'Unable to connect to AWS Bedrock service. Please check your bearer token and network connection.';
    }

    return `Unexpected error: ${error.message || 'Unknown error occurred'}`;
  }

  /**
   * Convert clarification result to Obsidian Tasks format
   */
  convertToTasksFormat(clarificationResult: ClarificationResult): string[] {
    if (!clarificationResult.success || clarificationResult.actions.length === 0) {
      return [`- [ ] ${clarificationResult.error || 'No actions generated'}`];
    }

    return clarificationResult.actions.map(action => {
      let taskLine = `- [ ] ${action.action}`;

      // Add time estimate as hashtag if present
      if (action.time_estimate) {
        const timeEstimate = action.time_estimate.startsWith('#') ? action.time_estimate : `#${action.time_estimate}`;
        taskLine += ` ${timeEstimate}`;
      }

      // Add due date if present
      if (action.due_date) {
        taskLine += ` 📅 ${action.due_date}`;
      }

      // Add scheduled date if present
      if (action.scheduled_date) {
        taskLine += ` ⏳ ${action.scheduled_date}`;
      }

      // Add start date if present
      if (action.start_date) {
        taskLine += ` 🛫 ${action.start_date}`;
      }

      // Add priority symbol
      if (action.priority && action.priority !== 'normal') {
        const prioritySymbol = this.getPrioritySymbol(action.priority);
        taskLine += ` ${prioritySymbol}`;
      }

      // Add recurrence if present
      if (action.recurrence) {
        taskLine += ` 🔁 ${action.recurrence}`;
      }

      // Add project if present (as wiki link)
      if (action.project) {
        taskLine += ` [[${action.project}]]`;
      }

      // Add context
      if (action.context) {
        taskLine += ` ${action.context}`;
      }

      // Add tags (excluding time estimate which was already added)
      if (action.tags.length > 0) {
        const filteredTags = action.tags.filter(tag => 
          !tag.match(/^#\d+[mh]$/i) // Exclude time estimate tags
        );
        if (filteredTags.length > 0) {
          taskLine += ` ${filteredTags.join(' ')}`;
        }
      }

      // Add completion status (for tasks that should be marked as done/deleted)
      taskLine += ' 🏁 delete';

      return taskLine;
    });
  }

  /**
   * Get priority symbol for Tasks plugin
   */
  private getPrioritySymbol(priority: string): string {
    const priorityMap: Record<string, string> = {
      'highest': '🔺',
      'high': '⬆️',
      'medium': '🔼',
      'low': '🔽',
      'lowest': '⬇️'
    };
    return priorityMap[priority] || '';
  }

  /**
   * Test connection to the AWS Bedrock service
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    return this.bedrockClient.testConnection();
  }

  /**
   * Update service settings
   */
  updateSettings(newSettings: GTDSettings): void {
    this.settings = newSettings;
    this.bedrockClient.updateConfig({
      bearerToken: newSettings.awsBearerToken,
      region: newSettings.awsRegion,
      modelId: newSettings.awsBedrockModelId,
      timeout: newSettings.timeout
    });
  }

  /**
   * Get service statistics and configuration info
   */
  getServiceInfo(): {
    hasValidConfig: boolean;
    region: string;
    modelId: string;
    hasBearerToken: boolean;
    timeout: number;
  } {
    const config = this.bedrockClient.getConfig();
    return {
      hasValidConfig: config.hasBearerToken && !!config.region,
      region: config.region,
      modelId: config.modelId,
      hasBearerToken: config.hasBearerToken,
      timeout: config.timeout ?? this.settings.timeout
    };
  }

  /**
   * Optimize large text inputs for better performance
   * Implements text chunking and intelligent summarization
   */
  private async optimizeForLargeText(
    text: string, 
    options: ClarificationOptions
  ): Promise<string> {
    const maxLength = 5000; // Default max length for processing
    
    if (text.length <= maxLength) {
      return text;
    }

    // Strategy 1: Extract actionable sentences and key phrases
    const actionableKeywords = [
      'call', 'email', 'send', 'review', 'schedule', 'meet', 'follow up',
      'complete', 'finish', 'create', 'update', 'contact', 'discuss',
      'tomorrow', 'today', 'this week', 'next week', 'urgent', 'asap',
      'deadline', 'due', 'by friday', 'by end of week'
    ];

    // Split text into sentences and prioritize those with actionable content
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const prioritizedSentences: { sentence: string; score: number }[] = [];

    sentences.forEach(sentence => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // Score based on actionable keywords
      actionableKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          score += keyword.length > 6 ? 3 : 2; // Longer keywords get higher scores
        }
      });

      // Boost score for time-sensitive content
      if (lowerSentence.match(/\b(today|tomorrow|urgent|asap|deadline)\b/)) {
        score += 5;
      }

      // Boost score for person references
      if (lowerSentence.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/)) {
        score += 2;
      }

      prioritizedSentences.push({ sentence: sentence.trim(), score });
    });

    // Sort by score and take the most actionable content
    prioritizedSentences.sort((a, b) => b.score - a.score);
    
    let optimizedText = '';
    let currentLength = 0;
    
    // Add high-scoring sentences first
    for (const item of prioritizedSentences) {
      if (currentLength + item.sentence.length < maxLength - 100) { // Leave buffer for summary
        optimizedText += item.sentence + ' ';
        currentLength += item.sentence.length;
      } else {
        break;
      }
    }

    // If we still have space, add a summary note
    if (currentLength < maxLength - 200) {
      const remainingContent = text.length - currentLength;
      if (remainingContent > 100) {
        optimizedText += `\n[Note: Original text was ${text.length} characters. This is a focused extraction of actionable content. ${remainingContent} characters of additional context omitted.]`;
      }
    }

    return optimizedText.trim();
  }

  /**
   * Get optimized API options based on text length and user preferences
   */
  private getOptimizedAPIOptions(
    textLength: number, 
    options: ClarificationOptions
  ): any {
    const baseOptions = {
      max_tokens: options.max_tokens || 1500,
      temperature: options.temperature || 0.1
    };

    // Optimize based on text length
    if (textLength > 3000) {
      // For large texts, request more focused, concise responses
      baseOptions.max_tokens = Math.min(baseOptions.max_tokens, 1000);
      baseOptions.temperature = 0.05; // More deterministic for large texts
    } else if (textLength < 500) {
      // For small texts, allow more creative interpretation
      baseOptions.max_tokens = Math.max(baseOptions.max_tokens, 300);
      baseOptions.temperature = Math.min(0.2, baseOptions.temperature);
    }

    return baseOptions;
  }
}

/**
 * Factory function to create clarification service
 */
export function createClarificationService(settings: GTDSettings): GTDClarificationService {
  const bedrockClient = new BedrockClient({
    bearerToken: settings.awsBearerToken,
    region: settings.awsRegion,
    modelId: settings.awsBedrockModelId,
    timeout: settings.timeout
  });

  return new GTDClarificationService(bedrockClient, settings);
}
