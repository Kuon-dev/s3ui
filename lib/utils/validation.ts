/**
 * Input validation utilities for the R2 File Manager application.
 * Provides type-safe validation with detailed error messages.
 * 
 * @fileoverview Input validation and sanitization utilities
 */

import { ApiError, ApiErrorType } from '../types/api';

/**
 * Validation result that can be either successful or contain errors.
 * 
 * @template T - The type of the validated data
 * @public
 */
export type ValidationResult<T> = {
  /** Indicates validation was successful */
  success: true;
  /** The validated and potentially sanitized data */
  data: T;
  /** No errors present */
  errors: [];
} | {
  /** Indicates validation failed */
  success: false;
  /** No valid data */
  data: null;
  /** Array of validation errors */
  errors: ValidationError[];
};

/**
 * Represents a validation error with context.
 * 
 * @public
 */
export interface ValidationError {
  /** The field that failed validation */
  field: string;
  /** The validation rule that was violated */
  rule: string;
  /** Human-readable error message */
  message: string;
  /** The invalid value */
  value?: unknown;
}

/**
 * Configuration for file validation.
 * 
 * @public
 */
export interface FileValidationConfig {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed file extensions (with or without dots) */
  allowedExtensions?: string[];
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Whether to check file content matches extension */
  validateContent?: boolean;
}

/**
 * Configuration for path validation.
 * 
 * @public
 */
export interface PathValidationConfig {
  /** Maximum path length */
  maxLength?: number;
  /** Whether to allow parent directory references (..) */
  allowParentDir?: boolean;
  /** Whether to allow hidden files/folders (starting with .) */
  allowHidden?: boolean;
  /** Custom prohibited characters */
  prohibitedChars?: string[];
}

/**
 * Default configuration for file validation.
 */
const DEFAULT_FILE_CONFIG: Required<FileValidationConfig> = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: [], // Empty means all allowed
  allowedMimeTypes: [], // Empty means all allowed
  validateContent: false,
};

/**
 * Default configuration for path validation.
 */
const DEFAULT_PATH_CONFIG: Required<PathValidationConfig> = {
  maxLength: 1000,
  allowParentDir: false,
  allowHidden: true,
  prohibitedChars: ['<', '>', ':', '"', '|', '?', '*', '\0'],
};

/**
 * Creates a validation error.
 * 
 * @param field - The field that failed validation
 * @param rule - The validation rule that was violated
 * @param message - Human-readable error message
 * @param value - The invalid value
 * @returns ValidationError object
 * 
 * @internal
 */
function createValidationError(
  field: string,
  rule: string,
  message: string,
  value?: unknown
): ValidationError {
  return { field, rule, message, value };
}

/**
 * Validates and sanitizes a file path for R2 storage.
 * 
 * @param path - The path to validate
 * @param config - Validation configuration
 * @returns ValidationResult with sanitized path
 * 
 * @example
 * ```typescript
 * const result = validatePath('documents/file.pdf');
 * if (result.success) {
 *   console.log('Valid path:', result.data);
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 * 
 * @public
 */
