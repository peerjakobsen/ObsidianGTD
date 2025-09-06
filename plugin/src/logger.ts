/**
 * Comprehensive logging and debugging system for GTD plugin
 * Provides structured logging with different levels and debugging capabilities
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
  error?: Error;
  performance?: {
    duration_ms?: number;
    memory_usage?: number;
    operation?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableMemoryBuffer: boolean;
  maxBufferSize: number;
  enablePerformanceLogging: boolean;
}

export class GTDLogger {
  private config: LoggerConfig;
  private memoryBuffer: LogEntry[] = [];
  private performanceMarks: Map<string, number> = new Map();

  private static instance: GTDLogger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableMemoryBuffer: true,
      maxBufferSize: 100,
      enablePerformanceLogging: true,
      ...config
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): GTDLogger {
    if (!GTDLogger.instance) {
      GTDLogger.instance = new GTDLogger(config);
    }
    return GTDLogger.instance;
  }

  /**
   * Log debug information
   */
  debug(component: string, message: string, context?: any): void {
    this.log(LogLevel.DEBUG, component, message, context);
  }

  /**
   * Log general information
   */
  info(component: string, message: string, context?: any): void {
    this.log(LogLevel.INFO, component, message, context);
  }

  /**
   * Log warning messages
   */
  warn(component: string, message: string, context?: any): void {
    this.log(LogLevel.WARN, component, message, context);
  }

  /**
   * Log error messages with optional error object
   */
  error(component: string, message: string, error?: Error, context?: any): void {
    this.log(LogLevel.ERROR, component, message, context, error);
  }

  /**
   * Start performance measurement
   */
  startPerformanceMark(operation: string): void {
    if (this.config.enablePerformanceLogging) {
      this.performanceMarks.set(operation, Date.now());
    }
  }

  /**
   * End performance measurement and log results
   */
  endPerformanceMark(component: string, operation: string, context?: any): void {
    if (!this.config.enablePerformanceLogging) return;

    const startTime = this.performanceMarks.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceMarks.delete(operation);
      
      this.log(LogLevel.INFO, component, `Performance: ${operation}`, context, undefined, {
        duration_ms: duration,
        operation,
        memory_usage: this.getMemoryUsage()
      });
    }
  }

  /**
   * Log API request details
   */
  logAPIRequest(
    component: string,
    endpoint: string,
    method: string,
    requestSize: number,
    context?: any
  ): void {
    this.info(component, `API Request: ${method} ${endpoint}`, {
      ...context,
      request_size_bytes: requestSize,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API response details
   */
  logAPIResponse(
    component: string,
    endpoint: string,
    statusCode: number,
    responseSize: number,
    duration: number,
    context?: any
  ): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, component, `API Response: ${statusCode} ${endpoint}`, {
      ...context,
      status_code: statusCode,
      response_size_bytes: responseSize,
      duration_ms: duration
    });
  }

  /**
   * Log user actions for debugging workflow issues
   */
  logUserAction(component: string, action: string, context?: any): void {
    this.info(component, `User Action: ${action}`, {
      ...context,
      user_action: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log clarification workflow steps
   */
  logClarificationStep(
    step: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
    context?: any
  ): void {
    const message = `Clarification ${step}: ${status}`;
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    
    this.log(level, 'ClarificationService', message, {
      ...context,
      step,
      status,
      duration_ms: duration
    });
  }

  /**
   * Get recent log entries for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.memoryBuffer.slice(-count);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.memoryBuffer.filter(entry => entry.level === level);
  }

  /**
   * Get logs for a specific component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.memoryBuffer.filter(entry => entry.component === component);
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify({
      config: this.config,
      logs: this.memoryBuffer,
      exported_at: new Date().toISOString(),
      total_entries: this.memoryBuffer.length
    }, null, 2);
  }

  /**
   * Clear memory buffer
   */
  clearLogs(): void {
    this.memoryBuffer = [];
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: any,
    error?: Error,
    performance?: any
  ): void {
    if (level < this.config.level) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      context,
      error,
      performance
    };

    // Add to memory buffer
    if (this.config.enableMemoryBuffer) {
      this.memoryBuffer.push(logEntry);
      
      // Maintain buffer size limit
      if (this.memoryBuffer.length > this.config.maxBufferSize) {
        this.memoryBuffer.shift();
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelName = levelNames[entry.level];
    const prefix = `[GTD ${levelName}] [${entry.component}]`;
    
    const logArgs: any[] = [
      `${prefix} ${entry.message}`,
    ];

    if (entry.context) {
      logArgs.push('Context:', entry.context);
    }

    if (entry.performance) {
      logArgs.push('Performance:', entry.performance);
    }

    if (entry.error) {
      logArgs.push('Error:', entry.error);
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...logArgs);
        break;
      case LogLevel.INFO:
        console.info(...logArgs);
        break;
      case LogLevel.WARN:
        console.warn(...logArgs);
        break;
      case LogLevel.ERROR:
        console.error(...logArgs);
        break;
    }
  }

  /**
   * Get approximate memory usage (if available)
   */
  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize;
    }
    return undefined;
  }
}

/**
 * Debug helper utilities
 */
export class DebugUtils {
  private static logger = GTDLogger.getInstance();

  /**
   * Create a performance-monitoring wrapper for async functions
   */
  static withPerformanceLogging<T extends any[], R>(
    component: string,
    operation: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      DebugUtils.logger.startPerformanceMark(operation);
      try {
        const result = await fn(...args);
        DebugUtils.logger.endPerformanceMark(component, operation);
        return result;
      } catch (error) {
        DebugUtils.logger.endPerformanceMark(component, operation);
        DebugUtils.logger.error(component, `${operation} failed`, error as Error);
        throw error;
      }
    };
  }

  /**
   * Log object properties for debugging
   */
  static inspectObject(component: string, objectName: string, obj: any): void {
    const inspection = {
      type: typeof obj,
      constructor: obj?.constructor?.name,
      keys: obj && typeof obj === 'object' ? Object.keys(obj) : undefined,
      length: Array.isArray(obj) ? obj.length : undefined,
      value: obj
    };
    
    DebugUtils.logger.debug(component, `Object inspection: ${objectName}`, inspection);
  }

  /**
   * Create a debug trace for method calls
   */
  static trace(component: string, methodName: string, args?: any[]): void {
    DebugUtils.logger.debug(component, `Method call: ${methodName}`, {
      method: methodName,
      arguments: args,
      stack_trace: new Error().stack?.split('\n').slice(1, 4)
    });
  }

  /**
   * Generate debugging information for clarification results
   */
  static debugClarificationResult(result: any): void {
    const debugInfo = {
      success: result.success,
      action_count: result.actions?.length || 0,
      processing_time: result.processing_time_ms,
      has_error: !!result.error,
      error_message: result.error,
      text_length: result.original_text?.length,
      model_used: result.model_used,
      tokens_used: result.tokens_used,
      performance_metrics: result.performance_metrics
    };

    DebugUtils.logger.debug('ClarificationService', 'Clarification result analysis', debugInfo);
  }
}

// Export default logger instance
export const logger = GTDLogger.getInstance();