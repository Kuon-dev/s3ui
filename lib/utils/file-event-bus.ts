/**
 * Event bus for file system operations
 * Enables loose coupling between stores and components
 */

export type FileSystemEventType = 
  | 'file.created'
  | 'file.deleted'
  | 'file.renamed'
  | 'file.moved'
  | 'file.copied'
  | 'folder.created'
  | 'folder.deleted'
  | 'folder.renamed'
  | 'folder.moved'
  | 'folder.expanded'
  | 'folder.collapsed'
  | 'path.changed'
  | 'refresh.requested'
  | 'upload.completed'
  | 'upload.failed';

export interface FileSystemEvent {
  type: FileSystemEventType;
  payload: {
    path?: string;
    oldPath?: string;
    newPath?: string;
    paths?: string[];
    error?: Error;
    metadata?: Record<string, unknown>;
  };
  timestamp: number;
}

type EventListener = (event: FileSystemEvent) => void | Promise<void>;

class FileEventBus {
  private listeners = new Map<FileSystemEventType, Set<EventListener>>();
  private wildcardListeners = new Set<EventListener>();
  private eventHistory: FileSystemEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a specific event type
   */
  on(eventType: FileSystemEventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(listener: EventListener): () => void {
    this.wildcardListeners.add(listener);
    
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Unsubscribe from a specific event type
   */
  off(eventType: FileSystemEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit an event
   */
  async emit(eventType: FileSystemEventType, payload: FileSystemEvent['payload']): Promise<void> {
    const event: FileSystemEvent = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const promises: Promise<void>[] = [];
      
      for (const listener of listeners) {
        try {
          const result = listener(event);
          if (result instanceof Promise) {
            promises.push(result.catch(error => {
              console.error(`Event listener error for ${eventType}:`, error);
            }));
          }
        } catch (error) {
          console.error(`Event listener error for ${eventType}:`, error);
        }
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    // Notify wildcard listeners
    const wildcardPromises: Promise<void>[] = [];
    for (const listener of this.wildcardListeners) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          wildcardPromises.push(result.catch(error => {
            console.error(`Wildcard event listener error:`, error);
          }));
        }
      } catch (error) {
        console.error(`Wildcard event listener error:`, error);
      }
    }
    
    if (wildcardPromises.length > 0) {
      await Promise.all(wildcardPromises);
    }
  }

  /**
   * Get recent events
   */
  getHistory(count?: number): FileSystemEvent[] {
    const historyCount = count || this.eventHistory.length;
    return this.eventHistory.slice(-historyCount);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventType?: FileSystemEventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    
    let total = this.wildcardListeners.size;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    return total;
  }
}

// Singleton instance
export const fileEventBus = new FileEventBus();

// Helper functions for common operations

export async function emitFileCreated(path: string, metadata?: Record<string, unknown>): Promise<void> {
  await fileEventBus.emit('file.created', { path, metadata });
}

export async function emitFileDeleted(path: string): Promise<void> {
  await fileEventBus.emit('file.deleted', { path });
}

export async function emitFileRenamed(oldPath: string, newPath: string): Promise<void> {
  await fileEventBus.emit('file.renamed', { oldPath, newPath });
}

export async function emitFileMoved(oldPath: string, newPath: string): Promise<void> {
  await fileEventBus.emit('file.moved', { oldPath, newPath });
}

export async function emitFolderCreated(path: string): Promise<void> {
  await fileEventBus.emit('folder.created', { path });
}

export async function emitFolderDeleted(path: string): Promise<void> {
  await fileEventBus.emit('folder.deleted', { path });
}

export async function emitFolderRenamed(oldPath: string, newPath: string): Promise<void> {
  await fileEventBus.emit('folder.renamed', { oldPath, newPath });
}

export async function emitFolderMoved(oldPath: string, newPath: string): Promise<void> {
  await fileEventBus.emit('folder.moved', { oldPath, newPath });
}

export async function emitPathChanged(path: string): Promise<void> {
  await fileEventBus.emit('path.changed', { path });
}

export async function emitRefreshRequested(path?: string): Promise<void> {
  await fileEventBus.emit('refresh.requested', { path });
}

export async function emitUploadCompleted(paths: string[]): Promise<void> {
  await fileEventBus.emit('upload.completed', { paths });
}