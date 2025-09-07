import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the AWS SDK before importing our client
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(),
  ConverseCommand: jest.fn().mockImplementation((params) => ({
    input: params,
  })),
}));

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  createBedrockServiceClient,
  BedrockClient,
  BedrockClientError,
} from '../src/bedrock-client';

describe('BedrockClient.converse', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;
  let mockSend: jest.MockedFunction<any>;
  let originalEnv: NodeJS.ProcessEnv;
  let originalFetch: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    originalFetch = (global as any).fetch;

    mockSend = jest.fn() as jest.MockedFunction<any>;
    mockClient = {
      send: mockSend,
    } as any;

    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockClient);

    // Ensure ConverseCommand returns an object we can inspect
    (ConverseCommand as unknown as jest.Mock).mockImplementation((params) => ({
      input: params,
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    (global as any).fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('maps params to ConverseCommandInput and returns BedrockResponse', async () => {
    const mockResponse = {
      output: {
        message: {
          content: [{ text: 'hello there' }],
        },
      },
      usage: { totalTokens: 42 },
    };
    mockSend.mockResolvedValueOnce(mockResponse);

    const client = createBedrockServiceClient('test-token');
    const result = await client.converse({
      system: 'You are a helpful assistant',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi! How can I help?' },
        { role: 'user', content: 'What is 2+2?' },
      ],
      inferenceConfig: { temperature: 0.2, maxTokens: 200, topP: 0.8 },
    });

    // Validate mapping to ConverseCommandInput
    expect(ConverseCommand).toHaveBeenCalledWith({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      system: [{ text: 'You are a helpful assistant' }],
      messages: [
        { role: 'user', content: [{ text: 'Hello' }] },
        { role: 'assistant', content: [{ text: 'Hi! How can I help?' }] },
        { role: 'user', content: [{ text: 'What is 2+2?' }] },
      ],
      inferenceConfig: { temperature: 0.2, maxTokens: 200, topP: 0.8 },
    });

    // Validate BedrockResponse shape
    expect(result.status).toBe('success');
    expect(result.result).toBe('hello there');
    expect(result.metadata.model).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
    expect(result.metadata.tokens_used).toBe(42);
  });

  it('retries on retriable errors and succeeds', async () => {
    const throttleError = new Error('ThrottlingException');
    throttleError.name = 'ThrottlingException';
    mockSend.mockRejectedValueOnce(throttleError);

    const mockResponse = {
      output: { message: { content: [{ text: 'success after retry' }] } },
      usage: { totalTokens: 10 },
    };
    mockSend.mockResolvedValueOnce(mockResponse);

    const client = createBedrockServiceClient('test-token');
    const result = await client.converse({
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result.status).toBe('success');
    expect(result.result).toBe('success after retry');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('falls back to HTTP bearer when credentials are missing (test env)', async () => {
    const credError = new Error('Missing credentials in config');
    credError.name = 'CredentialsProviderError';
    mockSend.mockRejectedValueOnce(credError);

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: { message: { content: [{ text: 'http fallback ok' }] } },
        usage: { totalTokens: 7 },
      }),
    });

    const client = createBedrockServiceClient('test-token', 'us-east-1');
    const result = await client.converse({
      system: ['system a', 'system b'],
      messages: [{ role: 'user', content: 'Hello via HTTP?' }],
      inferenceConfig: { maxTokens: 50 },
    });

    expect(result.status).toBe('success');
    expect(result.result).toBe('http fallback ok');

    // Verify HTTP request details
    const url = `https://bedrock-runtime.us-east-1.amazonaws.com/model/${encodeURIComponent('us.anthropic.claude-sonnet-4-20250514-v1:0')}/converse`;
    expect((global as any).fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: expect.any(String),
      })
    );

    const body = JSON.parse(((global as any).fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.modelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
    expect(body.system).toEqual([{ text: 'system a' }, { text: 'system b' }]);
    expect(body.messages).toEqual([
      { role: 'user', content: [{ text: 'Hello via HTTP?' }] },
    ]);
    expect(body.inferenceConfig).toEqual(expect.objectContaining({ maxTokens: 50 }));
  });
});
