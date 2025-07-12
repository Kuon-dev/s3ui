import { toast } from 'sonner';

interface QueuedOperation {
  id: string;
  type: 'rename' | 'move' | 'delete' | 'create' | 'copy';
  execute: () => Promise<void>;
  onError?: (error: Error) => void;
  description: string;
}

class FileOperationQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;
  private activeOperations = new Map<string, QueuedOperation>();
  private operationCounter = 0;

  async enqueue(operation: Omit<QueuedOperation, 'id'>): Promise<void> {
    const id = `op-${++this.operationCounter}`;
    const queuedOp: QueuedOperation = { ...operation, id };
    
    this.queue.push(queuedOp);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      this.activeOperations.set(operation.id, operation);

      try {
        await operation.execute();
      } catch (error) {
        console.error(`Operation failed: ${operation.description}`, error);
        
        if (operation.onError) {
          operation.onError(error as Error);
        } else {
          toast.error(`Failed: ${operation.description}`);
        }
      } finally {
        this.activeOperations.delete(operation.id);
      }
    }

    this.processing = false;
  }

  isProcessing(): boolean {
    return this.processing || this.activeOperations.size > 0;
  }

  getActiveOperations(): QueuedOperation[] {
    return Array.from(this.activeOperations.values());
  }

  clear(): void {
    this.queue = [];
  }
}

// Singleton instance
export const fileOperationQueue = new FileOperationQueue();

// Helper to check if an operation would conflict
export function hasConflictingOperation(
  path: string,
  type: QueuedOperation['type']
): boolean {
  const activeOps = fileOperationQueue.getActiveOperations();
  
  return activeOps.some(op => {
    // Check if any active operation involves this path
    if (op.description.includes(path)) {
      // Same type operations always conflict
      if (op.type === type) return true;
      
      // Rename/move operations conflict with all other operations on the same path
      if (op.type === 'rename' || op.type === 'move' || type === 'rename' || type === 'move') {
        return true;
      }
    }
    
    return false;
  });
}

// Helper to wait for all operations to complete
export async function waitForOperations(): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (!fileOperationQueue.isProcessing()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}