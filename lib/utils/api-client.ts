/**
 * Type-safe API client with comprehensive error handling and retry logic.
 * Provides a consistent interface for all API operations.
 * 
 * @fileoverview Centralized API client utilities
 */

import { ApiResponse, ApiError, ApiErrorType, ApiResult, ApiRequestConfig } from '../types/api';

/**
 * Configuration for the API client.
 * 
 * @internal
 */
interface ApiClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Default retry configuration */
  defaultRetry: {
    attempts: number;
    delay: number;
    backoffMultiplier: number;
  };
}

/**
 * Default configuration for the API client.
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: '/api',
  defaultTimeout: 30000, // 30 seconds
  defaultRetry: {
    attempts: 3,
    delay: 1000, // 1 second
    backoffMultiplier: 2,
  },
};

/**
 * Creates an ApiError from various error sources.
 * 
 * @param error - The error to convert
 * @param context - Additional context about the error
 * @returns Standardized ApiError object
 * 
 * @internal
 */
function createApiError(
  error: unknown,
  context: { endpoint?: string; method?: string; statusCode?: number } = {}
): ApiError {
  const timestamp = new Date().toISOString();
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ApiErrorType.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection.',
      details: error.message,
      statusCode: context.statusCode,
      timestamp,
    };
  }
  
  if (error instanceof Error) {
    // Parse different types of errors
    if (error.name === 'AbortError') {
      return {
        type: ApiErrorType.NETWORK_ERROR,
        message: 'Request was cancelled.',
        details: error.message,
        timestamp,
      };
    }
    
    if (error.message.includes('timeout')) {
      return {
        type: ApiErrorType.NETWORK_ERROR,
        message: 'Request timed out. Please try again.',
        details: error.message,
        timestamp,
      };
    }
    
    // Check for specific R2 errors
    if (error.message.includes('NoSuchBucket') || error.message.includes('AccessDenied')) {
      return {
        type: ApiErrorType.R2_ERROR,
        message: 'Storage service error. Please check your configuration.',
        details: error.message,
        statusCode: context.statusCode,
        timestamp,
      };
    }
    
    return {
      type: ApiErrorType.SERVER_ERROR,
      message: error.message || 'An unexpected error occurred.',
      details: error.stack,
      statusCode: context.statusCode,
      timestamp,
    };
  }
  
  return {
    type: ApiErrorType.UNKNOWN_ERROR,
    message: 'An unknown error occurred.',
    details: String(error),
    statusCode: context.statusCode,
    timestamp,
  };
}

/**
 * Determines if an error is retryable.
 * 
 * @param error - The error to check
 * @returns Whether the error should trigger a retry
 * 
 * @internal
 */
function isRetryableError(error: ApiError): boolean {
  // Don't retry client errors (4xx) except for specific cases
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    // Retry on rate limiting
    if (error.statusCode === 429) {
      return true;
    }
    // Don't retry other client errors
    return false;
  }
  
  // Retry network errors and server errors
  return [
    ApiErrorType.NETWORK_ERROR,
    ApiErrorType.SERVER_ERROR,
    ApiErrorType.R2_ERROR,
  ].includes(error.type);
}

/**
 * Implements exponential backoff delay calculation.
 * 
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param multiplier - Backoff multiplier
 * @returns Delay in milliseconds
 * 
 * @internal
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, multiplier: number): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.min(delay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Sleep for a specified duration.
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 * 
 * @internal
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Type-safe API client class with retry logic and error handling.
 * 
 * @public
 */
export class ApiClient {
  private config: ApiClientConfig;
  
  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Makes a type-safe API request with automatic retry and error handling.
   * 
   * @template T - Expected response data type
   * @param endpoint - API endpoint (relative to base URL)
   * @param options - Request configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @example
   * ```typescript
   * const client = new ApiClient();
   * const result = await client.request<R2Object[]>('/r2/list', {
   *   method: 'GET',
   *   timeout: 10000
   * });
   * 
   * if (result.success) {
   *   console.log('Files:', result.data);
   * } else {
   *   console.error('Error:', result.error.message);
   * }
   * ```
   * 
   * @public
   */
  async request<T>(
    endpoint: string,
    options: RequestInit & ApiRequestConfig = {}
  ): Promise<ApiResult<T>> {
    const {
      timeout = this.config.defaultTimeout,
      retry = true,
      retryAttempts = this.config.defaultRetry.attempts,
      retryDelay = this.config.defaultRetry.delay,
      signal,
      headers = {},
      ...fetchOptions
    } = options;
    
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    
    // Create timeout controller if no signal provided
    const timeoutController = signal ? null : new AbortController();
    const requestSignal = signal || timeoutController?.signal;
    
    // Set up timeout
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeoutController && timeout > 0) {
      timeoutId = setTimeout(() => {
        timeoutController.abort();
      }, timeout);
    }
    
