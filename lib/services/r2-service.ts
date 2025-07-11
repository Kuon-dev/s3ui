import { R2Object, FolderTreeNode } from '@/lib/r2/operations';
import { ensureFolderPath } from '@/lib/utils/path';

/**
 * Custom error class for R2 operations
 */
export class R2ServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'R2ServiceError';
  }
}

/**
 * Service layer for all R2 operations
 * Centralizes API calls with consistent error handling
 */
export class R2Service {
  private static baseUrl = '/api/r2';

  /**
   * Generic fetch wrapper with error handling
   */
  private static async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new R2ServiceError(
          errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof R2ServiceError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new R2ServiceError('Network error: Unable to connect to server');
      }
      
      throw new R2ServiceError('An unexpected error occurred', undefined, error);
    }
  }

  /**
   * List objects in a given path
   */
  static async listObjects(prefix: string = ''): Promise<R2Object[]> {
    const apiPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
    const url = `${this.baseUrl}/list?prefix=${encodeURIComponent(apiPrefix)}`;
    
    const data = await this.fetchWithErrorHandling<{ objects: R2Object[] }>(url);
    return data.objects;
  }

  /**
   * Get folder tree structure
   */
  static async getFolderTree(prefix: string = ''): Promise<FolderTreeNode[]> {
    const url = `${this.baseUrl}/folder-tree?prefix=${encodeURIComponent(prefix)}`;
    
    const data = await this.fetchWithErrorHandling<{ folders: FolderTreeNode[] }>(url);
    return data.folders;
  }

  /**
   * Create a new folder
   */
  static async createFolder(currentPath: string, folderName: string): Promise<void> {
    const url = `${this.baseUrl}/create-folder`;
    
    await this.fetchWithErrorHandling(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentPath,
        name: folderName
      })
    });
  }

  /**
   * Delete an object (file or folder)
   */
  static async deleteObject(key: string): Promise<void> {
    const url = `${this.baseUrl}/delete`;
    
    await this.fetchWithErrorHandling(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
  }

  /**
   * Delete multiple objects
   */
  static async deleteMultiple(keys: string[]): Promise<{ 
    successful: string[]; 
    failed: Array<{ key: string; error: string }> 
  }> {
    const results = await Promise.allSettled(
      keys.map(key => this.deleteObject(key))
    );

    const successful: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(keys[index]);
      } else {
        failed.push({
          key: keys[index],
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Rename an object (file or folder)
   */
  static async renameObject(
    oldKey: string, 
    newKey: string, 
    isFolder: boolean = false
  ): Promise<void> {
    const url = `${this.baseUrl}/rename`;
    
    const finalNewKey = isFolder ? ensureFolderPath(newKey) : newKey;
    
    await this.fetchWithErrorHandling(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldKey,
        newKey: finalNewKey
      })
    });
  }

  /**
   * Copy an object to a new location
   */
  static async copyObject(
    sourceKey: string,
    destinationKey: string
  ): Promise<void> {
    const url = `${this.baseUrl}/copy`;
    
    await this.fetchWithErrorHandling(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceKey,
        destinationKey
      })
    });
  }

  /**
   * Move an object to a new location
   */
  static async moveObject(
    sourceKey: string,
    destinationPath: string,
    objectName: string,
    isFolder: boolean = false
  ): Promise<void> {
    const destinationKey = destinationPath 
      ? `${destinationPath}/${objectName}` 
      : objectName;
      
    const finalDestinationKey = isFolder 
      ? ensureFolderPath(destinationKey) 
      : destinationKey;
    
    // Move is implemented as copy + delete
    await this.copyObject(sourceKey, finalDestinationKey);
    await this.deleteObject(sourceKey);
  }

  /**
   * Search for objects matching a query
   */
  static async searchObjects(query: string): Promise<R2Object[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
    
    const data = await this.fetchWithErrorHandling<{ results: R2Object[] }>(url);
    return data.results;
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    folderCount: number;
    fileCount: number;
  }> {
    const url = `${this.baseUrl}/stats`;
    
    return await this.fetchWithErrorHandling(url);
  }

  /**
   * Generate a preview URL for a file
   */
  static async getPreviewUrl(key: string): Promise<string> {
    const url = `${this.baseUrl}/preview?key=${encodeURIComponent(key)}`;
    
    const data = await this.fetchWithErrorHandling<{ url: string }>(url);
    return data.url;
  }

  /**
   * Download a file
   */
  static async downloadFile(key: string, fileName: string): Promise<void> {
    const url = `${this.baseUrl}/download?key=${encodeURIComponent(key)}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new R2ServiceError(`Download failed with status ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      if (error instanceof R2ServiceError) {
        throw error;
      }
      throw new R2ServiceError('Failed to download file', undefined, error);
    }
  }

  /**
   * Upload files (handled by service worker)
   * This method just validates and prepares the upload
   */
  static async prepareUpload(
    files: File[]
  ): Promise<{ valid: File[]; invalid: Array<{ file: File; reason: string }> }> {
    const valid: File[] = [];
    const invalid: Array<{ file: File; reason: string }> = [];
    
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        invalid.push({ 
          file, 
          reason: `File size exceeds 100MB limit` 
        });
      } else if (!file.name || file.name.includes('/')) {
        invalid.push({ 
          file, 
          reason: 'Invalid file name' 
        });
      } else {
        valid.push(file);
      }
    }
    
    return { valid, invalid };
  }

  /**
   * Batch operations wrapper with progress callback
   */
  static async batchOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ successful: R[]; failed: Array<{ item: T; error: unknown }> }> {
    const successful: R[] = [];
    const failed: Array<{ item: T; error: unknown }> = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await operation(items[i]);
        successful.push(result);
      } catch (error) {
        failed.push({ item: items[i], error });
      }
      
      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    }
    
    return { successful, failed };
  }
}