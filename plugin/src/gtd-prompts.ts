/**
 * GTD-specific prompt templates and optimization logic
 * Handles generation of prompts for clarifying inbox text into actionable next actions
 */

export interface GTDPromptTemplate {
  // Back-compat joined system prompt
  systemPrompt: string;
  // Preferred layered system persona: base + variant + optional addenda
  systemPromptParts?: string[];
  userPrompt: string;
}

export interface GTDInputContext {
  type: 'note' | 'email' | 'meeting_notes' | 'general';
  hasTimeReference: boolean;
  hasPersonReference: boolean;
  hasLongTermIndicator: boolean;
  textLength: number;
}

// Prompt kinds supported by the assistant UI
export type PromptKind = 'clarify' | 'weekly_review_next_actions' | 'weekly_review_waiting_for' | 'weekly_review_someday_maybe';

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
5. Add appropriate contexts based on where/how the action can be performed
6. Estimate realistic time requirements for each action

CONTEXT ANALYSIS: Choose the most appropriate context from these options:
- @computer: For tasks requiring a computer (email, research, writing, online work)
- @phone: For tasks requiring phone calls or voice communication
- @errands: For tasks requiring going out (shopping, appointments, pickups)
- @home: For tasks that must be done at home (household tasks, personal projects)
- @office: For tasks requiring workplace resources or presence (meetings, presentations, office equipment)
- @anywhere: For tasks that can be done in any location (reading, reviewing, thinking)

TIME ESTIMATION: Provide realistic time estimates using these formats:
Quick tasks: #5m, #10m, #15m
Medium tasks: #30m, #45m, #1h
Longer tasks: #2h, #3h, #4h

CLASSIFICATION RULES:
- If the next step is for someone else to do (you are waiting on them), classify it as waiting_for and include the tag #waiting.
- If the item is not actionable right now or is a “maybe later,” classify it as someday_maybe and include the tag #someday.
- Otherwise classify as next_action with no #waiting or #someday tag.

Response format: Return a JSON array of actions with the following structure:
[
  {
    "type": "next_action|waiting_for|someday_maybe",
    "action": "Specific action description starting with verb",
    "context": "@computer|@phone|@errands|@home|@office|@anywhere",
    "project": "Related project name (if applicable)",
    "due_date": "YYYY-MM-DD (if applicable)",
    "time_estimate": "#5m|#10m|#15m|#30m|#45m|#1h|#2h|#3h|#4h",
    "tags": ["#tag1", "#tag2"]
  }
]

Important guidelines:
- Be specific: "Call" not "Contact", "Draft" not "Work on"
- Include context clues: phone numbers, email addresses, specific deliverables
- Choose contexts based on the actual requirements of the action
- Estimate time based on task complexity and your experience
- If something is unclear or needs more information, create a next action to clarify it
- Break down large or vague items into smaller, concrete actions
  - Use authentic GTD language and categories`;

  // Clarify task variant (kept compact; schema stays in base)
  private static readonly CLARIFY_TASK_VARIANT = `TASK: Clarify the provided text into concrete GTD items. Break down vague items, classify as next_action/waiting_for/someday_maybe, infer context and time estimates, and include helpful tags.`;

  /**
   * Generate optimized prompt based on input context analysis
   */
  static generatePrompt(inboxText: string, inputType?: string): GTDPromptTemplate {
    const context = this.analyzeInputContext(inboxText, inputType);
    const addendum = this.buildOptimizations(context);
    const parts = [
      this.BASE_SYSTEM_PROMPT,
      this.CLARIFY_TASK_VARIANT,
    ] as string[];
    if (addendum.trim()) parts.push(addendum.trim());

    const contextualUserPrompt = this.generateContextualUserPrompt(inboxText, context);

    return {
      systemPrompt: parts.join('\n\n'),
      systemPromptParts: parts,
      userPrompt: contextualUserPrompt,
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
  private static buildOptimizations(context: GTDInputContext): string {
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

    return optimizations;
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
- What context is needed (@computer, @phone, @errands, @home, @office, @anywhere)
- How much time it will likely take (#5m, #10m, #15m, #30m, #45m, #1h, #2h, #3h, #4h)
- What project or outcome it relates to
- Any due dates or scheduling needed
- Relevant tags for organization

CONTEXT GUIDANCE: Choose contexts based on where/how the action must be performed:
- Use @phone for calls and voice communication
- Use @computer for digital work (email, research, writing)
- Use @errands for tasks requiring going out
- Use @home for household or personal tasks done at home
- Use @office for workplace-specific tasks
- Use @anywhere for location-independent tasks (reading, thinking)

TIME ESTIMATION GUIDANCE: Be realistic about time requirements:
- Simple tasks like "send quick email" = #5m to #15m
- Moderate tasks like "write proposal outline" = #30m to #1h  
- Complex tasks like "prepare detailed presentation" = #2h to #4h

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

  // Expose base persona for prompt registry assembly
  static getBaseSystemPrompt(): string {
    return this.BASE_SYSTEM_PROMPT;
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

    if (trimmedText.length > 50000) {
      return { 
        isValid: false, 
        error: `Input text is too long (${trimmedText.length} characters). Maximum allowed is 50,000 characters.` 
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

    // Phone-related actions
    if (/\b(call|phone|dial|ring|speak with|talk to.*phone)\b/i.test(text)) {
      contexts.push('@phone');
    }
    
    // Computer-based actions
    if (/\b(email|write|send|reply|respond|research|look up|type|draft|online|website|blog|code|programming)\b/i.test(text)) {
      contexts.push('@computer');
    }
    
    // Errands (going out)
    if (/\b(buy|purchase|shop|store|pick up|drop off|appointment|bank|post office|grocery)\b/i.test(text)) {
      contexts.push('@errands');
    }
    
    // Home-specific tasks
    if (/\b(home|house|kitchen|garage|garden|family|personal|household|clean|repair.*home|fix.*home)\b/i.test(text)) {
      contexts.push('@home');
    }
    
    // Office/workplace tasks
    if (/\b(meeting|office|workplace|conference|presentation|team|colleague|standup|office.*equipment|print|conference.*room)\b/i.test(text)) {
      contexts.push('@office');
    }
    
    // Location-independent tasks
    if (/\b(read|review|think|consider|plan|brainstorm|reflect|study|analyze)\b/i.test(text)) {
      contexts.push('@anywhere');
    }
    
    // Waiting-related (legacy support)
    if (/\b(waiting|pending|expect|anticipate)\b/i.test(text)) {
      contexts.push('@waiting');
    }

    // Return found contexts, or default to @computer if none found
    return contexts.length > 0 ? contexts : ['@computer'];
  }
}

/**
 * Alias export: prefer calling this Clarify in higher-level code,
 * while retaining GTDPromptGenerator for backward compatibility.
 */
export const Clarify = GTDPromptGenerator;

/**
 * Weekly Review: Next Actions variant (layered with base persona; no schema duplication)
 */
const WEEKLY_REVIEW_NEXTACTIONS_VARIANT = `WEEKLY REVIEW – NEXT ACTIONS: Improve the quality of next actions.

