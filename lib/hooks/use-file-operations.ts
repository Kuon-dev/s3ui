import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { R2Service, R2ServiceError } from '@/lib/services/r2-service';
import { useFileSystemStore } from '@/lib/stores/file-system-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSelectionStore } from '@/lib/stores/selection-store';
import { useClipboardStore } from '@/lib/stores/clipboard-store';
import { useDragDropStore } from '@/lib/stores/drag-drop-store';
import { useUIStateStore } from '@/lib/stores/ui-state-store';
import { r2QueryKeys } from './use-r2-queries';

/**
 * Composite hook for file operations
 * Combines stores with React Query mutations
 */
export function useFileOperations() {
  const queryClient = useQueryClient();
  
  // Store actions
  const { 
    addFolderToTree, 
    removeFolderFromTree,
    removeObject,
    invalidatePath 
  } = useFileSystemStore();
  
  const { currentPath } = useNavigationStore();
  
  const { 
    getSelectedArray, 
    clearSelection 
  } = useSelectionStore();
  
  const {
    items: clipboardItems,
    operation: clipboardOperation,
    clear: clearClipboard
  } = useClipboardStore();
  
  const {
    draggingItem,
    endDrag
  } = useDragDropStore();
  
  const {
    setShowDeleteDialog,
    setShowRenameDialog,
    setLoading
  } = useUIStateStore();
  
  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      setLoading('createFolder', true);
      await R2Service.createFolder(currentPath, name);
    },
    onSuccess: (_, { name }) => {
      addFolderToTree(currentPath, name);
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(currentPath) });
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.folderTree(currentPath) });
      toast.success(`Folder "${name}" created successfully`);
    },
    onError: (error: R2ServiceError) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading('createFolder', false);
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ keys }: { keys: string[] }) => {
      setLoading('delete', true);
      const result = await R2Service.deleteMultiple(keys);
      
      if (result.failed.length > 0) {
        const errors = result.failed.map(f => `${f.key}: ${f.error}`).join('\n');
        throw new R2ServiceError(`Failed to delete some items:\n${errors}`);
      }
      
      return result;
    },
    onSuccess: (result) => {
      // Remove from store
      result.successful.forEach(key => {
        removeObject(key, currentPath);
        if (key.endsWith('/')) {
          removeFolderFromTree(key.slice(0, -1));
        }
      });
      
      // Clear selection
      clearSelection();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(currentPath) });
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.folderTree('') });
      
      const count = result.successful.length;
      toast.success(`Deleted ${count} item${count !== 1 ? 's' : ''}`);
    },
    onError: (error: R2ServiceError) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading('delete', false);
      setShowDeleteDialog(false);
    }
  });
  
  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ 
      oldKey, 
      newName, 
      isFolder 
    }: { 
      oldKey: string; 
      newName: string; 
      isFolder: boolean;
    }) => {
      setLoading('rename', true);
      
      const parentPath = currentPath || '';
      const newKey = parentPath ? `${parentPath}/${newName}` : newName;
      
      await R2Service.renameObject(oldKey, newKey, isFolder);
      
      return { oldKey, newKey, newName, isFolder };
    },
    onSuccess: ({ newName, isFolder }) => {
      // Update folder tree if it's a folder
      if (isFolder) {
        // This would need more complex logic to update nested paths
        queryClient.invalidateQueries({ queryKey: r2QueryKeys.folderTree('') });
      }
      
      // Invalidate object queries
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(currentPath) });
      
      toast.success(`Renamed to "${newName}"`);
    },
    onError: (error: R2ServiceError) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading('rename', false);
      setShowRenameDialog(false);
    }
  });
  
  // Copy mutation
  const copyMutation = useMutation({
    mutationFn: async ({ 
      sourceKeys, 
      targetPath 
    }: { 
      sourceKeys: string[]; 
      targetPath: string;
    }) => {
      setLoading('copy', true);
      
      const results = await R2Service.batchOperation(
        sourceKeys,
        async (sourceKey) => {
          const fileName = sourceKey.split('/').pop() || '';
          const targetKey = targetPath ? `${targetPath}/${fileName}` : fileName;
          await R2Service.copyObject(sourceKey, targetKey);
          return targetKey;
        },
        () => {
          // Could update progress here
        }
      );
      
      if (results.failed.length > 0) {
        throw new R2ServiceError(
          `Failed to copy ${results.failed.length} items`
        );
      }
      
      return results;
    },
    onSuccess: (results, { targetPath }) => {
      // Invalidate target path
      invalidatePath(targetPath);
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(targetPath) });
      
      const count = results.successful.length;
      toast.success(`Copied ${count} item${count !== 1 ? 's' : ''}`);
    },
    onError: (error: R2ServiceError) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading('copy', false);
    }
  });
  
  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ 
      sourceKeys, 
      targetPath 
    }: { 
      sourceKeys: string[]; 
      targetPath: string;
    }) => {
      setLoading('move', true);
      
      const results = await R2Service.batchOperation(
        sourceKeys,
        async (sourceKey) => {
          const fileName = sourceKey.split('/').pop() || '';
          const isFolder = sourceKey.endsWith('/');
          await R2Service.moveObject(sourceKey, targetPath, fileName, isFolder);
          return { sourceKey, fileName };
        }
      );
      
      if (results.failed.length > 0) {
        throw new R2ServiceError(
          `Failed to move ${results.failed.length} items`
        );
      }
      
      return results;
    },
    onSuccess: (results, { targetPath }) => {
      // Clear selection
      clearSelection();
      
      // Invalidate both source and target paths
      invalidatePath(currentPath);
      invalidatePath(targetPath);
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(currentPath) });
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(targetPath) });
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.folderTree('') });
      
      const count = results.successful.length;
      toast.success(`Moved ${count} item${count !== 1 ? 's' : ''}`);
    },
    onError: (error: R2ServiceError) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading('move', false);
    }
  });
  
  // Paste operation
  const paste = async (targetPath: string) => {
    if (!clipboardItems.length || !clipboardOperation) {
      toast.error('Nothing to paste');
      return;
    }
    
    const sourceKeys = clipboardItems.map(item => item.key);
    
    if (clipboardOperation === 'copy') {
      await copyMutation.mutateAsync({ sourceKeys, targetPath });
    } else {
      await moveMutation.mutateAsync({ sourceKeys, targetPath });
      clearClipboard(); // Clear clipboard after cut operation
    }
  };
  
  // Handle drop operation
  const handleDrop = async (targetPath: string) => {
    if (!draggingItem) return;
    
    const sourceKeys = draggingItem.selectedKeys || [draggingItem.key];
    
    try {
      await moveMutation.mutateAsync({ sourceKeys, targetPath });
    } finally {
      endDrag();
    }
  };
  
  // Delete selected items
  const deleteSelected = () => {
    const selectedKeys = getSelectedArray();
    if (selectedKeys.length === 0) return;
    
    deleteMutation.mutate({ keys: selectedKeys });
  };
  
  // Download file
  const downloadFile = async (key: string, fileName: string) => {
    try {
      setLoading('download', true);
      await R2Service.downloadFile(key, fileName);
      toast.success(`Downloaded "${fileName}"`);
    } catch (error) {
      const message = error instanceof R2ServiceError ? error.message : 'Download failed';
      toast.error(message);
    } finally {
      setLoading('download', false);
    }
  };
  
  return {
    // Mutations
    createFolder: createFolderMutation.mutate,
    deleteSelected,
    deleteItems: deleteMutation.mutate,
    rename: renameMutation.mutate,
    copy: copyMutation.mutate,
    move: moveMutation.mutate,
    paste,
    handleDrop,
    downloadFile,
    
    // Loading states
    isCreatingFolder: createFolderMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRenaming: renameMutation.isPending,
    isCopying: copyMutation.isPending,
    isMoving: moveMutation.isPending
  };
}