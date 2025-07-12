import { toast } from 'sonner';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  abortSignal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry' | 'abortSignal'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// Default retryable errors - network and timeout errors
const DEFAULT_RETRYABLE_ERRORS = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (message.includes('network') || 
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if ('status' in error && typeof error.status === 'number') {
    const status = error.status;
    // Retry on 429 (Too Many Requests), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
    return status === 429 || status === 502 || status === 503 || status === 504;
  }
  
  return false;
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    retryableErrors: options.retryableErrors || DEFAULT_RETRYABLE_ERRORS,
  };

  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Check if operation was aborted
      if (opts.abortSignal?.aborted) {
        throw new Error('Operation aborted');
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Don't retry if error is not retryable
      if (!opts.retryableErrors(lastError)) {
        throw lastError;
      }

      // Don't retry if operation was aborted
      if (opts.abortSignal?.aborted) {
        throw new Error('Operation aborted');
      }

      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, delay);
        
        // Allow abort during delay
        if (opts.abortSignal) {
          opts.abortSignal.addEventListener('abort', () => {
            clearTimeout(timeout);
            resolve(undefined);
          }, { once: true });
        }
      });

      // Increase delay for next attempt
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Retry wrapper for fetch operations
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init);
      
      // Throw error for retryable status codes
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number };
        error.status = response.status;
        if (DEFAULT_RETRYABLE_ERRORS(error)) {
          throw error;
        }
      }
      
      return response;
    },
    {
      ...retryOptions,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${url}:`, error.message);
        retryOptions?.onRetry?.(attempt, error);
      }
    }
  );
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  private static recoveryStrategies = new Map<string, () => Promise<void>>();
  private static isRecovering = false;

  /**
   * Register a recovery strategy for a specific error type
   */
  static register(errorType: string, strategy: () => Promise<void>): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Attempt to recover from an error
   */
  static async recover(error: Error): Promise<boolean> {
    if (this.isRecovering) {
      console.warn('Recovery already in progress');
      return false;
    }

    this.isRecovering = true;

    try {
      // Check for specific error types
      for (const [errorType, strategy] of this.recoveryStrategies) {
        if (error.message.includes(errorType) || error.name === errorType) {
          console.log(`Attempting recovery for ${errorType}`);
          await strategy();
          return true;
        }
      }

      // Default recovery strategies
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return await this.recoverFromNetworkError();
      }

      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return await this.recoverFromAuthError();
      }

      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  private static async recoverFromNetworkError(): Promise<boolean> {
    // Check if we're online
    if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.');
      
      // Wait for connection to be restored
      return new Promise((resolve) => {
        const handleOnline = () => {
          window.removeEventListener('online', handleOnline);
          toast.success('Connection restored');
          resolve(true);
        };
        
        window.addEventListener('online', handleOnline);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('online', handleOnline);
          resolve(false);
        }, 30000);
      });
    }

    return false;
  }

  private static async recoverFromAuthError(): Promise<boolean> {
    toast.error('Authentication error. Please refresh the page.');
    return false;
  }
}

/**
 * Wrapper for R2 operations with retry logic
 */
export async function r2OperationWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options?: RetryOptions
): Promise<T> {
  try {
    return await withRetry(operation, {
      ...options,
      onRetry: (attempt, error) => {
        if (attempt === 1) {
          toast.warning(`${operationName} failed, retrying...`);
        }
        options?.onRetry?.(attempt, error);
      }
    });
  } catch (error) {
    // Attempt recovery
    const recovered = await ErrorRecovery.recover(error as Error);
    
    if (recovered) {
      // Retry once more after recovery
      return await operation();
    }
    
    throw error;
  }
}

/**
 * Create an abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  
  setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return controller;
}