Apply these checks:
1) Stale items (>14 days): add #stale; consider rescoping.
2) Project candidates: if outcome-like, add #project-candidate and provide a clear next action.
3) Missing metadata: infer context and time_estimate where absent.
4) Quick wins: tag <=15m items as #quickwin.
5) Clarity: rewrite vague items to specific, verb-first actions.`;

function generateWeeklyReviewNextActionsUserPrompt(inputText: string): string {
  return `Weekly Review – Next Actions

Review and improve the following next actions (they may be in Markdown list/task format). Apply the quality checks described and return only the improved JSON array using the specified schema.

"""
${inputText}
"""`;
}

// Weekly Review: Waiting For
const WEEKLY_REVIEW_WAITING_VARIANT = `WEEKLY REVIEW – WAITING FOR: Triage waiting items and add follow-ups when needed.

Apply these checks:
1) Aging items (>14 days): tag #stale; consider adding a follow-up next action.
2) Missing follow-ups: create explicit next_action to nudge or check in.
3) Clarity/contacts: make who/what is awaited clear; include contact info if present.
4) Metadata completeness: infer context and time_estimate when missing.
5) Keep valid waiting items as type=waiting_for; promote only when the next move is yours.`;

function generateWeeklyReviewWaitingUserPrompt(inputText: string): string {
  return `Weekly Review – Waiting For

Review the following waiting items. Improve clarity, add follow-up next actions where needed, and return only the JSON array (waiting items and any new follow-ups) using the schema.

"""
${inputText}
"""`;
}

// Weekly Review: Someday/Maybe
const WEEKLY_REVIEW_SOMEDAY_VARIANT = `WEEKLY REVIEW – SOMEDAY/MAYBE: Triage and promote when ready.

Apply these checks:
1) Promote ready items to specific next_action(s) with verb, context, and time_estimate.
2) Keep not-ready items as type=someday_maybe with #someday.
3) Project candidates: add #project-candidate and provide a first next action when appropriate.
4) Improve clarity while preserving intent.`;

function generateWeeklyReviewSomedayUserPrompt(inputText: string): string {
  return `Weekly Review – Someday/Maybe

Triage the following someday/maybe items. Promote ready ones to concrete next actions and keep others as someday/maybe. Return only the JSON array using the schema.

"""
${inputText}
"""`;
}

/**
 * Registry for prompt kinds
 */
export function generatePromptFor(kind: PromptKind, text: string, inputType?: string): GTDPromptTemplate {
  switch (kind) {
    case 'clarify':
      return GTDPromptGenerator.generatePrompt(text, inputType);
    case 'weekly_review_next_actions':
      return {
        systemPromptParts: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_NEXTACTIONS_VARIANT],
        systemPrompt: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_NEXTACTIONS_VARIANT].join('\n\n'),
        userPrompt: generateWeeklyReviewNextActionsUserPrompt(text),
      };
    case 'weekly_review_waiting_for':
      return {
        systemPromptParts: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_WAITING_VARIANT],
        systemPrompt: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_WAITING_VARIANT].join('\n\n'),
        userPrompt: generateWeeklyReviewWaitingUserPrompt(text),
      };
    case 'weekly_review_someday_maybe':
      return {
        systemPromptParts: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_SOMEDAY_VARIANT],
        systemPrompt: [GTDPromptGenerator.getBaseSystemPrompt(), WEEKLY_REVIEW_SOMEDAY_VARIANT].join('\n\n'),
        userPrompt: generateWeeklyReviewSomedayUserPrompt(text),
      };
    default:
      // Fallback to clarify
      return GTDPromptGenerator.generatePrompt(text, inputType);
  }
}
