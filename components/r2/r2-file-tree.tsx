'use client';

import React, { useEffect } from 'react';
import { ChevronDown, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import { uploadManager } from '@/lib/service-worker/upload-manager';
import { FolderTreeNode } from '@/lib/r2/operations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { useFileBrowserStore, useIsLoading } from '@/lib/stores/file-browser-store';

interface R2FileTreeProps {
  currentPath: string;
  onNavigate?: (path: string) => void;  // Made optional for backward compatibility
  className?: string;
}

interface TreeNodeProps {
  node: FolderTreeNode;
  level?: number;
}

function TreeNode({ node, level = 0 }: TreeNodeProps) {
  const {
    currentPath,
    toggleFolder,
    loadFolderChildren,
    navigateToFolder,
    isPathExpanded,
    dropTargetPath,
    setDropTarget,
    loadFolderTree,
    refreshCurrentFolder,
  } = useFileBrowserStore();
  
  const isExpanded = isPathExpanded(node.path);
  const isSelected = currentPath === node.path;
  const loading = useIsLoading(`tree-${node.path}/`);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only folders can be toggled
    if (!node.isFolder) return;
    
    if (!isExpanded) {
      await loadFolderChildren(node.path);
    }
    
    toggleFolder(node.path);
  };

  const handleClick = async () => {
    if (node.isFolder) {
      // Navigate to the folder - this will also load children and expand it
      await navigateToFolder(node.path);
    }
    // For files, we could add file preview/download functionality here in the future
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    // Handle file uploads to this folder
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const folderPath = node.path;
      for (const file of Array.from(files)) {
        try {
          await uploadManager.uploadFile(file, folderPath, (progress) => {
            toast.info(`Uploading ${file.name}: ${progress.progress}%`);
          });
          toast.success(`${file.name} uploaded successfully`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      // Reload the tree to show new files
      await loadFolderTree(node.path ? `${node.path}/` : '');
      return;
    }
    
    // Handle drag and drop move/copy
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const draggedItem = JSON.parse(data);
        
        // Prevent dropping on same folder or into itself
        if (draggedItem.key === node.path || draggedItem.key === `${node.path}/`) return;
        if (draggedItem.isFolder && node.path.startsWith(draggedItem.key)) {
          toast.error('Cannot move a folder into itself');
          return;
        }
        
        const operation = e.ctrlKey ? 'copy' : 'move';
        const destinationPath = node.path ? `${node.path}/${draggedItem.name}` : draggedItem.name;
        
        // Perform the operation
        toast.loading(`${operation === 'copy' ? 'Copying' : 'Moving'} "${draggedItem.name}"...`);
        
        try {
          const response = await fetch(`/api/r2/${operation === 'copy' ? 'copy' : 'rename'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldKey: draggedItem.key,
              newKey: destinationPath
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to ${operation}`);
          }
          
          toast.success(`Successfully ${operation === 'copy' ? 'copied' : 'moved'} "${draggedItem.name}"`);
          
          // Reload the tree
          await loadFolderTree('');
          if (node.path) {
            await loadFolderTree(`${node.path}/`);
          }
          await refreshCurrentFolder();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Failed to ${operation} file`);
        }
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center space-x-1 py-1 px-2 rounded transition-colors ${
          node.isFolder ? 'cursor-pointer hover:bg-muted' : 'cursor-default hover:bg-muted/50'
        } ${
          isSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
        } ${
          dropTargetPath === node.path && node.isFolder ? 'bg-primary/20 border-2 border-primary border-dashed' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={async (e) => {
          // Don't handle clicks on the chevron button
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          
          // Always handle the click (navigation + auto-expand for folders)
          await handleClick();
        }}
        {...(node.isFolder ? {
          onDragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only allow file drops from outside for now
            if (e.dataTransfer.types.includes('Files')) {
              e.dataTransfer.dropEffect = 'copy';
            }
          },
          onDragEnter: (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(node.path);
          },
          onDragLeave: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.currentTarget === e.target) {
              setDropTarget(null);
            }
          },
          onDrop: handleDrop
        } : {})}
      >
        {node.isFolder ? (
          <button
            onClick={handleToggle}
            className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-5" /> // Spacer for files
        )}
        
        <div className="flex-shrink-0">
          {(() => {
            const IconComponent = getFileIcon(node.name, node.isFolder, isExpanded);
            const fileType = getFileType(node.name);
            const colorClass = node.isFolder ? 'text-primary' : fileType.iconColor;
            
            return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
          })()}
        </div>
        
        <span 
          className="text-sm truncate flex-1 select-none" 
          title={node.name}
        >
          {node.name}
        </span>
      </div>

      {node.isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function R2FileTree({ currentPath, onNavigate: _onNavigate, className = '' }: R2FileTreeProps) {
  const { 
    folderTree,
    loadFolderTree,
    dropTargetPath,
    setDropTarget,
    refreshCurrentFolder,
  } = useFileBrowserStore();
  
  const loading = useIsLoading('tree-');

  useEffect(() => {
    const loadInitialTree = async () => {
      await loadFolderTree('');
    };
    
    loadInitialTree();
  }, [loadFolderTree]);

  const handleRootClick = async () => {
    const { navigateToFolder } = useFileBrowserStore.getState();
    await navigateToFolder('');
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    // Handle file uploads to root
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (const file of Array.from(files)) {
        try {
          await uploadManager.uploadFile(file, '', (progress) => {
            toast.info(`Uploading ${file.name}: ${progress.progress}%`);
          });
          toast.success(`${file.name} uploaded successfully`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      // Reload the tree to show new files
      await loadFolderTree('');
      return;
    }
    
    // Handle drag and drop move/copy
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const draggedItem = JSON.parse(data);
        
        // Prevent dropping on same folder or into itself
        if (draggedItem.key === '' || draggedItem.key === '/') return;
        if (draggedItem.isFolder) {
          toast.error('Cannot move a folder to the same location');
          return;
        }
        
        const operation = e.ctrlKey ? 'copy' : 'move';
        const destinationPath = draggedItem.name;
        
        // Perform the operation
        toast.loading(`${operation === 'copy' ? 'Copying' : 'Moving'} "${draggedItem.name}"...`);
        
        try {
          const response = await fetch(`/api/r2/${operation === 'copy' ? 'copy' : 'rename'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldKey: draggedItem.key,
              newKey: destinationPath
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to ${operation}`);
          }
          
          toast.success(`Successfully ${operation === 'copy' ? 'copied' : 'moved'} "${draggedItem.name}"`);
          
          // Reload the tree
          await loadFolderTree('');
          await refreshCurrentFolder();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Failed to ${operation} file`);
        }
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <div className={`bg-background border-r border-border h-full overflow-hidden ${className}`}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
        
        {/* Root folder */}
        <Button
          variant="ghost"
          className={`w-full justify-start p-2 h-auto ${
            currentPath === '' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
          } ${dropTargetPath === '' ? 'bg-primary/20 border-2 border-primary border-dashed' : ''}`}
          onClick={handleRootClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget('');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.currentTarget === e.target) {
              setDropTarget(null);
            }
          }}
          onDrop={handleRootDrop}
        >
          <Home className="h-4 w-4 mr-2 text-primary" />
          <span className="text-sm">Root</span>
        </Button>
      </div>

      <ScrollArea className="h-full">
        <div className="p-2">
          {loading ? (
            <div className="text-muted-foreground text-sm p-2">Loading folders...</div>
          ) : folderTree.length === 0 ? (
            <div className="text-muted-foreground text-sm p-2">No folders found</div>
          ) : (
            folderTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}