/**
 * AWS Bedrock Client for communicating directly with Amazon Bedrock
 * Replaces the HTTP-based API client with direct AWS SDK calls
 * Handles authentication, request/response parsing, and error handling
 */

import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput, ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';

export interface BedrockClientConfig {
  bearerToken: string;
  region: string;
  modelId: string;
  timeout?: number;
}

export interface BedrockResponse {
  result: string;
  status: 'success' | 'error';
  metadata: {
    model: string;
    tokens_used: number;
    processing_time_ms: number;
  };
}

export interface BedrockError {
  error: {
    type: string;
    message: string;
    details: string;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class BedrockClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BedrockClientError';
  }
}

export class GTDBedrockClient {
  private client: BedrockRuntimeClient;
  private config: BedrockClientConfig;
  private retryConfig: RetryConfig;

  constructor(config: BedrockClientConfig, retryConfig?: Partial<RetryConfig>) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      ...retryConfig
    };

    // Set bearer token in environment (AWS SDK expects this)
    if (typeof process !== 'undefined' && process.env) {
      process.env.AWS_BEARER_TOKEN_BEDROCK = config.bearerToken;
    }

    // Create Bedrock Runtime client
    this.client = new BedrockRuntimeClient({
      region: config.region
    });
  }

  /**
   * Send a GTD clarification request to Bedrock
   * Equivalent to GTDAPIClient.clarifyText() but using AWS SDK directly
   */
  async clarifyText(content: string): Promise<BedrockResponse> {
    const startTime = Date.now();

    try {
      const request: ConverseCommandInput = {
        modelId: this.config.modelId,
        messages: [{
          role: 'user',
          content: [{ text: content }]
        }],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 1500,
          topP: 0.9
        }
      };

      return this.makeRequestWithRetry(request, startTime);
    } catch (error) {
      throw new BedrockClientError(
        `GTD clarification failed: ${error.message}`,
        'CLARIFICATION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Test connection to AWS Bedrock service
   * Equivalent to GTDAPIClient.testConnection() but for Bedrock
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();

    try {
      // Use a minimal test request to verify connection
      const testRequest: ConverseCommandInput = {
        modelId: this.config.modelId,
        messages: [{
          role: 'user',
          content: [{ text: 'test' }]
        }],
        inferenceConfig: {
          maxTokens: 10 // Minimal token usage for connection test
        }
      };

      const command = new ConverseCommand(testRequest);
      await this.client.send(command);

      const responseTime = Date.now() - startTime;
      return {
        success: true,
        message: 'AWS Bedrock connection successful',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `AWS Bedrock connection failed: ${error.message}`,
        responseTime
      };
    }
  }

  /**
   * Make Bedrock request with retry logic
   */
  private async makeRequestWithRetry(
    request: ConverseCommandInput,
    startTime: number,
    attempt: number = 1
  ): Promise<BedrockResponse> {
    try {
      const response = await this.makeRequest(request);
      const processingTime = Date.now() - startTime;

      return this.parseBedrockResponse(response, processingTime);
    } catch (error) {
      if (this.isRetriableError(error) && attempt <= this.retryConfig.maxRetries) {
        // Exponential backoff
        const delayMs = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );

        await this.delay(delayMs);
        return this.makeRequestWithRetry(request, startTime, attempt + 1);
      }

      // Non-retriable error or max retries exceeded
      throw new BedrockClientError(
        `Bedrock request failed: ${error.message}`,
        this.getErrorCode(error),
        { originalError: error, attempt }
      );
    }
  }

  /**
   * Make basic Bedrock request
   */
  private async makeRequest(request: ConverseCommandInput): Promise<ConverseCommandOutput> {
    const command = new ConverseCommand(request);
    
    // Add timeout handling
    const timeoutMs = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Note: AWS SDK doesn't directly support AbortController in all environments
      // This is a best-effort timeout implementation
      const response = await this.client.send(command);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse Bedrock response into our standard format
   */
  private parseBedrockResponse(response: ConverseCommandOutput, processingTime: number): BedrockResponse {
    try {
      if (!response.output?.message?.content?.[0]?.text) {
        throw new Error('Invalid response structure from Bedrock');
      }

      const content = response.output.message.content[0].text;
      const tokensUsed = response.usage?.totalTokens || 0;

      return {
        result: content,
        status: 'success',
        metadata: {
          model: this.config.modelId,
          tokens_used: tokensUsed,
          processing_time_ms: processingTime
        }
      };
    } catch (error) {
      throw new BedrockClientError(
        `Failed to parse Bedrock response: ${error.message}`,
        'PARSE_ERROR',
        { response, originalError: error }
      );
    }
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: any): boolean {
    const errorCode = error.name || error.$metadata?.httpStatusCode;
    
    // Retry on throttling, temporary failures, and network issues
    const retriableCodes = [
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerException',
      'TimeoutError',
      500, 502, 503, 504
    ];

    return retriableCodes.includes(errorCode) ||
           error.message?.includes('timeout') ||
           error.message?.includes('network') ||
           error.message?.includes('ECONNRESET');
  }

  /**
   * Get error code from various error types
   */
  private getErrorCode(error: any): string {
    if (error.name) return error.name;
    if (error.$metadata?.httpStatusCode) return `HTTP_${error.$metadata.httpStatusCode}`;
    if (error.code) return error.code;
    return 'UNKNOWN_ERROR';
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<BedrockClientConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update bearer token in environment if changed
    if (newConfig.bearerToken && typeof process !== 'undefined' && process.env) {
      process.env.AWS_BEARER_TOKEN_BEDROCK = newConfig.bearerToken;
    }

    // Recreate client if region changed
    if (newConfig.region) {
      this.client = new BedrockRuntimeClient({
        region: newConfig.region
      });
    }
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(newRetryConfig: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...newRetryConfig };
  }

  /**
   * Get current configuration (excluding sensitive data)
   */
  getConfig(): Omit<BedrockClientConfig, 'bearerToken'> & { hasBearerToken: boolean } {
    return {
      region: this.config.region,
      modelId: this.config.modelId,
      timeout: this.config.timeout,
      hasBearerToken: !!this.config.bearerToken
    };
  }
}

