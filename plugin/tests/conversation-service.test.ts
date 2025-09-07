import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { GTDConversationService } from '../src/conversation-service';
import type { BedrockResponse, ConverseParams } from '../src/bedrock-client';

describe('GTDConversationService', () => {
  let converseMock: jest.Mock<Promise<BedrockResponse>, [ConverseParams]>;
  let bedrock: any;

  beforeEach(() => {
    converseMock = jest.fn();
    bedrock = { converse: converseMock };
  });

  it('manages thread and sends follow-ups with full history', async () => {
    // First send returns placeholder content
    converseMock.mockResolvedValueOnce({
      result: 'initial tasks',
      status: 'success',
      metadata: { model: 'm', tokens_used: 10, processing_time_ms: 20 },
    });

    const svc = new GTDConversationService(bedrock);
    svc.startFromSelection('Buy milk and eggs');

    const reply = await svc.send('Make due Friday');
    expect(reply).toContain('initial tasks');

    // Verify bedrock.converse called with system prompt and full thread
    expect(converseMock).toHaveBeenCalled();
    const lastCallArgs = converseMock.mock.calls[converseMock.mock.calls.length - 1][0];
    const sys = lastCallArgs.system as any;
    expect(sys && (typeof sys === 'string' || Array.isArray(sys))).toBe(true);
    expect(lastCallArgs.messages.length).toBeGreaterThanOrEqual(2);
    expect(lastCallArgs.messages[0].role).toBe('user');
    // First user message should contain the selection text
    expect((lastCallArgs.messages[0] as any).content).toEqual(expect.stringContaining('Buy milk'));
    // Second user message is the follow-up
    expect((lastCallArgs.messages[lastCallArgs.messages.length - 1] as any).content).toBe('Make due Friday');
  });

  it('prepareForInsert requests strict JSON and parses actions', async () => {
    // Sequence:
    // 1) send() initial -> assistant returns non-JSON placeholder
    converseMock.mockResolvedValueOnce({
      result: 'draft tasks (not strict)',
      status: 'success',
      metadata: { model: 'm', tokens_used: 5, processing_time_ms: 10 },
    });

    const svc = new GTDConversationService(bedrock, { strictJsonMode: true });
    svc.startFromSelection('Plan project kickoff');
    await svc.send('Group by context');

    // 2) prepareForInsert -> service sends a JSON-only instruction, LLM replies with fenced JSON
    const fenced = '```json\n[\n {"type":"next_action","action":"Email team about kickoff","context":"@computer","tags":["#task"]}\n]\n```';
    converseMock.mockResolvedValueOnce({
      result: fenced,
      status: 'success',
      metadata: { model: 'm', tokens_used: 8, processing_time_ms: 15 },
    });

    const result = await svc.prepareForInsert();
    expect(result.success).toBe(true);
    expect(result.actions.length).toBe(1);
    expect(result.actions[0].action).toContain('Email team');

    // Verify the last send included the strict JSON instruction
    const lastCallArgs = converseMock.mock.calls[converseMock.mock.calls.length - 1][0];
    const lastUser = lastCallArgs.messages[lastCallArgs.messages.length - 1];
    expect(lastUser.role).toBe('user');
    expect((lastUser as any).content).toEqual(expect.stringContaining('JSON array'));
  });

  it('prepareForInsert returns fallback action on parse errors', async () => {
    // Start and one follow-up
    converseMock.mockResolvedValueOnce({
      result: 'some non-json text',
      status: 'success',
      metadata: { model: 'm', tokens_used: 3, processing_time_ms: 5 },
    });

    const svc = new GTDConversationService(bedrock, { strictJsonMode: true });
    svc.startFromSelection('Draft agenda for meeting');
    await svc.send('Keep it short');

    // Insert step attempts strict JSON, but returns garbage
    converseMock.mockResolvedValueOnce({
      result: 'not json at all',
      status: 'success',
      metadata: { model: 'm', tokens_used: 4, processing_time_ms: 6 },
    });

    const out = await svc.prepareForInsert();
    expect(out.success).toBe(false);
    expect(out.actions.length).toBe(1);
    expect(out.actions[0].tags).toEqual(expect.arrayContaining(['#manual-review', '#parse-error']));
  });
});
