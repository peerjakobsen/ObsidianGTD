/**
 * GTD-specific prompt templates and optimization logic
 * Handles generation of prompts for clarifying inbox text into actionable next actions
 */

export interface GTDPromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

export interface GTDInputContext {
  type: 'note' | 'email' | 'meeting_notes' | 'general';
  hasTimeReference: boolean;
  hasPersonReference: boolean;
  hasLongTermIndicator: boolean;
  textLength: number;
}

export class GTDPromptGenerator {
  /**
   * Base system prompt for GTD clarification
   */
  private static readonly BASE_SYSTEM_PROMPT = `You are a Getting Things Done (GTD) assistant. Your role is to clarify incoming text and identify actionable next actions.

Key GTD principles to follow:
1. A next action is a specific, physical action that moves something forward
2. Each action should be clear and contextual - start with a verb
3. Identify what project/outcome each action relates to
4. Categorize items as: Next Actions, Waiting For, or Someday/Maybe
5. Add appropriate contexts (calls, errands, computer, etc.)

Response format: Return a JSON array of actions with the following structure:
[
  {
    "type": "next_action|waiting_for|someday_maybe",
    "action": "Specific action description starting with verb",
    "context": "@calls|@errands|@computer|@office|@home|@online|@waiting",
    "project": "Related project name (if applicable)",
    "due_date": "YYYY-MM-DD (if applicable)",
    "tags": ["#tag1", "#tag2"]
  }
]

Important guidelines:
- Be specific: "Call" not "Contact", "Draft" not "Work on"
- Include context clues: phone numbers, email addresses, specific deliverables
- If something is unclear or needs more information, create a next action to clarify it
- Break down large or vague items into smaller, concrete actions
- Use authentic GTD language and categories`;

  /**
   * Generate optimized prompt based on input context analysis
   */
  static generatePrompt(inboxText: string, inputType?: string): GTDPromptTemplate {
    const context = this.analyzeInputContext(inboxText, inputType);
    const optimizedSystemPrompt = this.optimizeSystemPrompt(context);
    const contextualUserPrompt = this.generateContextualUserPrompt(inboxText, context);

    return {
      systemPrompt: optimizedSystemPrompt,
      userPrompt: contextualUserPrompt
    };
  }

  /**
   * Analyze input text to determine context and optimization opportunities
   */
  private static analyzeInputContext(text: string, inputType?: string): GTDInputContext {
    const hasTimeReference = /\b(today|tomorrow|next week|friday|deadline|urgent|asap|due|schedule|calendar|meeting|appointment)\b/i.test(text);
    const hasPersonReference = /\b(call|email|ask|tell|meeting with|contact|reach out|follow up with|check with|get from)\b/i.test(text);
    const hasLongTermIndicator = /\b(someday|maybe|consider|think about|explore|research|investigate|learn|study|eventually|future)\b/i.test(text);

    return {
      type: (inputType as any) || 'general',
      hasTimeReference,
      hasPersonReference,
      hasLongTermIndicator,
      textLength: text.length
    };
  }

  /**
   * Optimize system prompt based on input context
   */
  private static optimizeSystemPrompt(context: GTDInputContext): string {
    let optimizations = '';

    // Add time-specific guidance
    if (context.hasTimeReference) {
      optimizations += '\n\nTIME SENSITIVITY: Pay special attention to time-sensitive actions and due dates. Extract specific dates and deadlines. Consider urgency when categorizing actions.';
    }

    // Add person-dependency guidance
    if (context.hasPersonReference) {
      optimizations += '\n\nPEOPLE DEPENDENCIES: Identify actions that depend on other people. These may be "Waiting For" items if you\'re waiting for someone else, or next actions if you need to reach out to someone.';
    }

    // Add long-term consideration guidance
    if (context.hasLongTermIndicator) {
      optimizations += '\n\nLONG-TERM ITEMS: Consider if some items belong in Someday/Maybe rather than immediate next actions. Look for exploratory or research-based activities that aren\'t time-critical.';
    }

    // Add input-type specific guidance
    switch (context.type) {
      case 'email':
        optimizations += '\n\nEMAIL PROCESSING: Focus on identifying responses needed, actions to take, and information to file. Look for requests, commitments, and follow-ups.';
        break;
      case 'meeting_notes':
        optimizations += '\n\nMEETING FOLLOW-UP: Extract action items, follow-ups, and decisions that require further action. Identify who is responsible for each action.';
        break;
      case 'note':
        optimizations += '\n\nNOTE PROCESSING: Identify any tasks, ideas to develop, or information to organize. Look for incomplete thoughts that need clarification.';
        break;
    }

    return this.BASE_SYSTEM_PROMPT + optimizations;
  }