/**
 * Factory function to create Bedrock client with default settings
 * Replaces createGTDAPIClient() for Bedrock usage
 */
export function createGTDBedrockClient(
  bearerToken: string,
  region: string = 'us-east-1',
  modelId: string = 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  options?: {
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
  }
): GTDBedrockClient {
  const config: BedrockClientConfig = {
    bearerToken,
    region,
    modelId,
    timeout: options?.timeout || 30000
  };

  return new GTDBedrockClient(config, options?.retryConfig);
}

/**
 * Legacy support functions - maintain compatibility with existing bedrock-client.ts
 */
export function createBedrockClient(bearerToken: string, region: string = 'us-east-1'): BedrockRuntimeClient {
  // Set the bearer token as environment variable
  if (typeof process !== 'undefined' && process.env) {
    process.env.AWS_BEARER_TOKEN_BEDROCK = bearerToken;
  }
  
  // Create client - SDK will automatically use the bearer token from env
  const client = new BedrockRuntimeClient({
    region: region
  });
  
  return client;
}

// Simple test function to verify imports work
export async function testConverse(client: BedrockRuntimeClient): Promise<ConverseCommand> {
  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    messages: [{ 
      role: 'user', 
      content: [{ text: 'test' }] 
    }]
  });
  
  return command;
}

/**
 * Validate Bedrock configuration
 */
export function validateBedrockConfig(config: Partial<BedrockClientConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.bearerToken) {
    errors.push('Bearer token is required');
  } else if (config.bearerToken.length < 10) {
    errors.push('Bearer token appears to be too short');
  }

  if (!config.region) {
    errors.push('AWS region is required');
  }

  if (!config.modelId) {
    errors.push('Bedrock model ID is required');
  } else if (!config.modelId.includes('.')) {
    errors.push('Model ID must follow format: provider.model-name');
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('Timeout must be a positive number');
    } else if (config.timeout < 1000) {
      errors.push('Timeout should be at least 1000ms (1 second)');
    } else if (config.timeout > 300000) {
      errors.push('Timeout should not exceed 300000ms (5 minutes)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}