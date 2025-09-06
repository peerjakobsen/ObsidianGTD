/**
 * API Client for communicating with the FastAPI GTD backend service
 * Handles all HTTP communication, request/response parsing, and error handling
 */

export interface APIRequest {
  task: string;
  content: string;
}

export interface APIResponse {
  result: string;
  status: 'success' | 'error';
  metadata: {
    model: string;
    tokens_used: number;
    processing_time_ms: number;
  };
}

export interface APIError {
  error: {
    type: string;
    message: string;
    details: string;
  };
}

export interface ClientConfig {
  backendUrl: string;
  timeout: number;
  apiKey: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class GTDAPIClient {
  private config: ClientConfig;
  private retryConfig: RetryConfig;

  constructor(config: ClientConfig, retryConfig?: Partial<RetryConfig>) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      ...retryConfig
    };
  }

  /**
   * Send a GTD clarification request to the backend
   */
  async clarifyText(
    content: string
  ): Promise<APIResponse> {
    const request: APIRequest = {
      task: 'gtd-clarification',
      content: content
    };

    return this.makeRequestWithRetry('/process', request);
  }

  /**
   * Test connection to the backend service
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/health', {}, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
          responseTime
        };
      } else {
        return {
          success: false,
          message: `Server responded with status ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        responseTime
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequestWithRetry(
    endpoint: string,
    data: any,
    attempt: number = 1
  ): Promise<APIResponse> {
    try {
      const response = await this.makeRequest(endpoint, data);
      
      if (!response.ok) {
        if (response.status >= 500 && attempt <= this.retryConfig.maxRetries) {
          // Server error, retry with exponential backoff
          const delayMs = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          
          await this.delay(delayMs);
          return this.makeRequestWithRetry(endpoint, data, attempt + 1);
        }
        
        // Client error or max retries exceeded
        const errorBody = await response.text();
        let errorData: APIError;
        
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = {
            error: {
              type: 'HTTP_ERROR',
              message: `HTTP ${response.status}: ${response.statusText}`,
              details: `Status: ${response.status}, StatusText: ${response.statusText}`
            }
          };
        }
        
        throw new APIClientError(errorData.error.message, errorData.error.type, errorData.error.details);
      }
      
      const responseData: APIResponse = await response.json();
      return responseData;
      
    } catch (error) {
      if (error instanceof APIClientError) {
        throw error;
      }
      
      // Network error, retry if attempts remaining
      if (attempt <= this.retryConfig.maxRetries && this.isRetriableError(error)) {
        const delayMs = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );
        
        await this.delay(delayMs);
        return this.makeRequestWithRetry(endpoint, data, attempt + 1);
      }
      
      throw new APIClientError(
        `Network request failed: ${error.message}`,
        'NETWORK_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Make basic HTTP request
   */
  private async makeRequest(
    endpoint: string,
    data: any,
    options: { timeout?: number } = {}
  ): Promise<Response> {
    const url = this.buildUrl(endpoint);
    const timeout = options.timeout || this.config.timeout;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'ObsidianGTD/1.0.0'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Build full URL for endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.backendUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * Check if error is retriable (network issues, timeouts)
   */
  private isRetriableError(error: any): boolean {
    return (
      error.name === 'TypeError' ||  // Network issues
      error.name === 'AbortError' ||  // Timeout
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('timeout')
    );
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
  updateConfig(newConfig: Partial<ClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
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
  getConfig(): Omit<ClientConfig, 'apiKey'> & { hasApiKey: boolean } {
    return {
      backendUrl: this.config.backendUrl,
      timeout: this.config.timeout,
      hasApiKey: !!this.config.apiKey
    };
  }
}

/**
 * Custom error class for API client errors
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Factory function to create API client with default settings
 */
export function createGTDAPIClient(
  backendUrl: string,
  apiKey: string,
  options?: {
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
  }
): GTDAPIClient {
  const config: ClientConfig = {
    backendUrl,
    apiKey,
    timeout: options?.timeout || 30000
  };

  return new GTDAPIClient(config, options?.retryConfig);
}

/**
 * Validate API configuration
 */
export function validateAPIConfig(config: Partial<ClientConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.backendUrl) {
    errors.push('Backend URL is required');
  } else if (!isValidUrl(config.backendUrl)) {
    errors.push('Backend URL must be a valid HTTP/HTTPS URL');
  }

  if (!config.apiKey) {
    errors.push('API key is required');
  } else if (config.apiKey.length < 10) {
    errors.push('API key appears to be too short');
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

/**
 * Simple URL validation
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}