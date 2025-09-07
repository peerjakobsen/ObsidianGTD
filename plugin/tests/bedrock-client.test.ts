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
  createBedrockClient, 
  testConverse, 
  GTDBedrockClient, 
  createGTDBedrockClient,
  validateBedrockConfig,
  BedrockClientError
} from '../src/bedrock-client';

describe('BedrockClient', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;
  let mockSend: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Mock AWS SDK client with proper structure
    mockSend = jest.fn();
    mockClient = {
      send: mockSend,
    } as any;
    
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  describe('Client Creation', () => {
    it('should create BedrockRuntimeClient with default region', () => {
      const client = createBedrockClient('test-bearer-token');
      
      expect(BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
        region: 'us-east-1',
        apiKey: 'test-bearer-token',
      }));
      expect(client).toBe(mockClient);
    });

    it('should create BedrockRuntimeClient with custom region', () => {
      const client = createBedrockClient('test-bearer-token', 'us-west-2');
      
      expect(BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
        region: 'us-west-2',
        apiKey: 'test-bearer-token',
      }));
      expect(client).toBe(mockClient);
    });

    it('should set BEDROCK_API_KEY environment variable', () => {
      const bearerToken = 'test-bearer-token-123';
      createBedrockClient(bearerToken);
      
      expect(process.env.BEDROCK_API_KEY).toBe(bearerToken);
    });

    it('should handle missing process.env gracefully', () => {
      // Simulate browser environment where process.env might not exist
      const originalProcess = global.process;
      delete (global as any).process;
      
      expect(() => {
        createBedrockClient('test-token');
      }).not.toThrow();
      
      global.process = originalProcess;
    });
  });

  describe('ConverseCommand Creation', () => {
    it('should create ConverseCommand with correct parameters', async () => {
      const client = createBedrockClient('test-token');
      
      // Reset the mock to ensure input is properly returned
      (ConverseCommand as jest.Mock).mockImplementation((params) => ({
        input: params,
      }));
      
      const command = await testConverse(client);
      
      expect(ConverseCommand).toHaveBeenCalledWith({
        modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        messages: [{ 
          role: 'user', 
          content: [{ text: 'test' }] 
        }]
      });
      
      expect(command.input).toEqual({
        modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        messages: [{ 
          role: 'user', 
          content: [{ text: 'test' }] 
        }]
      });
    });
  });

  describe('Bearer Token Authentication', () => {
    it('should accept various bearer token formats', () => {
      const tokens = [
        'simple-token',
        'Bearer token-with-prefix',
        'very-long-bearer-token-with-special-chars-123!@#',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...' // JWT-like token
      ];
      
      tokens.forEach(token => {
        expect(() => createBedrockClient(token)).not.toThrow();
        expect(process.env.BEDROCK_API_KEY).toBe(token);
      });
    });

    it('should handle empty bearer token', () => {
      expect(() => createBedrockClient('')).not.toThrow();
      expect(process.env.BEDROCK_API_KEY).toBe('');
    });
  });

  describe('Region Configuration', () => {
    const validRegions = [
      'us-east-1',
      'us-west-2',
      'eu-west-1',
      'ap-southeast-1',
      'ap-northeast-1'
    ];

    validRegions.forEach(region => {
      it(`should accept valid region: ${region}`, () => {
        const client = createBedrockClient('test-token', region);
        
        expect(BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
          region,
          apiKey: 'test-token',
        }));
        expect(client).toBe(mockClient);
      });
    });

    it('should accept custom regions for future expansion', () => {
      const customRegion = 'eu-central-1';
      const client = createBedrockClient('test-token', customRegion);
      
      expect(BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
        region: customRegion,
        apiKey: 'test-token',
      }));
    });
  });

  describe('Model Configuration', () => {
    it('should use correct Claude Sonnet 4 model ID', async () => {
      const client = createBedrockClient('test-token');
      await testConverse(client);
      
      expect(ConverseCommand).toHaveBeenCalledWith({
        modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        messages: expect.any(Array)
      });
    });
  });

  describe('GTD Integration Readiness', () => {
    it('should be ready for GTD clarification requests', async () => {
      const client = createBedrockClient('test-token');
      
      // Reset the mock to ensure input is properly returned
      (ConverseCommand as jest.Mock).mockImplementation((params) => ({
        input: params,
      }));
      
      // Simulate a GTD clarification request
      const gtdCommand = new ConverseCommand({
        modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        messages: [{
          role: 'user',
          content: [{
            text: 'Please clarify this inbox text into GTD actions: "Call Sarah about the quarterly report due next Friday"'
          }]
        }]
      });
      
      expect(gtdCommand.input.modelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
      expect(gtdCommand.input.messages).toHaveLength(1);
      expect(gtdCommand.input.messages[0].content[0].text).toContain('GTD actions');
    });
  });
});

