import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDAPIClient, APIClientError, createGTDAPIClient, validateAPIConfig } from '../src/api-client';

describe('GTDAPIClient Basic Functionality', () => {
  let client: GTDAPIClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    client = new GTDAPIClient({
      backendUrl: 'http://localhost:8000',
      timeout: 5000, // Shorter timeout for tests
      apiKey: 'test-api-key-123'
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Basic Operations', () => {
    it('should create client and get configuration', () => {
      const config = client.getConfig();
      expect(config.backendUrl).toBe('http://localhost:8000');
      expect(config.timeout).toBe(5000);
      expect(config.hasApiKey).toBe(true);
    });

    it('should make successful clarification request', async () => {
      const mockResponse = {
        result: JSON.stringify([{
          type: 'next_action',
          action: 'Call John about project',
          context: '@calls',
          project: 'Website Redesign',
          tags: ['#urgent']
        }]),
        status: 'success',
        metadata: {
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 150,
          processing_time_ms: 2500
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.clarifyText('Call John about the project budget');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/process',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-123'
          })
        })
      );
    });

    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const result = await client.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    it('should handle connection test failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await client.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Server responded with status 500');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const errorResponse = {
        error: {
          type: 'AUTH_ERROR',
          message: 'Invalid API key',
          details: 'Authentication failed'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify(errorResponse))
      });

      await expect(client.clarifyText('test')).rejects.toThrow(APIClientError);
    });

    it('should handle network errors', async () => {
      // Use a client with no retry for predictable behavior
      const noRetryClient = new GTDAPIClient({
        backendUrl: 'http://localhost:8000',
        timeout: 5000,
        apiKey: 'test-key'
      }, { maxRetries: 0 }); // No retries

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(noRetryClient.clarifyText('test')).rejects.toThrow(APIClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request Format', () => {
    it('should send correct request format to server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: '[]',
          status: 'success',
          metadata: { model: 'test', tokens_used: 0, processing_time_ms: 1000 }
        })
      });

      await client.clarifyText('test content');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.task).toBe('gtd-clarification');
      expect(requestBody.content).toBe('test content');
    });

    it('should handle server response format correctly', async () => {
      const mockResponse = {
        result: JSON.stringify([{
          type: 'next_action',
          action: 'Test action',
          context: '@computer',
          tags: ['#test']
        }]),
        status: 'success',
        metadata: {
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          tokens_used: 150,
          processing_time_ms: 1500
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.clarifyText('test');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
    });

    it('should update retry configuration', () => {
      // Should not throw
      expect(() => {
        client.updateRetryConfig({ maxRetries: 5 });
      }).not.toThrow();
    });
  });
});

describe('Factory and Validation', () => {
  describe('createGTDAPIClient', () => {
    it('should create client with default settings', () => {
      const client = createGTDAPIClient('http://localhost:8000', 'test-key');
      const config = client.getConfig();
      
      expect(config.backendUrl).toBe('http://localhost:8000');
      expect(config.hasApiKey).toBe(true);
      expect(config.timeout).toBe(30000);
    });

    it('should create client with custom timeout', () => {
      const client = createGTDAPIClient('http://localhost:8000', 'test-key', {
        timeout: 60000
      });
      
      const config = client.getConfig();
      expect(config.timeout).toBe(60000);
    });
  });

  describe('validateAPIConfig', () => {
    it('should accept valid configuration', () => {
      const result = validateAPIConfig({
        backendUrl: 'http://localhost:8000',
        apiKey: 'valid-long-api-key',
        timeout: 30000
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with missing required fields', () => {
      const result = validateAPIConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backend URL is required');
      expect(result.errors).toContain('API key is required');
    });

    it('should reject invalid URL formats', () => {
      const result = validateAPIConfig({
        backendUrl: 'not-a-url',
        apiKey: 'valid-key-123',
        timeout: 30000
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backend URL must be a valid HTTP/HTTPS URL');
    });

    it('should reject short API keys', () => {
      const result = validateAPIConfig({
        backendUrl: 'http://localhost:8000',
        apiKey: 'short',
        timeout: 30000
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key appears to be too short');
    });

    it('should validate timeout ranges', () => {
      const tooShort = validateAPIConfig({
        backendUrl: 'http://localhost:8000',
        apiKey: 'valid-key-123',
        timeout: 500
      });

      const tooLong = validateAPIConfig({
        backendUrl: 'http://localhost:8000',
        apiKey: 'valid-key-123',
        timeout: 400000
      });

      expect(tooShort.isValid).toBe(false);
      expect(tooShort.errors).toContain('Timeout should be at least 1000ms (1 second)');

      expect(tooLong.isValid).toBe(false);
      expect(tooLong.errors).toContain('Timeout should not exceed 300000ms (5 minutes)');
    });

    it('should accept HTTPS URLs', () => {
      const result = validateAPIConfig({
        backendUrl: 'https://api.example.com',
        apiKey: 'valid-key-123',
        timeout: 30000
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('APIClientError', () => {
    it('should create error instance with proper properties', () => {
      const error = new APIClientError('Test message', 'TEST_CODE', { detail: 'info' });

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('APIClientError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error instanceof Error).toBe(true);
    });
  });
});