  /**
   * Generate user prompt with contextual guidance
   */
  private static generateContextualUserPrompt(inboxText: string, context: GTDInputContext): string {
    const inputTypeLabel = context.type === 'general' ? 'inbox item' : context.type.replace('_', ' ');
    
    let contextualGuidance = '';
    
    if (context.textLength > 1000) {
      contextualGuidance += '\n\nNote: This is a longer text. Focus on extracting the key actionable items rather than processing every detail.';
    }

    if (context.hasTimeReference && context.hasPersonReference) {
      contextualGuidance += '\n\nThis text contains both time references and people dependencies. Pay attention to coordination needs and scheduling.';
    }

    return `Please clarify this ${inputTypeLabel} using GTD methodology:

"${inboxText}"

Break this down into specific, actionable next actions. For each action, determine:
- What exactly needs to be done (specific physical action starting with a verb)
- What category it belongs to (next_action, waiting_for, someday_maybe)  
- What context is needed (@calls, @errands, @computer, @office, @home, etc.)
- What project or outcome it relates to
- Any due dates or scheduling needed
- Relevant tags for organization

${contextualGuidance}

Return the results as a valid JSON array following the specified format.`;
  }

  /**
   * Generate templates for different inbox input types
   */
  static getTemplateForInputType(inputType: string): Partial<GTDPromptTemplate> {
    const templates: Record<string, Partial<GTDPromptTemplate>> = {
      email: {
        systemPrompt: this.BASE_SYSTEM_PROMPT + '\n\nEMAIL SPECIALIZATION: Focus on identifying responses needed, actions to take, and information to file or reference.',
        userPrompt: 'Process this email using GTD methodology. Extract any actions needed, responses required, or information to file:'
      },
      meeting_notes: {
        systemPrompt: this.BASE_SYSTEM_PROMPT + '\n\nMEETING NOTES SPECIALIZATION: Extract action items, follow-ups, decisions requiring action, and commitments made.',
        userPrompt: 'Process these meeting notes using GTD methodology. Extract all action items, follow-ups, and commitments:'
      },
      note: {
        systemPrompt: this.BASE_SYSTEM_PROMPT + '\n\nNOTE PROCESSING SPECIALIZATION: Identify tasks, ideas to develop, information to organize, and incomplete thoughts requiring action.',
        userPrompt: 'Process this note using GTD methodology. Identify any actionable items, ideas to develop, or information to organize:'
      }
    };

    return templates[inputType] || {};
  }

  /**
   * Validate and sanitize inbox text before processing
   */
  static validateInput(text: string): { isValid: boolean; error?: string; sanitizedText?: string } {
    if (text == null || typeof text !== 'string') {
      return { isValid: false, error: 'Input text is required and must be a string' };
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return { isValid: false, error: 'Input text cannot be empty or only whitespace' };
    }

    if (trimmedText.length > 10000) {
      return { 
        isValid: false, 
        error: `Input text is too long (${trimmedText.length} characters). Maximum allowed is 10,000 characters.` 
      };
    }

    return {
      isValid: true,
      sanitizedText: trimmedText
    };
  }

  /**
   * Get suggested contexts based on input analysis
   */
  static getSuggestedContexts(text: string): string[] {
    const contexts = [];

    if (/\b(call|phone|dial)\b/i.test(text)) {
      contexts.push('@calls');
    }
    if (/\b(email|write|send|reply|respond)\b/i.test(text)) {
      contexts.push('@computer');
    }
    if (/\b(buy|purchase|shop|store)\b/i.test(text)) {
      contexts.push('@errands');
    }
    if (/\b(meeting|discuss|talk to|see)\b/i.test(text)) {
      contexts.push('@office');
    }
    if (/\b(read|review|research|look up)\b/i.test(text)) {
      contexts.push('@computer');
    }
    if (/\b(waiting|pending|expect|anticipate)\b/i.test(text)) {
      contexts.push('@waiting');
    }

    return contexts.length > 0 ? contexts : ['@computer']; // Default context
  }
}