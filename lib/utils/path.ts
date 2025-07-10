/**
 * Utility functions for handling R2 object paths
 */

/**
 * Ensures a folder path ends with a forward slash
 */
export function ensureFolderPath(path: string): string {
  if (!path) return '';
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Removes trailing slash from a path for display purposes
 */
export function stripTrailingSlash(path: string): string {
  if (!path || path === '/') return path;
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Joins path segments with proper slash handling
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((segment, index) => {
      // Remove leading slash from all segments except the first
      if (index > 0 && segment.startsWith('/')) {
        segment = segment.slice(1);
      }
      // Remove trailing slash from all segments except the last
      if (index < segments.length - 1 && segment.endsWith('/')) {
        segment = segment.slice(0, -1);
      }
      return segment;
    })
    .join('/');
}

/**
 * Gets the parent folder path from a given path
 */
export function getParentPath(path: string): string {
  if (!path) return '';
  const normalized = stripTrailingSlash(path);
  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex === -1) return '';
  return normalized.slice(0, lastSlashIndex);
}

/**
 * Gets the filename or folder name from a path
 */
export function getPathName(path: string): string {
  if (!path) return '';
  const normalized = stripTrailingSlash(path);
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex === -1 ? normalized : normalized.slice(lastSlashIndex + 1);
}

/**
 * Checks if a path is a folder path (ends with /)
 */
export function isFolderPath(path: string): boolean {
  return path.endsWith('/');
}

/**
 * Normalizes a path for API calls (adds trailing slash for folders)
 */
export function normalizeApiPath(path: string, isFolder: boolean): string {
  if (!path) return '';
  return isFolder ? ensureFolderPath(path) : path;
}