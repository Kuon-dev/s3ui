/**
 * Type definitions for API responses and error handling.
 * Provides consistent typing across the application.
 * 
 * @fileoverview API type definitions and utilities
 */

/**
 * Standard API response format used across all endpoints.
 * 
 * @template T - The type of the data payload
 * @public
 */
export interface ApiResponse<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data (present when success is true) */
  data?: T;
  /** Error message (present when success is false) */
  error?: string;
  /** Additional metadata about the response */
  metadata?: {
    /** Total count of items (for paginated responses) */
    totalCount?: number;
    /** Current page number */
    page?: number;
    /** Items per page */
    limit?: number;
  };
}

/**
 * Represents different types of API errors that can occur.
 * 
 * @public
 */
export enum ApiErrorType {
  /** Network connectivity issues */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Request validation failures */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** Resource not found */
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  /** Authentication failures */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Server-side errors */
  SERVER_ERROR = 'SERVER_ERROR',
  /** R2 service specific errors */
  R2_ERROR = 'R2_ERROR',
  /** Rate limiting errors */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  /** Unknown or unexpected errors */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Detailed API error information with context.
 * 
 * @public
 */
export interface ApiError {
  /** The type of error that occurred */
  type: ApiErrorType;
  /** Human-readable error message */
  message: string;
  /** Technical error details (for debugging) */
  details?: string;
  /** Error code (if applicable) */
  code?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Timestamp when error occurred */
  timestamp: string;
}

/**
 * Type-safe wrapper for API responses that includes error handling.
 * 
 * @template T - The expected success response type
 * @public
 */
export type ApiResult<T> = {
  /** Indicates if the operation was successful */
  success: true;
  /** The response data */
  data: T;
  /** No error present */
  error: null;
} | {
  /** Indicates the operation failed */
  success: false;
  /** No data present */
  data: null;
  /** Error information */
  error: ApiError;
};

/**
 * Configuration options for API requests.
 * 
 * @public
 */
export interface ApiRequestConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to retry failed requests */
  retry?: boolean;
  /** Number of retry attempts */
  retryAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** AbortController signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Options for search operations.
 * 
 * @public
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** File types to include in search */
  fileTypes?: string[];
  /** Whether to include folders in results */
  includeFolders?: boolean;
  /** Sort order for results */
  sortBy?: 'name' | 'size' | 'modified';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination information for list responses.
 * 
 * @public
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
}

/**
 * File upload progress information.
 * 
 * @public
 */
export interface UploadProgress {
  /** Unique identifier for the upload */
  uploadId: string;
  /** File being uploaded */
  fileName: string;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Number of bytes uploaded */
  bytesUploaded: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Current upload speed in bytes/second */
  speed?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Current upload status */
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Batch operation result.
 * 
 * @template T - The type of individual operation results
 * @public
 */
export interface BatchResult<T> {
  /** Successfully completed operations */
  successful: T[];
  /** Failed operations with error details */
  failed: Array<{
    /** The item that failed */
    item: unknown;
    /** Error that occurred */
    error: ApiError;
  }>;
  /** Summary statistics */
  summary: {
    /** Total number of operations attempted */
    total: number;
    /** Number of successful operations */
    successCount: number;
    /** Number of failed operations */
    failureCount: number;
  };
}

/**
 * Cache configuration for API responses.
 * 
 * @public
 */
export interface CacheConfig {
  /** Cache key for the request */
  key: string;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Whether to serve stale data while revalidating */
  staleWhileRevalidate?: boolean;
  /** Custom cache validation function */
  validate?: (data: unknown) => boolean;
}

/**
 * Webhook payload for R2 events (future feature).
 * 
 * @public
 */
export interface R2WebhookPayload {
  /** Event type */
  eventType: 'object.created' | 'object.deleted' | 'object.updated';
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
  /** Event timestamp */
  timestamp: string;
  /** Additional event metadata */
  metadata?: Record<string, unknown>;
}