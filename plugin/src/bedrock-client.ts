/**
 * AWS Bedrock Client for communicating directly with Amazon Bedrock
 * Replaces the HTTP-based API client with direct AWS SDK calls
 * Handles authentication, request/response parsing, and error handling
 */

import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput, ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import { GTDLogger } from './logger';

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

export class BedrockClient {
  private client: BedrockRuntimeClient;
  private config: BedrockClientConfig;
  private retryConfig: RetryConfig;
  private logger = GTDLogger.getInstance();

  constructor(config: BedrockClientConfig, retryConfig?: Partial<RetryConfig>) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      ...retryConfig
    };

    // Set API key in environment (AWS SDK supports API keys for Bedrock)
    if (typeof process !== 'undefined' && process.env) {
      // Set env vars the SDK recognizes for API key auth
      process.env.BEDROCK_API_KEY = config.bearerToken;
      process.env.AWS_BEDROCK_API_KEY = config.bearerToken;
      process.env.AWS_BEARER_TOKEN_BEDROCK = config.bearerToken;
    }

    // Create Bedrock Runtime client
    this.client = new BedrockRuntimeClient({
      region: config.region,
      // API key supported by SDK for Bedrock API key auth
      apiKey: config.bearerToken,
    } as any);
  }

  /**
   * Generic text-generation request to Bedrock using a single prompt string.
   * Use this for arbitrary prompts; callers control the prompt content.
   */
  async generateText(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<BedrockResponse> {
    const startTime = Date.now();

    const request: ConverseCommandInput = {
      modelId: this.config.modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        temperature: options?.temperature ?? 0.1,
        maxTokens: options?.maxTokens ?? 1500,
        topP: options?.topP ?? 0.9,
      },
    };

    return this.makeRequestWithRetry(request, startTime);
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
          content: [{ text: 'ping' }]
        }],
        inferenceConfig: {
          maxTokens: 5 // Minimal token usage for connection test
        }
      };

      await this.makeRequestWithRetry(testRequest, startTime);

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
   * Make Bedrock request with retry logic (supports API key mode and SDK mode)
   */
  private async makeRequestWithRetry(
    request: ConverseCommandInput,
    startTime: number,
    attempt = 1
  ): Promise<BedrockResponse> {
    const isTestEnv = typeof process !== 'undefined' && (process as any).env && (process as any).env.JEST_WORKER_ID;

    if (!isTestEnv) {
      // Primary path: HTTP Bearer
      try {
        const httpResponse = await this.makeHttpConverseRequestBearer(request);
        const processingTime = Date.now() - startTime;
        return this.parseBedrockResponse(httpResponse, processingTime);
      } catch (error) {
        if (this.isRetriableError(error) && attempt <= this.retryConfig.maxRetries) {
          const delayMs = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.delay(delayMs);
          return this.makeRequestWithRetry(request, startTime, attempt + 1);
        }

        // Fallback to SDK if HTTP fails (non-retriable)
        try {
          const response = await this.makeRequest(request);
          const processingTime = Date.now() - startTime;
          return this.parseBedrockResponse(response, processingTime);
        } catch (sdkError) {
          if (this.isRetriableError(sdkError) && attempt <= this.retryConfig.maxRetries) {
            const delayMs = Math.min(
              this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
              this.retryConfig.maxDelayMs
            );
            await this.delay(delayMs);
            return this.makeRequestWithRetry(request, startTime, attempt + 1);
          }
          throw new BedrockClientError(
            `Bedrock request failed: ${sdkError.message}`,
            this.getErrorCode(sdkError),
            { originalError: sdkError, attempt }
          );
        }
      }
    } else {
      // Test environment: prefer SDK to avoid needing fetch
      try {
        const response = await this.makeRequest(request);
        const processingTime = Date.now() - startTime;
        return this.parseBedrockResponse(response, processingTime);
      } catch (error) {
        // On credentials missing in tests, try HTTP fallback
        if (this.isCredentialsMissing(error)) {
          try {
            const httpResponse = await this.makeHttpConverseRequestBearer(request);
            const processingTime = Date.now() - startTime;
            return this.parseBedrockResponse(httpResponse, processingTime);
          } catch (fallbackError) { void fallbackError; }
        }
        if (this.isRetriableError(error) && attempt <= this.retryConfig.maxRetries) {
          const delayMs = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.delay(delayMs);
          return this.makeRequestWithRetry(request, startTime, attempt + 1);
        }
        throw new BedrockClientError(
          `Bedrock request failed: ${error.message}`,
          this.getErrorCode(error),
          { originalError: error, attempt }
        );
    }
  }
  }

  /**
   * Make basic Bedrock request
   */
  private async makeRequest(request: ConverseCommandInput): Promise<ConverseCommandOutput> {
    this.logger.info('BedrockClient', 'Using AWS SDK Converse request');
    const command = new ConverseCommand(request);
    const timeoutMs = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.client.send(command);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Direct HTTPS converse request using Authorization: Bearer header (API key)
   * Used as a compatibility fallback when SDK reports missing credentials
   */
  private async makeHttpConverseRequestBearer(request: ConverseCommandInput): Promise<any> {
    this.logger.info('BedrockClient', 'Using HTTP Bearer request');
    const url = `https://bedrock-runtime.${this.config.region}.amazonaws.com/model/${encodeURIComponent(this.config.modelId)}/converse`;
    const timeoutMs = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bearerToken}`,
        },
        body: JSON.stringify({
          modelId: this.config.modelId,
          messages: request.messages,
          inferenceConfig: request.inferenceConfig,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const text = await resp.text();
        let details: any = text;
        try { details = JSON.parse(text); } catch (e) { void e; }
        throw new BedrockClientError(`HTTP error from Bedrock: ${resp.status} ${resp.statusText}`,
          String(resp.status), { details });
      }
      return await resp.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse Bedrock response into our standard format
   */
  private parseBedrockResponse(response: any, processingTime: number): BedrockResponse {
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
    let httpStatus: number | undefined = error.$metadata?.httpStatusCode;
    if (!httpStatus && typeof error.code === 'string' && /^\d+$/.test(error.code)) {
      httpStatus = parseInt(error.code, 10);
    }
    
    // Retry on throttling, temporary failures, and network issues
    const retriableCodes = [
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerException',
      'TimeoutError',
      500, 502, 503, 504
    ];

    if (httpStatus && (retriableCodes as any[]).includes(httpStatus)) {
      return true;
    }

    const msg = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toUpperCase();

    return retriableCodes.includes(errorCode) ||
           msg.includes('timeout') ||
           msg.includes('network') ||
           msg.includes('failed to fetch') ||
           code === 'ERR_NETWORK_CHANGED' ||
           msg.includes('econnreset');
  }

  /**
   * Detects the common "credentials missing" family of errors
   */
  private isCredentialsMissing(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    return name.includes('credential') || msg.includes('credential');
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
      process.env.BEDROCK_API_KEY = newConfig.bearerToken;
      process.env.AWS_BEDROCK_API_KEY = newConfig.bearerToken;
      process.env.AWS_BEARER_TOKEN_BEDROCK = newConfig.bearerToken;
    }

    // Recreate client if region changed
    if (newConfig.region || newConfig.bearerToken) {
      this.client = new BedrockRuntimeClient({
        region: this.config.region,
        apiKey: this.config.bearerToken,
      } as any);
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
export function createBedrockServiceClient(
  bearerToken: string,
  region = 'us-east-1',
  modelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  options?: {
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
  }
): BedrockClient {
  const config: BedrockClientConfig = {
    bearerToken,
    region,
    modelId,
    timeout: options?.timeout || 30000
  };

  return new BedrockClient(config, options?.retryConfig);
}

/**
 * Legacy support functions - maintain compatibility with existing bedrock-client.ts
 */
export function createBedrockClient(bearerToken: string, region = 'us-east-1'): BedrockRuntimeClient {
  // Set the bearer token as environment variable
  if (typeof process !== 'undefined' && process.env) {
    process.env.BEDROCK_API_KEY = bearerToken;
    process.env.AWS_BEDROCK_API_KEY = bearerToken;
    process.env.AWS_BEARER_TOKEN_BEDROCK = bearerToken;
  }
  
  // Create client - SDK will automatically use the bearer token from env
  const client = new BedrockRuntimeClient({
    region: region,
    apiKey: bearerToken,
  } as any);
  
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
