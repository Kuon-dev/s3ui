/**
 * Comprehensive path validation utilities for R2 file operations
 */

// Maximum path length (S3 compatible)
const MAX_PATH_LENGTH = 1024;
const MAX_SEGMENT_LENGTH = 255;

// Reserved names that could cause issues
const RESERVED_NAMES = new Set([
  '.', '..', 'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

// Characters that are problematic in various contexts
const INVALID_CHARS_REGEX = /[\x00-\x1F\x7F]/; // Control characters
const PROBLEMATIC_CHARS_REGEX = /[<>:"|?*\\]/; // Windows forbidden chars
const WHITESPACE_ONLY_REGEX = /^\s*$/;

export interface PathValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedPath?: string;
}

/**
 * Validates a file or folder path
 */
export function validatePath(
  path: string,
  options: {
    isFolder?: boolean;
    allowEmpty?: boolean;
    checkReserved?: boolean;
    strictMode?: boolean;
  } = {}
): PathValidationResult {
  const {
    isFolder = false,
    allowEmpty = false,
    checkReserved = true,
    strictMode = false
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for null/undefined
  if (path === null || path === undefined) {
    return {
      isValid: false,
      errors: ['Path cannot be null or undefined'],
      warnings
    };
  }

  // Check for empty path
  if (!path && !allowEmpty) {
    return {
      isValid: false,
      errors: ['Path cannot be empty'],
      warnings
    };
  }

  // Allow empty path if specified
  if (!path && allowEmpty) {
    return {
      isValid: true,
      errors,
      warnings,
      normalizedPath: ''
    };
  }

  // Check path length
  if (path.length > MAX_PATH_LENGTH) {
    errors.push(`Path exceeds maximum length of ${MAX_PATH_LENGTH} characters`);
  }

  // Check for control characters
  if (INVALID_CHARS_REGEX.test(path)) {
    errors.push('Path contains invalid control characters');
  }

  // Check for problematic characters in strict mode
  if (strictMode && PROBLEMATIC_CHARS_REGEX.test(path)) {
    errors.push('Path contains characters that may cause issues: < > : " | ? * \\');
  } else if (!strictMode && PROBLEMATIC_CHARS_REGEX.test(path)) {
    warnings.push('Path contains characters that may cause issues on some systems');
  }

  // Check for whitespace-only names
  const segments = path.split('/').filter(Boolean);
  for (const segment of segments) {
    if (WHITESPACE_ONLY_REGEX.test(segment)) {
      errors.push('Path segments cannot contain only whitespace');
    }

    // Check segment length
    if (segment.length > MAX_SEGMENT_LENGTH) {
      errors.push(`Path segment "${segment}" exceeds maximum length of ${MAX_SEGMENT_LENGTH} characters`);
    }

    // Check for reserved names
    if (checkReserved && RESERVED_NAMES.has(segment.toUpperCase())) {
      errors.push(`"${segment}" is a reserved name and cannot be used`);
    }

    // Check for leading/trailing spaces
    if (segment !== segment.trim()) {
      warnings.push(`Path segment "${segment}" has leading or trailing spaces`);
    }

    // Check for dots at the beginning or end
    if (segment.startsWith('.') || segment.endsWith('.')) {
      warnings.push(`Path segment "${segment}" starts or ends with a dot, which may be hidden on some systems`);
    }
  }

  // Check for double slashes
  if (path.includes('//')) {
    warnings.push('Path contains consecutive slashes');
  }

  // Check for absolute paths (starting with /)
  if (path.startsWith('/')) {
    warnings.push('Path starts with /, which indicates an absolute path');
  }

  // Normalize the path
  const normalizedPath = normalizePath(path, isFolder);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedPath
  };
}

/**
 * Normalizes a path by cleaning up various issues
 */
export function normalizePath(path: string, isFolder: boolean = false): string {
  if (!path) return '';

  // Remove control characters
  let normalized = path.replace(INVALID_CHARS_REGEX, '');

  // Replace backslashes with forward slashes
  normalized = normalized.replace(/\\/g, '/');

  // Remove consecutive slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Remove leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  // Trim each segment
  const segments = normalized.split('/');
  normalized = segments
    .map(segment => segment.trim())
    .filter(Boolean)
    .join('/');

  // Handle folder paths
  if (isFolder && normalized && !normalized.endsWith('/')) {
    normalized += '/';
  } else if (!isFolder && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Checks if a source path can be moved/renamed to a destination path
 */
export function canMoveOrRename(
  sourcePath: string,
  destPath: string,
  isFolder: boolean = false
): { canMove: boolean; reason?: string } {
  // Normalize paths for comparison
  const normalizedSource = normalizePath(sourcePath, isFolder);
  const normalizedDest = normalizePath(destPath, isFolder);

  // Can't move to the same location
  if (normalizedSource === normalizedDest) {
    return { canMove: false, reason: 'Source and destination are the same' };
  }

  // Can't move a folder into itself
  if (isFolder) {
    const sourceFolderPath = normalizedSource.endsWith('/') 
      ? normalizedSource 
      : normalizedSource + '/';
    
    if (normalizedDest.startsWith(sourceFolderPath)) {
      return { canMove: false, reason: 'Cannot move a folder into itself' };
    }
  }

  // Validate destination path
  const destValidation = validatePath(destPath, { isFolder });
  if (!destValidation.isValid) {
    return { canMove: false, reason: destValidation.errors[0] };
  }

  return { canMove: true };
}

/**
 * Sanitizes a filename or folder name for safe use
 */
export function sanitizeName(name: string): string {
  if (!name) return '';

  // Remove control characters and problematic characters
  let sanitized = name
    .replace(INVALID_CHARS_REGEX, '')
    .replace(PROBLEMATIC_CHARS_REGEX, '_');

  // Replace multiple underscores with single
  sanitized = sanitized.replace(/_+/g, '_');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove trailing dots and spaces (Windows compatibility)
  sanitized = sanitized.replace(/[\s.]+$/, '');

  // Ensure it's not empty after sanitization
  if (!sanitized) {
    sanitized = 'unnamed';
  }

  // Truncate if too long
  if (sanitized.length > MAX_SEGMENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SEGMENT_LENGTH);
  }

  return sanitized;
}

/**
 * Gets a unique path by appending a number if the path already exists
 */
export function getUniquePath(
  basePath: string,
  existingPaths: Set<string>
): string {
  const isFolder = basePath.endsWith('/');
  let uniquePath = normalizePath(basePath, isFolder);
  
  if (!existingPaths.has(uniquePath)) {
    return uniquePath;
  }

  // Extract base name and extension
  const segments = uniquePath.split('/');
  let lastSegment = segments[segments.length - 1];
  
  if (isFolder && lastSegment.endsWith('/')) {
    lastSegment = lastSegment.slice(0, -1);
  }

  const dotIndex = lastSegment.lastIndexOf('.');
  const baseName = dotIndex > 0 ? lastSegment.substring(0, dotIndex) : lastSegment;
  const extension = dotIndex > 0 ? lastSegment.substring(dotIndex) : '';

  // Try appending numbers
  let counter = 1;
  while (counter < 1000) {
    const newName = `${baseName} (${counter})${extension}`;
    segments[segments.length - 1] = newName;
    uniquePath = segments.join('/');
    
    if (isFolder) {
      uniquePath = uniquePath + '/';
    }

    if (!existingPaths.has(uniquePath)) {
      return uniquePath;
    }
    
    counter++;
  }

  // If we couldn't find a unique name after 1000 tries, use timestamp
  const timestamp = Date.now();
  const newName = `${baseName}_${timestamp}${extension}`;
  segments[segments.length - 1] = newName;
  uniquePath = segments.join('/');
  
  if (isFolder) {
    uniquePath = uniquePath + '/';
  }

  return uniquePath;
}