export function validatePath(
  path: string,
  config: PathValidationConfig = {}
): ValidationResult<string> {
  const errors: ValidationError[] = [];
  const finalConfig = { ...DEFAULT_PATH_CONFIG, ...config };
  
  // Check if path is provided
  if (typeof path !== 'string') {
    errors.push(createValidationError(
      'path',
      'type',
      'Path must be a string',
      path
    ));
    return { success: false, data: null, errors };
  }
  
  // Sanitize path: trim whitespace and normalize separators
  let sanitizedPath = path.trim().replace(/\\/g, '/');
  
  // Remove leading slash if present (R2 keys shouldn't start with /)
  if (sanitizedPath.startsWith('/')) {
    sanitizedPath = sanitizedPath.substring(1);
  }
  
  // Check path length
  if (sanitizedPath.length > finalConfig.maxLength) {
    errors.push(createValidationError(
      'path',
      'maxLength',
      `Path must be ${finalConfig.maxLength} characters or less`,
      sanitizedPath.length
    ));
  }
  
  // Check for prohibited characters
  const prohibitedCharsInPath = finalConfig.prohibitedChars.filter(char =>
    sanitizedPath.includes(char)
  );
  if (prohibitedCharsInPath.length > 0) {
    errors.push(createValidationError(
      'path',
      'prohibitedChars',
      `Path contains prohibited characters: ${prohibitedCharsInPath.join(', ')}`,
      prohibitedCharsInPath
    ));
  }
  
  // Check for parent directory references
  if (!finalConfig.allowParentDir && sanitizedPath.includes('..')) {
    errors.push(createValidationError(
      'path',
      'parentDir',
      'Parent directory references (..) are not allowed',
      '..'
    ));
  }
  
  // Check for hidden files/folders
  if (!finalConfig.allowHidden) {
    const pathParts = sanitizedPath.split('/');
    const hiddenParts = pathParts.filter(part => part.startsWith('.') && part !== '.');
    if (hiddenParts.length > 0) {
      errors.push(createValidationError(
        'path',
        'hidden',
        'Hidden files and folders are not allowed',
        hiddenParts
      ));
    }
  }
  
  // Check for empty path segments (double slashes)
  if (sanitizedPath.includes('//')) {
    errors.push(createValidationError(
      'path',
      'emptySegments',
      'Path cannot contain empty segments (double slashes)',
      '//'
    ));
  }
  
  // Check for invalid path endings
  if (sanitizedPath.endsWith('/') && sanitizedPath.length > 1) {
    // For folders, trailing slash is OK, but clean up multiple trailing slashes
    sanitizedPath = sanitizedPath.replace(/\/+$/, '/');
  }
  
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }
  
  return { success: true, data: sanitizedPath, errors: [] };
}

/**
 * Validates a file for upload.
 * 
 * @param file - The file to validate
 * @param config - Validation configuration
 * @returns ValidationResult with the file
 * 
 * @example
 * ```typescript
 * const result = validateFile(file, {
 *   maxSize: 10 * 1024 * 1024, // 10MB
 *   allowedExtensions: ['.jpg', '.png', '.pdf']
 * });
 * ```
 * 
 * @public
 */
export function validateFile(
  file: File,
  config: FileValidationConfig = {}
): ValidationResult<File> {
  const errors: ValidationError[] = [];
  const finalConfig = { ...DEFAULT_FILE_CONFIG, ...config };
  
  // Check if file is provided
  if (!(file instanceof File)) {
    errors.push(createValidationError(
      'file',
      'type',
      'Must be a valid File object',
      typeof file
    ));
    return { success: false, data: null, errors };
  }
  
  // Check file size
  if (file.size > finalConfig.maxSize) {
    errors.push(createValidationError(
      'file',
      'maxSize',
      `File size must be ${formatFileSize(finalConfig.maxSize)} or less`,
      formatFileSize(file.size)
    ));
  }
  
  // Check file extension
  if (finalConfig.allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    const normalizedAllowed = finalConfig.allowedExtensions.map(ext => 
      ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
    );
    
    if (!normalizedAllowed.includes(extension.toLowerCase())) {
      errors.push(createValidationError(
        'file',
        'extension',
        `File extension ${extension} is not allowed. Allowed: ${normalizedAllowed.join(', ')}`,
        extension
      ));
    }
  }
  
  // Check MIME type
  if (finalConfig.allowedMimeTypes.length > 0) {
    if (!finalConfig.allowedMimeTypes.includes(file.type)) {
      errors.push(createValidationError(
        'file',
        'mimeType',
        `File type ${file.type} is not allowed. Allowed: ${finalConfig.allowedMimeTypes.join(', ')}`,
        file.type
      ));
    }
  }
  
  // Validate file name as a path
  const pathValidation = validatePath(file.name);
  if (!pathValidation.success) {
    errors.push(...pathValidation.errors.map(error => ({
      ...error,
      field: `file.${error.field}`,
    })));
  }
  
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }
  
  return { success: true, data: file, errors: [] };
}

/**
 * Validates multiple files for batch upload.
 * 
 * @param files - Array of files to validate
 * @param config - Validation configuration
 * @returns ValidationResult with valid files and individual file errors
 * 
 * @public
 */
