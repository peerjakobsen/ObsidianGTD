import { describe, it, expect } from '@jest/globals';
import { GTDPromptGenerator, GTDPromptTemplate } from '../src/gtd-prompts';

describe('GTDPromptGenerator', () => {
  describe('Basic Prompt Generation', () => {
    it('should generate basic GTD prompt for simple text', () => {
      const inboxText = 'Call John about the project budget';
      const prompt = GTDPromptGenerator.generatePrompt(inboxText);

      expect(prompt.systemPrompt).toContain('Getting Things Done (GTD)');
      expect(prompt.systemPrompt).toContain('next action');
      expect(prompt.systemPrompt).toContain('JSON array');
      expect(prompt.userPrompt).toContain(inboxText);
      expect(prompt.userPrompt).toContain('GTD methodology');
    });

    it('should include proper JSON structure in system prompt', () => {
      const prompt = GTDPromptGenerator.generatePrompt('Test text');
      
      expect(prompt.systemPrompt).toContain('"type": "next_action|waiting_for|someday_maybe"');
      expect(prompt.systemPrompt).toContain('"action"');
      expect(prompt.systemPrompt).toContain('"context"');
      expect(prompt.systemPrompt).toContain('"project"');
      expect(prompt.systemPrompt).toContain('"tags"');
    });

    it('should include GTD principles in system prompt', () => {
      const prompt = GTDPromptGenerator.generatePrompt('Test text');
      
      expect(prompt.systemPrompt).toContain('specific, physical action');
      expect(prompt.systemPrompt).toContain('start with a verb');
      expect(prompt.systemPrompt).toContain('Next Actions, Waiting For, or Someday/Maybe');
      expect(prompt.systemPrompt).toContain('@calls|@errands|@computer');
    });
  });

  describe('Context Analysis and Optimization', () => {
    it('should detect time references and add time-specific guidance', () => {
      const timeReferencedText = 'Call client about urgent deadline by Friday';
      const prompt = GTDPromptGenerator.generatePrompt(timeReferencedText);

      expect(prompt.systemPrompt).toContain('TIME SENSITIVITY');
      expect(prompt.systemPrompt).toContain('time-sensitive actions');
      expect(prompt.systemPrompt).toContain('Extract specific dates');
    });

    it('should detect person references and add people dependency guidance', () => {
      const personText = 'Ask Sarah for the budget approval and follow up with Tom';
      const prompt = GTDPromptGenerator.generatePrompt(personText);

      expect(prompt.systemPrompt).toContain('PEOPLE DEPENDENCIES');
      expect(prompt.systemPrompt).toContain('depend on other people');
      expect(prompt.systemPrompt).toContain('Waiting For');
    });

    it('should detect long-term indicators and add someday/maybe guidance', () => {
      const longTermText = 'Someday I should consider learning Spanish for the project';
      const prompt = GTDPromptGenerator.generatePrompt(longTermText);

      expect(prompt.systemPrompt).toContain('LONG-TERM ITEMS');
      expect(prompt.systemPrompt).toContain('Someday/Maybe');
      expect(prompt.systemPrompt).toContain('research-based activities');
    });

    it('should combine multiple optimizations for complex text', () => {
      const complexText = 'Call John tomorrow about the urgent project deadline, and maybe consider researching new tools for future use';
      const prompt = GTDPromptGenerator.generatePrompt(complexText);

      expect(prompt.systemPrompt).toContain('TIME SENSITIVITY');
      expect(prompt.systemPrompt).toContain('PEOPLE DEPENDENCIES');
      expect(prompt.systemPrompt).toContain('LONG-TERM ITEMS');
    });

    it('should add context guidance in user prompt for complex scenarios', () => {
      const complexText = 'Tomorrow call the client about the urgent budget approval we discussed in the meeting';
      const prompt = GTDPromptGenerator.generatePrompt(complexText);

      expect(prompt.userPrompt).toContain('time references and people dependencies');
      expect(prompt.userPrompt).toContain('coordination needs and scheduling');
    });

    it('should add guidance for long text inputs', () => {
      const longText = 'A'.repeat(1500) + ' with action items mixed in';
      const prompt = GTDPromptGenerator.generatePrompt(longText);

      expect(prompt.userPrompt).toContain('longer text');
      expect(prompt.userPrompt).toContain('key actionable items');
    });
  });

  describe('Input Type Specialization', () => {
    it('should generate email-specific prompts', () => {
      const emailText = 'Reply to client email about project status';
      const prompt = GTDPromptGenerator.generatePrompt(emailText, 'email');

      expect(prompt.systemPrompt).toContain('EMAIL PROCESSING');
      expect(prompt.systemPrompt).toContain('responses needed');
      expect(prompt.systemPrompt).toContain('requests, commitments');
      expect(prompt.userPrompt).toContain('clarify this email');
    });

    it('should generate meeting notes-specific prompts', () => {
      const meetingText = 'Action items from team meeting: John to send proposal, Sarah to review budget';
      const prompt = GTDPromptGenerator.generatePrompt(meetingText, 'meeting_notes');

      expect(prompt.systemPrompt).toContain('MEETING FOLLOW-UP');
      expect(prompt.systemPrompt).toContain('action items, follow-ups');
      expect(prompt.systemPrompt).toContain('who is responsible');
      expect(prompt.userPrompt).toContain('clarify this meeting notes');
    });

    it('should generate note-specific prompts', () => {
      const noteText = 'Ideas for improving the project workflow and some tasks to complete';
      const prompt = GTDPromptGenerator.generatePrompt(noteText, 'note');

      expect(prompt.systemPrompt).toContain('NOTE PROCESSING');
      expect(prompt.systemPrompt).toContain('ideas to develop');
      expect(prompt.systemPrompt).toContain('incomplete thoughts');
      expect(prompt.userPrompt).toContain('clarify this note');
    });

    it('should handle unknown input types gracefully', () => {
      const text = 'Some general text';
      const prompt = GTDPromptGenerator.generatePrompt(text, 'unknown_type');

      expect(prompt.systemPrompt).toContain('Getting Things Done');
      expect(prompt.userPrompt).toContain('unknown type');
    });
  });

  describe('Template Methods', () => {
    it('should return email template', () => {
      const template = GTDPromptGenerator.getTemplateForInputType('email');
      
      expect(template.systemPrompt).toContain('EMAIL SPECIALIZATION');
      expect(template.systemPrompt).toContain('responses needed');
      expect(template.userPrompt).toContain('Process this email');
    });

    it('should return meeting notes template', () => {
      const template = GTDPromptGenerator.getTemplateForInputType('meeting_notes');
      
      expect(template.systemPrompt).toContain('MEETING NOTES SPECIALIZATION');
      expect(template.systemPrompt).toContain('action items, follow-ups');
      expect(template.userPrompt).toContain('meeting notes');
    });

    it('should return note template', () => {
      const template = GTDPromptGenerator.getTemplateForInputType('note');
      
      expect(template.systemPrompt).toContain('NOTE PROCESSING SPECIALIZATION');
      expect(template.systemPrompt).toContain('ideas to develop');
      expect(template.userPrompt).toContain('Process this note');
    });

    it('should return empty object for unknown input type', () => {
      const template = GTDPromptGenerator.getTemplateForInputType('unknown');
      
      expect(template).toEqual({});
    });
  });

  describe('Input Validation', () => {
    it('should validate normal text input', () => {
      const result = GTDPromptGenerator.validateInput('Call John about project');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedText).toBe('Call John about project');
      expect(result.error).toBeUndefined();
    });

    it('should reject empty string', () => {
      const result = GTDPromptGenerator.validateInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty or only whitespace');
    });

    it('should reject whitespace-only string', () => {
      const result = GTDPromptGenerator.validateInput('   \n\t   ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty or only whitespace');
    });

    it('should reject null or undefined input', () => {
      const nullResult = GTDPromptGenerator.validateInput(null as any);
      const undefinedResult = GTDPromptGenerator.validateInput(undefined as any);
      
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toContain('required and must be a string');
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toContain('required and must be a string');
    });

    it('should reject text that is too long', () => {
      const longText = 'A'.repeat(10001);
      const result = GTDPromptGenerator.validateInput(longText);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.error).toContain('10,000 characters');
    });

    it('should trim and return valid text', () => {
      const result = GTDPromptGenerator.validateInput('  Call John  \n');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedText).toBe('Call John');
    });

    it('should accept text at the character limit', () => {
      const maxLengthText = 'A'.repeat(10000);
      const result = GTDPromptGenerator.validateInput(maxLengthText);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedText).toHaveLength(10000);
    });
  });

  describe('Context Suggestions', () => {
    it('should suggest @calls for phone-related actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Call John about the meeting');
      expect(contexts).toContain('@calls');
    });

    it('should suggest @computer for email actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Send email to the team');
      expect(contexts).toContain('@computer');
    });

    it('should suggest @errands for shopping actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Buy office supplies from the store');
      expect(contexts).toContain('@errands');
    });

    it('should suggest @office for meeting actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Schedule meeting with Sarah');
      expect(contexts).toContain('@office');
    });

    it('should suggest @computer for research actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Research new project management tools');
      expect(contexts).toContain('@computer');
    });

    it('should suggest @waiting for waiting actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Waiting for approval from manager');
      expect(contexts).toContain('@waiting');
    });

    it('should suggest multiple contexts when applicable', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Call client and then email the proposal');
      expect(contexts).toContain('@calls');
      expect(contexts).toContain('@computer');
    });

    it('should default to @computer for unrecognized actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Do something mysterious');
      expect(contexts).toContain('@computer');
      expect(contexts).toHaveLength(1);
    });

    it('should handle empty or whitespace text', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('');
      expect(contexts).toContain('@computer');
      expect(contexts).toHaveLength(1);
    });
  });
});