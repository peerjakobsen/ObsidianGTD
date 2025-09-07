import { describe, it, expect } from '@jest/globals';
import { GTDPromptGenerator, GTDPromptTemplate, generatePromptFor } from '../src/gtd-prompts';

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
      expect(prompt.systemPrompt).toContain('@computer|@phone|@errands|@home|@office|@anywhere');
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
      const longText = 'A'.repeat(50001);
      const result = GTDPromptGenerator.validateInput(longText);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.error).toContain('50,000 characters');
    });

    it('should trim and return valid text', () => {
      const result = GTDPromptGenerator.validateInput('  Call John  \n');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedText).toBe('Call John');
    });

    it('should accept text at the character limit', () => {
      const maxLengthText = 'A'.repeat(50000);
      const result = GTDPromptGenerator.validateInput(maxLengthText);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedText).toHaveLength(50000);
    });
  });

  describe('Context Tag Detection for Metadata', () => {
    describe('Standard GTD Context Detection', () => {
      it('should detect @computer context for computer-based actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Send email to the team');
        expect(contexts).toContain('@computer');
      });

      it('should detect @phone context for phone-based actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Call John about the meeting');
        expect(contexts).toContain('@phone');
      });

      it('should detect @errands context for shopping/errands', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Buy office supplies from the store');
        expect(contexts).toContain('@errands');
      });

      it('should detect @home context for home-based actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Fix the leaky faucet in the kitchen');
        expect(contexts).toContain('@home');
      });

      it('should detect @office context for office/workplace actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Schedule meeting with Sarah in conference room');
        expect(contexts).toContain('@office');
      });

      it('should detect @anywhere context for location-independent actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Review the quarterly report');
        expect(contexts).toContain('@anywhere');
      });
    });

    describe('Enhanced Context Detection', () => {
      it('should prioritize @phone over generic @computer for calling actions', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Call the client to discuss project timeline');
        expect(contexts).toContain('@phone');
        expect(contexts).not.toContain('@computer');
      });

      it('should detect @home for household and personal tasks', () => {
        const homeContexts = [
          'Clean the garage this weekend',
          'Pay household bills online', 
          'Organize family photos',
          'Repair garden hose'
        ];
        
        homeContexts.forEach(text => {
          const contexts = GTDPromptGenerator.getSuggestedContexts(text);
          expect(contexts).toContain('@home');
        });
      });

      it('should detect @office for workplace-specific tasks', () => {
        const officeContexts = [
          'Update the team on project status',
          'Schedule weekly standup meeting',
          'Print reports for presentation',
          'Book conference room for client meeting'
        ];
        
        officeContexts.forEach(text => {
          const contexts = GTDPromptGenerator.getSuggestedContexts(text);
          expect(contexts).toContain('@office');
        });
      });

      it('should detect @anywhere for location-independent tasks', () => {
        const anywhereContexts = [
          'Read industry report',
          'Review contract terms',
          'Think about vacation plans',
          'Brainstorm project ideas'
        ];
        
        anywhereContexts.forEach(text => {
          const contexts = GTDPromptGenerator.getSuggestedContexts(text);
          expect(contexts).toContain('@anywhere');
        });
      });

      it('should handle multiple contexts in single text', () => {
        const contexts = GTDPromptGenerator.getSuggestedContexts('Call client from home office and then email the proposal');
        expect(contexts).toContain('@phone');
        expect(contexts).toContain('@computer');
        expect(contexts).toContain('@home');
      });
    });

    describe('Prompt Context Instruction Tests', () => {
      it('should include all required context options in system prompt', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Test inbox item');
        const systemPrompt = prompt.systemPrompt;
        
        expect(systemPrompt).toContain('@computer');
        expect(systemPrompt).toContain('@phone');
        expect(systemPrompt).toContain('@errands');
        expect(systemPrompt).toContain('@home');
        expect(systemPrompt).toContain('@office');
        expect(systemPrompt).toContain('@anywhere');
      });

      it('should provide context analysis instructions in user prompt', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Call manager about budget approval');
        const userPrompt = prompt.userPrompt;
        
        expect(userPrompt).toContain('context is needed');
        expect(userPrompt).toContain('@');
      });

      it('should request specific context analysis for different input types', () => {
        const emailPrompt = GTDPromptGenerator.generatePrompt('Reply to client email', 'email');
        const meetingPrompt = GTDPromptGenerator.generatePrompt('Follow up on action items', 'meeting_notes');
        
        expect(emailPrompt.userPrompt).toContain('context');
        expect(meetingPrompt.userPrompt).toContain('context');
      });
    });
  });

  describe('Time Estimation Detection for Metadata', () => {
    describe('Time Estimation Instruction Tests', () => {
      it('should include time estimation instructions in system prompt', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Test inbox item');
        const systemPrompt = prompt.systemPrompt;
        
        expect(systemPrompt).toContain('time estimate');
      });

      it('should request time estimates in user prompt', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Complete the quarterly report');
        const userPrompt = prompt.userPrompt;
        
        expect(userPrompt).toContain('time');
      });

      it('should include supported time formats in prompt guidance', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Review document');
        const systemPrompt = prompt.systemPrompt;
        
        const timeFormats = ['#5m', '#10m', '#15m', '#30m', '#45m', '#1h', '#2h', '#3h', '#4h'];
        let foundTimeFormats = 0;
        
        timeFormats.forEach(format => {
          if (systemPrompt.includes(format)) {
            foundTimeFormats++;
          }
        });
        
        expect(foundTimeFormats).toBeGreaterThan(0);
      });
    });

    describe('Time Context Analysis', () => {
      it('should provide time estimation guidance for quick tasks', () => {
        const quickTasks = [
          'Send quick email to client',
          'Make brief phone call',
          'File expense report'
        ];
        
        quickTasks.forEach(task => {
          const prompt = GTDPromptGenerator.generatePrompt(task);
          expect(prompt.systemPrompt).toContain('time');
        });
      });

      it('should provide time estimation guidance for longer tasks', () => {
        const longerTasks = [
          'Prepare quarterly presentation with charts and analysis',
          'Conduct comprehensive code review of the entire module',
          'Write detailed project proposal with budget breakdown'
        ];
        
        longerTasks.forEach(task => {
          const prompt = GTDPromptGenerator.generatePrompt(task);
          expect(prompt.systemPrompt).toContain('time');
        });
      });

      it('should include time estimation in JSON response format example', () => {
        const prompt = GTDPromptGenerator.generatePrompt('Test task');
        const systemPrompt = prompt.systemPrompt;
        
        expect(systemPrompt).toContain('time_estimate');
      });
    });
  });

  describe('Context Suggestions', () => {
    it('should suggest @phone for phone-related actions', () => {
      const contexts = GTDPromptGenerator.getSuggestedContexts('Call John about the meeting');
      expect(contexts).toContain('@phone');
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
      expect(contexts).toContain('@phone');
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

describe('Prompt Layering', () => {
  it('provides systemPromptParts with base + variant for each kind', () => {
    const kinds: Array<[string, string]> = [
      ['clarify', 'Clarify'],
      ['weekly_review_next_actions', 'WEEKLY REVIEW'],
      ['weekly_review_waiting_for', 'WEEKLY REVIEW'],
      ['weekly_review_someday_maybe', 'WEEKLY REVIEW'],
    ];

    kinds.forEach(([kind, marker]) => {
      const prompt: any = generatePromptFor(kind as any, 'Sample text');
      expect(Array.isArray(prompt.systemPromptParts)).toBe(true);
      expect(prompt.systemPromptParts.length).toBeGreaterThanOrEqual(2);
      expect(prompt.systemPromptParts[0]).toContain('Getting Things Done (GTD)');
      expect(prompt.systemPromptParts[1]).toContain(marker);
    });
  });

  it('weekly review userPrompt does not restate schema details', () => {
    const p = generatePromptFor('weekly_review_next_actions', 'Do some tasks');
    const txt = p.userPrompt;
    expect(txt).not.toContain('"time_estimate"');
    expect(txt).not.toContain('@computer');
    expect(txt).not.toContain('"type"');
  });
});