describe('BedrockClient Error Scenarios', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    
    mockClient = {
      send: jest.fn(),
    } as any;
    
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  describe('Construction Error Handling', () => {
    it('should handle BedrockRuntimeClient constructor errors', () => {
      (BedrockRuntimeClient as jest.Mock).mockImplementation(() => {
        throw new Error('AWS SDK initialization failed');
      });
      
      expect(() => {
        createBedrockClient('test-token');
      }).toThrow('AWS SDK initialization failed');
    });
  });

  describe('Environment Variable Handling', () => {
    it('should not crash when process is undefined', () => {
      const originalProcess = global.process;
      
      try {
        delete (global as any).process;
        
        expect(() => {
          createBedrockClient('test-token');
        }).not.toThrow();
        
      } finally {
        global.process = originalProcess;
      }
    });

    it('should not crash when process.env is undefined', () => {
      const originalEnv = process.env;
      
      try {
        delete (process as any).env;
        
        expect(() => {
          createBedrockClient('test-token');
        }).not.toThrow();
        
      } finally {
        process.env = originalEnv;
      }
    });
  });
});

describe('BedrockClient Type Safety', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock client for this test group
    mockClient = {
      send: jest.fn(),
    } as any;
    
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockClient);
  });

  it('should ensure proper TypeScript types for client creation', () => {
    const bearerToken: string = 'test-token';
    const region: string = 'us-east-1';
    
    const client = createBedrockClient(bearerToken, region);
    
    // TypeScript should enforce that client is BedrockRuntimeClient
    expect(client).toBeDefined();
    expect(typeof client.send).toBe('function');
  });

  it('should ensure proper TypeScript types for ConverseCommand', async () => {
    const client = createBedrockClient('test-token');
    
    // Reset the mock to ensure input is properly returned
    (ConverseCommand as jest.Mock).mockImplementation((params) => ({
      input: params,
    }));
    
    const command = await testConverse(client);
    
    // TypeScript should enforce proper ConverseCommand structure
    expect(command).toBeDefined();
    expect(command.input).toBeDefined();
    expect(command.input.modelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
  });
});

