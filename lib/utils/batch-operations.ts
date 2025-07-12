import { toast } from 'sonner';
import { fileOperationQueue } from './operation-queue';

interface BatchOperation<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
  description: string;
}

interface BatchOperationResult {
  success: boolean;
  successfulOperations: string[];
  failedOperations: Array<{ id: string; error: Error }>;
  rolledBack: boolean;
}

export class BatchOperationManager {
  private operations: BatchOperation[] = [];
  private completed: Set<string> = new Set();
  private results: Map<string, unknown> = new Map();
  private progressCallback?: (current: number, total: number) => void;

  add(operation: Omit<BatchOperation, 'id'>): string {
    const id = `batch-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.operations.push({ ...operation, id });
    return id;
  }

  addMany(operations: Array<Omit<BatchOperation, 'id'>>): string[] {
    return operations.map(op => this.add(op));
  }

  setProgressCallback(callback: (current: number, total: number) => void): void {
    this.progressCallback = callback;
  }

  async executeAll(options: {
    stopOnError?: boolean;
    rollbackOnError?: boolean;
    showProgress?: boolean;
  } = {}): Promise<BatchOperationResult> {
    const { 
      stopOnError = true, 
      rollbackOnError = true,
      showProgress = true 
    } = options;

    const result: BatchOperationResult = {
      success: true,
      successfulOperations: [],
      failedOperations: [],
      rolledBack: false
    };

    let progressToast: string | number | undefined;
    if (showProgress && this.operations.length > 1) {
      progressToast = toast.loading(`Executing ${this.operations.length} operations...`);
    }

    try {
      // Execute operations sequentially
      for (let i = 0; i < this.operations.length; i++) {
        const operation = this.operations[i];
        
        if (showProgress && progressToast) {
          toast.loading(`Operation ${i + 1}/${this.operations.length}: ${operation.description}`, {
            id: progressToast
          });
        }

        try {
          const operationResult = await operation.execute();
          this.completed.add(operation.id);
          this.results.set(operation.id, operationResult);
          result.successfulOperations.push(operation.id);
          
          // Call progress callback if set
          if (this.progressCallback) {
            this.progressCallback(i + 1, this.operations.length);
          }
        } catch (error) {
          result.success = false;
          result.failedOperations.push({
            id: operation.id,
            error: error as Error
          });

          if (stopOnError) {
            if (rollbackOnError) {
              await this.rollback(showProgress, progressToast);
              result.rolledBack = true;
            }
            break;
          }
        }
      }

      // Dismiss progress toast
      if (progressToast) {
        toast.dismiss(progressToast);
      }

      // Show final result
      if (result.success) {
        toast.success(`Successfully completed ${result.successfulOperations.length} operations`);
      } else if (result.rolledBack) {
        toast.error('Operations failed and were rolled back');
      } else {
        toast.warning(`Completed ${result.successfulOperations.length} of ${this.operations.length} operations`);
      }

    } catch (error) {
      if (progressToast) {
        toast.dismiss(progressToast);
      }
      toast.error('Batch operation failed');
      throw error;
    }

    return result;
  }

  private async rollback(showProgress: boolean, progressToast?: string | number): Promise<void> {
    const rollbackOperations = Array.from(this.completed).reverse();
    
    if (rollbackOperations.length === 0) return;

    if (showProgress) {
      if (progressToast) {
        toast.loading('Rolling back operations...', { id: progressToast });
      } else {
        progressToast = toast.loading('Rolling back operations...');
      }
    }

    for (const opId of rollbackOperations) {
      const operation = this.operations.find(op => op.id === opId);
      if (operation?.rollback) {
        try {
          await operation.rollback();
          this.completed.delete(opId);
        } catch (error) {
          console.error(`Failed to rollback operation ${opId}:`, error);
          // Continue with other rollbacks even if one fails
        }
      }
    }

    if (progressToast) {
      toast.dismiss(progressToast);
    }
  }

  getResult(operationId: string): unknown {
    return this.results.get(operationId);
  }

  clear(): void {
    this.operations = [];
    this.completed.clear();
    this.results.clear();
  }
}

// Helper functions for common batch operations

export async function batchDelete(
  keys: string[],
  deleteFunction: (key: string) => Promise<void>,
  onProgress?: (current: number, total: number) => void
): Promise<BatchOperationResult> {
  const batch = new BatchOperationManager();

  keys.forEach(key => {
    batch.add({
      execute: () => deleteFunction(key),
      description: `Deleting ${key}`,
      // No rollback for deletions
    });
  });

  // Set progress callback if provided
  if (onProgress) {
    batch.setProgressCallback(onProgress);
  }

  return batch.executeAll({
    stopOnError: false, // Continue deleting even if some fail
    rollbackOnError: false,
    showProgress: keys.length > 3
  });
}

export async function batchMove(
  moves: Array<{ source: string; destination: string }>,
  moveFunction: (source: string, destination: string) => Promise<void>
): Promise<BatchOperationResult> {
  const batch = new BatchOperationManager();

  moves.forEach(({ source, destination }) => {
    batch.add({
      execute: () => moveFunction(source, destination),
      rollback: () => moveFunction(destination, source), // Move back on rollback
      description: `Moving ${source} to ${destination}`
    });
  });

  return batch.executeAll({
    stopOnError: true,
    rollbackOnError: true,
    showProgress: moves.length > 1
  });
}

export async function batchCopy(
  copies: Array<{ source: string; destination: string }>,
  copyFunction: (source: string, destination: string) => Promise<void>,
  deleteFunction: (key: string) => Promise<void>
): Promise<BatchOperationResult> {
  const batch = new BatchOperationManager();

  copies.forEach(({ source, destination }) => {
    batch.add({
      execute: () => copyFunction(source, destination),
      rollback: () => deleteFunction(destination), // Delete copy on rollback
      description: `Copying ${source} to ${destination}`
    });
  });

  return batch.executeAll({
    stopOnError: true,
    rollbackOnError: true,
    showProgress: copies.length > 1
  });
}

// Integration with file operation queue for atomic operations
export async function executeAtomicBatch(
  operations: Array<{
    type: 'rename' | 'move' | 'delete' | 'create' | 'copy';
    execute: () => Promise<void>;
    description: string;
  }>
): Promise<void> {
  // Queue all operations as a single atomic batch
  const batch = new BatchOperationManager();

  operations.forEach(op => {
    batch.add({
      execute: op.execute,
      description: op.description
    });
  });

  // Execute through the operation queue to ensure serialization
  await fileOperationQueue.enqueue({
    type: 'move', // Use move as a general batch type
    description: `Batch operation (${operations.length} items)`,
    execute: async () => {
      const result = await batch.executeAll({
        stopOnError: true,
        rollbackOnError: true,
        showProgress: true
      });

      if (!result.success && !result.rolledBack) {
        throw new Error(`Batch operation partially failed: ${result.failedOperations.length} operations failed`);
      }
    }
  });
}