export function validateFiles(
  files: File[],
  config: FileValidationConfig = {}
): ValidationResult<File[]> & {
  /** Individual file validation results */
  fileResults: Array<{ file: File; result: ValidationResult<File> }>;
} {
  const errors: ValidationError[] = [];
  const validFiles: File[] = [];
  const fileResults: Array<{ file: File; result: ValidationResult<File> }> = [];
  
  if (!Array.isArray(files)) {
    errors.push(createValidationError(
      'files',
      'type',
      'Files must be an array',
      typeof files
    ));
    return { success: false, data: null, errors, fileResults: [] };
  }
  
  if (files.length === 0) {
    errors.push(createValidationError(
      'files',
      'empty',
      'At least one file must be provided',
      files.length
    ));
    return { success: false, data: null, errors, fileResults: [] };
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = validateFile(file, config);
    fileResults.push({ file, result });
    
    if (result.success) {
      validFiles.push(result.data);
    } else {
      // Add file index to error fields
      result.errors.forEach(error => {
        errors.push({
          ...error,
          field: `files[${i}].${error.field}`,
        });
      });
    }
  }
  
  if (validFiles.length === 0) {
    return { success: false, data: null, errors, fileResults };
  }
  
  return { 
    success: true as const, 
    data: validFiles, 
    errors: [] as const, 
    fileResults 
  };
}

/**
 * Validates a search query.
 * 
 * @param query - The search query to validate
 * @returns ValidationResult with sanitized query
 * 
 * @public
 */
export function validateSearchQuery(query: string): ValidationResult<string> {
  const errors: ValidationError[] = [];
  
  if (typeof query !== 'string') {
    errors.push(createValidationError(
      'query',
      'type',
      'Search query must be a string',
      typeof query
    ));
    return { success: false, data: null, errors };
  }
  
  const sanitizedQuery = query.trim();
  
  if (sanitizedQuery.length === 0) {
    errors.push(createValidationError(
      'query',
      'empty',
      'Search query cannot be empty',
      sanitizedQuery
    ));
  }
  
  if (sanitizedQuery.length > 100) {
    errors.push(createValidationError(
      'query',
      'maxLength',
      'Search query must be 100 characters or less',
      sanitizedQuery.length
    ));
  }
  
  // Check for potential injection attempts
  const dangerousPatterns = [
    /[<>]/g,  // HTML tags
    /javascript:/gi,  // JavaScript URLs
    /data:/gi,  // Data URLs
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitizedQuery)) {
      errors.push(createValidationError(
        'query',
        'dangerous',
        'Search query contains potentially dangerous content',
        sanitizedQuery
      ));
      break;
    }
  }
  
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }
  
  return { success: true, data: sanitizedQuery, errors: [] };
}

/**
 * Validates pagination parameters.
 * 
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns ValidationResult with validated pagination
 * 
 * @public
 */
export function validatePagination(
  page: number,
  limit: number
): ValidationResult<{ page: number; limit: number }> {
  const errors: ValidationError[] = [];
  
  if (!Number.isInteger(page) || page < 1) {
    errors.push(createValidationError(
      'page',
      'invalid',
      'Page must be a positive integer',
      page
    ));
  }
  
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    errors.push(createValidationError(
      'limit',
      'invalid',
      'Limit must be an integer between 1 and 1000',
      limit
    ));
  }
  
  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }
  
  return { success: true, data: { page, limit }, errors: [] };
}

/**
 * Converts validation errors to an API error.
 * 
 * @param errors - Array of validation errors
 * @returns ApiError object
 * 
 * @public
 */
export function validationErrorsToApiError(errors: ValidationError[]): ApiError {
  const messages = errors.map(error => `${error.field}: ${error.message}`);
  
  return {
    type: ApiErrorType.VALIDATION_ERROR,
    message: `Validation failed: ${messages.join(', ')}`,
    details: JSON.stringify(errors),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Utility functions for validation
 */

/**
 * Gets the file extension from a filename.
 * 
 * @param filename - The filename
 * @returns File extension with leading dot
 * 
 * @internal
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot);
}

/**
 * Formats file size in human-readable format.
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string
 * 
 * @internal
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}