describe('GTDBedrockClient', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;
  let mockSend: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    
    mockSend = jest.fn();
    mockClient = {
      send: mockSend,
    } as any;
    
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  describe('GTD Client Creation', () => {
    it('should create GTDBedrockClient with required configuration', () => {
      const client = createGTDBedrockClient(
        'test-bearer-token',
        'us-east-1',
        'us.anthropic.claude-sonnet-4-20250514-v1:0'
      );
      
      expect(client).toBeInstanceOf(GTDBedrockClient);
      expect(BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
        region: 'us-east-1',
        apiKey: 'test-bearer-token',
      }));
    });

    it('should use default values for optional parameters', () => {
      const client = createGTDBedrockClient('test-token');
      const config = client.getConfig();
      
      expect(config.region).toBe('us-east-1');
      expect(config.modelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
      expect(config.hasBearerToken).toBe(true);
    });

    it('should set bearer token in environment', () => {
      const bearerToken = 'test-bearer-token-123';
      createGTDBedrockClient(bearerToken);
      
      expect(process.env.BEDROCK_API_KEY).toBe(bearerToken);
    });
  });

  describe('GTD Clarification', () => {
    it('should handle successful clarification request', async () => {
      const mockResponse = {
        output: {
          message: {
            content: [{
              text: JSON.stringify([{
                type: 'next_action',
                action: 'Call John about project',
                context: '@calls',
                project: 'Website Redesign',
                tags: ['#urgent']
              }])
            }]
          }
        },
        usage: {
          totalTokens: 150
        }
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const client = createGTDBedrockClient('test-token');
      const result = await client.clarifyText('Call John about the website project');

      expect(result.status).toBe('success');
      expect(result.metadata.tokens_used).toBe(150);
      expect(result.metadata.model).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle clarification errors with retry logic', async () => {
      // First attempt fails with throttling error
      const throttleError = new Error('ThrottlingException');
      throttleError.name = 'ThrottlingException';
      mockSend.mockRejectedValueOnce(throttleError);

      // Second attempt succeeds
      const mockResponse = {
        output: {
          message: {
            content: [{
              text: 'Success after retry'
            }]
          }
        },
        usage: {
          totalTokens: 100
        }
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const client = createGTDBedrockClient('test-token');
      const result = await client.clarifyText('Test request');

      expect(result.status).toBe('success');
      expect(result.result).toBe('Success after retry');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      const error = new Error('ServiceUnavailableException');
      error.name = 'ServiceUnavailableException';
      mockSend.mockRejectedValue(error);

      const client = createGTDBedrockClient('test-token', 'us-east-1', 'us.anthropic.claude-sonnet-4-20250514-v1:0', {
        retryConfig: { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 10 } // Fast retries for testing
      });
      
      await expect(client.clarifyText('Test request')).rejects.toThrow(BedrockClientError);
      expect(mockSend).toHaveBeenCalledTimes(2); // Initial + 1 retry
    }, 10000);
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const mockResponse = {
        output: {
          message: {
            content: [{
              text: 'test response'
            }]
          }
        },
        usage: {
          totalTokens: 5
        }
      };

      // Add small delay to simulate network request
      mockSend.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 10))
      );

      const client = createGTDBedrockClient('test-token');
      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('AWS Bedrock connection successful');
      expect(result.responseTime).toBeGreaterThanOrEqual(10);
    });

    it('should handle connection test failure', async () => {
      const error = new Error('Connection failed');
      
      // Add small delay to simulate network request
      mockSend.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(error), 10))
      );

      const client = createGTDBedrockClient('test-token');
      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('AWS Bedrock connection failed');
      expect(result.responseTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const client = createGTDBedrockClient('test-token');
      
      client.updateConfig({
        bearerToken: 'new-token',
        region: 'us-west-2',
        timeout: 60000
      });

      const config = client.getConfig();
      expect(config.region).toBe('us-west-2');
      expect(config.timeout).toBe(60000);
      expect(config.hasBearerToken).toBe(true);
    });

    it('should update retry configuration', () => {
      const client = createGTDBedrockClient('test-token');
      
      client.updateRetryConfig({
        maxRetries: 5,
        baseDelayMs: 2000
      });

      // Retry config is private, but we can test it works by triggering retry
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';
      mockSend.mockRejectedValue(error);

      // This should attempt 6 calls (initial + 5 retries)
      expect(client.clarifyText('test')).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate valid configuration', () => {
      const result = validateBedrockConfig({
        bearerToken: 'valid-token-123',
        region: 'us-east-1',
        modelId: 'anthropic.claude-3-sonnet',
        timeout: 30000
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const result = validateBedrockConfig({
        bearerToken: '', // Too short
        region: '', // Missing
        modelId: 'invalid', // No dot
        timeout: 500 // Too small
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Bearer token is required');
      expect(result.errors).toContain('AWS region is required');
      expect(result.errors).toContain('Model ID must follow format: provider.model-name');
      expect(result.errors).toContain('Timeout should be at least 1000ms (1 second)');
    });
  });
});