    let lastError: ApiError | null = null;
    const maxAttempts = retry ? retryAttempts + 1 : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Add delay for retry attempts
        if (attempt > 0) {
          const delay = calculateBackoffDelay(
            attempt - 1,
            retryDelay,
            this.config.defaultRetry.backoffMultiplier
          );
          await sleep(delay);
        }
        
        const response = await fetch(url, {
          ...fetchOptions,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: requestSignal,
        });
        
        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        let responseData: ApiResponse<T>;
        try {
          responseData = await response.json();
        } catch {
          throw new Error(`Invalid JSON response: ${response.statusText}`);
        }
        
        // Handle HTTP errors
        if (!response.ok) {
          const error = createApiError(
            new Error(responseData.error || response.statusText),
            { endpoint, method, statusCode: response.status }
          );
          
          // Don't retry if it's not a retryable error
          if (!isRetryableError(error) || attempt === maxAttempts - 1) {
            return { success: false, data: null, error };
          }
          
          lastError = error;
          continue;
        }
        
        // Handle API-level errors
        if (!responseData.success) {
          const error = createApiError(
            new Error(responseData.error || 'API request failed'),
            { endpoint, method, statusCode: response.status }
          );
          
          if (!isRetryableError(error) || attempt === maxAttempts - 1) {
            return { success: false, data: null, error };
          }
          
          lastError = error;
          continue;
        }
        
        // Success case
        return {
          success: true,
          data: responseData.data as T,
          error: null,
        };
        
      } catch (error) {
        const apiError = createApiError(error, { endpoint, method });
        
        // Don't retry if it's not a retryable error or last attempt
        if (!isRetryableError(apiError) || attempt === maxAttempts - 1) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          return { success: false, data: null, error: apiError };
        }
        
        lastError = apiError;
      }
    }
    
    // This should never be reached, but just in case
    return {
      success: false,
      data: null,
      error: lastError || createApiError(new Error('Unknown error occurred')),
    };
  }
  
  /**
   * Convenience method for GET requests.
   * 
   * @template T - Expected response data type
   * @param endpoint - API endpoint
   * @param options - Request configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @public
   */
  async get<T>(endpoint: string, options: ApiRequestConfig = {}): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  /**
   * Convenience method for POST requests.
   * 
   * @template T - Expected response data type
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @public
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestConfig = {}
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * Convenience method for PUT requests.
   * 
   * @template T - Expected response data type
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @public
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestConfig = {}
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * Convenience method for DELETE requests.
   * 
   * @template T - Expected response data type
   * @param endpoint - API endpoint
   * @param options - Request configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @public
   */
  async delete<T>(endpoint: string, options: ApiRequestConfig = {}): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
  
  /**
   * Uploads a file with progress tracking.
   * 
   * @param endpoint - Upload endpoint
   * @param file - File to upload
   * @param options - Upload configuration options
   * @returns Promise that resolves to ApiResult<T>
   * 
   * @public
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    options: ApiRequestConfig & {
      onProgress?: (progress: number) => void;
      additionalData?: Record<string, string>;
    } = {}
  ): Promise<ApiResult<T>> {
    const { onProgress, additionalData, ...requestOptions } = options;
    void onProgress; // Future implementation placeholder
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return this.request<T>(endpoint, {
      ...requestOptions,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...requestOptions.headers,
      },
    });
  }
}

/**
 * Default API client instance.
 * 
 * @public
 */
export const apiClient = new ApiClient();

/**
 * Utility function for handling API results with toast notifications.
 * 
 * @template T - Expected data type
 * @param result - API result to handle
 * @param options - Handling options
 * @returns The data if successful, null if failed
 * 
 * @example
 * ```typescript
 * const files = await handleApiResult(
 *   apiClient.get<R2Object[]>('/r2/list'),
 *   {
 *     successMessage: 'Files loaded successfully',
 *     errorMessage: 'Failed to load files'
 *   }
 * );
 * 
 * if (files) {
 *   // Handle success
 * }
 * ```
 * 
 * @public
 */
export async function handleApiResult<T>(
  resultPromise: Promise<ApiResult<T>>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showSuccess?: boolean;
    showError?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  } = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage,
    showSuccess = false,
    showError = true,
    onSuccess,
    onError,
  } = options;
  
  try {
    const result = await resultPromise;
    
    if (result.success) {
      if (showSuccess && successMessage) {
        // Import toast dynamically to avoid circular dependencies
        const { toast } = await import('sonner');
        toast.success(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      return result.data;
    } else {
      const message = errorMessage || result.error.message;
      
      if (showError) {
        const { toast } = await import('sonner');
        toast.error(message);
      }
      
      if (onError) {
        onError(result.error);
      }
      
      console.error('API Error:', result.error);
      return null;
    }
  } catch (error) {
    const apiError = createApiError(error);
    const message = errorMessage || apiError.message;
    
    if (showError) {
      const { toast } = await import('sonner');
      toast.error(message);
    }
    
    if (onError) {
      onError(apiError);
    }
    
    console.error('API Error:', apiError);
    return null;
  }
}