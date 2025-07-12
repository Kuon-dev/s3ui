import { toast } from 'sonner';
import { fileOperationQueue } from './operation-queue';
import { validatePath, normalizePath } from './path-validation';

interface DragDropState {
  isDragging: boolean;
  isProcessing: boolean;
  draggedItems: Set<string>;
  pendingDrops: Map<string, Promise<void>>;
}

class DragDropGuard {
  private state: DragDropState = {
    isDragging: false,
    isProcessing: false,
    draggedItems: new Set(),
    pendingDrops: new Map()
  };

  /**
   * Check if drag operation can start
   */
  canStartDrag(items: string[]): { canDrag: boolean; reason?: string } {
    // Prevent drag during file operations
    if (fileOperationQueue.isProcessing()) {
      return { canDrag: false, reason: 'File operations in progress' };
    }

    // Prevent drag if already dragging
    if (this.state.isDragging) {
      return { canDrag: false, reason: 'Already dragging items' };
    }

    // Prevent drag if processing a drop
    if (this.state.isProcessing) {
      return { canDrag: false, reason: 'Processing previous drop' };
    }

    // Validate all items
    for (const item of items) {
      const validation = validatePath(item, { allowEmpty: false });
      if (!validation.isValid) {
        return { canDrag: false, reason: `Invalid path: ${validation.errors[0]}` };
      }
    }

    return { canDrag: true };
  }

  /**
   * Start drag operation
   */
  startDrag(items: string[]): boolean {
    const check = this.canStartDrag(items);
    if (!check.canDrag) {
      if (check.reason) {
        toast.warning(check.reason);
      }
      return false;
    }

    this.state.isDragging = true;
    this.state.draggedItems = new Set(items);
    return true;
  }

  /**
   * End drag operation
   */
  endDrag(): void {
    this.state.isDragging = false;
    this.state.draggedItems.clear();
  }

  /**
   * Check if drop is valid
   */
  canDrop(targetPath: string, draggedItems: string[]): { canDrop: boolean; reason?: string } {
    // Prevent drop during processing
    if (this.state.isProcessing) {
      return { canDrop: false, reason: 'Processing another drop operation' };
    }

    // Validate target path
    const targetValidation = validatePath(targetPath, { isFolder: true, allowEmpty: true });
    if (!targetValidation.isValid) {
      return { canDrop: false, reason: `Invalid target: ${targetValidation.errors[0]}` };
    }

    const normalizedTarget = normalizePath(targetPath, true);

    // Check each dragged item
    for (const item of draggedItems) {
      const normalizedItem = normalizePath(item, item.endsWith('/'));
      
      // Can't drop item into itself
      if (normalizedItem === normalizedTarget) {
        return { canDrop: false, reason: "Can't drop item into itself" };
      }

      // Can't drop folder into its own child
      if (item.endsWith('/') && normalizedTarget.startsWith(normalizedItem)) {
        return { canDrop: false, reason: "Can't drop folder into its own subfolder" };
      }

      // Check if already processing this drop
      const dropKey = `${normalizedItem}->${normalizedTarget}`;
      if (this.state.pendingDrops.has(dropKey)) {
        return { canDrop: false, reason: 'This move is already in progress' };
      }
    }

    return { canDrop: true };
  }

  /**
   * Handle drop with guards
   */
  async handleDrop(
    targetPath: string,
    draggedItems: string[],
    moveFunction: (source: string, destination: string) => Promise<void>
  ): Promise<boolean> {
    const check = this.canDrop(targetPath, draggedItems);
    if (!check.canDrop) {
      if (check.reason) {
        toast.error(check.reason);
      }
      return false;
    }

    this.state.isProcessing = true;
    const normalizedTarget = normalizePath(targetPath, true);
    const dropPromises: Array<{ key: string; promise: Promise<void> }> = [];

    try {
      // Create move promises for each item
      for (const item of draggedItems) {
        const normalizedItem = normalizePath(item, item.endsWith('/'));
        const itemName = normalizedItem.split('/').pop() || normalizedItem;
        const destination = normalizedTarget + itemName;
        
        // Skip if source and destination are the same
        if (normalizedItem === destination) {
          continue;
        }

        const dropKey = `${normalizedItem}->${normalizedTarget}`;
        const movePromise = moveFunction(item, destination);
        
        this.state.pendingDrops.set(dropKey, movePromise);
        dropPromises.push({ key: dropKey, promise: movePromise });
      }

      if (dropPromises.length === 0) {
        toast.info('No items to move');
        return false;
      }

      // Wait for all moves to complete
      const results = await Promise.allSettled(dropPromises.map(d => d.promise));
      
      // Clean up pending drops
      for (const { key } of dropPromises) {
        this.state.pendingDrops.delete(key);
      }

      // Check results
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        toast.error(`Failed to move ${failures.length} item(s)`);
        return false;
      }

      return true;
    } finally {
      this.state.isProcessing = false;
      this.endDrag();
    }
  }

  /**
   * Get current drag state
   */
  getState(): Readonly<DragDropState> {
    return { ...this.state };
  }

  /**
   * Reset all state (use with caution)
   */
  reset(): void {
    this.state = {
      isDragging: false,
      isProcessing: false,
      draggedItems: new Set(),
      pendingDrops: new Map()
    };
  }
}

// Singleton instance
export const dragDropGuard = new DragDropGuard();

// Utility functions for common patterns

/**
 * Create a drop zone validator
 */
export function createDropZoneValidator(
  validExtensions?: string[],
  maxFileSize?: number
): (files: File[]) => { valid: boolean; errors: string[] } {
  return (files: File[]) => {
    const errors: string[] = [];

    for (const file of files) {
      // Check file size
      if (maxFileSize && file.size > maxFileSize) {
        errors.push(`${file.name} exceeds maximum size of ${maxFileSize} bytes`);
      }

      // Check extension
      if (validExtensions && validExtensions.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
          errors.push(`${file.name} has invalid extension`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };
}

/**
 * Debounce drag over events to prevent performance issues
 */
export function createDragOverDebouncer(delay: number = 100): {
  handleDragOver: (callback: () => void) => void;
  cancel: () => void;
} {
  let timeout: NodeJS.Timeout | null = null;

  return {
    handleDragOver: (callback: () => void) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(callback, delay);
    },
    cancel: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    }
  };
}

/**
 * Check if drag event contains files
 */
export function dragEventHasFiles(event: DragEvent): boolean {
  if (!event.dataTransfer) return false;
  
  // Check if types include files
  if (event.dataTransfer.types.includes('Files')) {
    return true;
  }
  
  // Check items if available
  if (event.dataTransfer.items) {
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      if (event.dataTransfer.items[i].kind === 'file') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract valid paths from drag event
 */
export function extractDraggedPaths(event: DragEvent): string[] {
  const paths: string[] = [];
  
  try {
    // Try to get custom data first (internal drag)
    const customData = event.dataTransfer?.getData('application/x-r2-items');
    if (customData) {
      const items = JSON.parse(customData);
      return Array.isArray(items) ? items : [];
    }
    
    // Fall back to text data
    const textData = event.dataTransfer?.getData('text/plain');
    if (textData) {
      // Split by newlines in case of multiple items
      return textData.split('\n').filter(Boolean);
    }
  } catch (error) {
    console.error('Failed to extract dragged paths:', error);
  }
  
  return paths;
}