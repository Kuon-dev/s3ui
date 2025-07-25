'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronRight, Folder, FolderOpen, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useClipboardStore } from '@/lib/stores/clipboard-store';
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';
import { DropZone } from './drop-zone';
import { R2Object } from '@/lib/r2/operations';
import { FileTreeContextMenu } from './file-tree-context-menu';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useCommonFileOperations } from '@/lib/hooks/use-common-file-operations';
import { toast } from 'sonner';
import { fileEventBus } from '@/lib/utils/file-event-bus';
import { useTypography } from '@/lib/hooks/use-typography';

interface R2FileTreeProps {
  currentPath: string;
  onNavigate: (path: string) => Promise<void>;
  className?: string;
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
  isFolder: boolean;
}

export function R2FileTree({ currentPath, onNavigate, className }: R2FileTreeProps) {
  const typography = useTypography();
  const { 
    folderTree,
    folderTreeVersion,
    loadFolderTree,
    isPathExpanded, 
    toggleFolder, 
    loadFolderChildren,
    setShowCreateFolderDialog
  } = useFileBrowserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);
  
  // Additional hooks for context menu
  const { expandAllFrom, collapseAllFrom } = useNavigationStore();
  const { 
    items: clipboardItems, 
    operation: clipboardOperation
  } = useClipboardStore();
  const { handleRename, handleDelete } = useCommonFileOperations();

  // Convert folderTree from store to our TreeNode format
  const treeData = useMemo(() => {
    const convertToTreeNode = (nodes: typeof folderTree): TreeNode[] => {
      return nodes.map(node => ({
        name: node.name,
        path: node.path,
        children: convertToTreeNode(node.children || []),
        isFolder: node.isFolder !== false // Default to true for folders
      }));
    };

    const root: TreeNode = { 
      name: 'Root', 
      path: '', 
      children: convertToTreeNode(folderTree), 
      isFolder: true 
    };

    return root;
  }, [folderTree]); // folderTreeVersion is only used to force re-render

  // Force re-render when folder tree version changes
  useEffect(() => {
    console.log('[R2FileTree] Folder tree version changed:', folderTreeVersion);
  }, [folderTreeVersion]);

  // Load folder tree on mount and subscribe to rename events
  useEffect(() => {
    loadFolderTree('');
    
    // Subscribe to folder rename events to refresh the tree
    const unsubscribeFolderRenamed = fileEventBus.on('folder.renamed', async () => {
      // Reload the entire folder tree to reflect the changes
      await loadFolderTree('');
    });
    
    const unsubscribeFolderCreated = fileEventBus.on('folder.created', async () => {
      // Reload the tree when a new folder is created
      await loadFolderTree('');
    });
    
    const unsubscribeFolderDeleted = fileEventBus.on('folder.deleted', async () => {
      // Reload the tree when a folder is deleted
      await loadFolderTree('');
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeFolderRenamed();
      unsubscribeFolderCreated();
      unsubscribeFolderDeleted();
    };
  }, [loadFolderTree]);

  const handleToggleFolder = useCallback(async (path: string) => {
    if (!isPathExpanded(path)) {
      // Load folder contents before expanding
      await loadFolderChildren(path);
    }
    toggleFolder(path);
  }, [isPathExpanded, loadFolderChildren, toggleFolder]);

  const handleFolderClick = useCallback(async (path: string) => {
    await onNavigate(path);
  }, [onNavigate]);
  
  // Context menu handlers
  const handleCreateFolder = useCallback((parentPath: string) => {
    onNavigate(parentPath); // Navigate to parent folder first
    setShowCreateFolderDialog(true);
  }, [onNavigate, setShowCreateFolderDialog]);
  
  const handleRenameNode = useCallback((node: TreeNode) => {
    const nodeObject = {
      key: node.path.endsWith('/') ? node.path : node.path + '/',
      name: node.name,
      isFolder: true
    };
    handleRename(nodeObject);
  }, [handleRename]);
  
  const handleDeleteNode = useCallback((node: TreeNode) => {
    const nodeObject = {
      key: node.path.endsWith('/') ? node.path : node.path + '/',
      name: node.name,
      isFolder: true
    };
    handleDelete(nodeObject);
  }, [handleDelete]);
  
  
  const handleRefresh = useCallback(async (path: string) => {
    await loadFolderChildren(path);
    await loadFolderTree(path);
    toast.success('Folder refreshed');
  }, [loadFolderChildren, loadFolderTree]);
  
  const handleExpandAll = useCallback(async (path: string) => {
    const loadingToast = toast.loading('Expanding all folders...');
    try {
      await expandAllFrom(path);
      toast.success('Expanded all folders', { id: loadingToast });
    } catch {
      toast.error('Failed to expand all folders', { id: loadingToast });
    }
  }, [expandAllFrom]);
  
  const handleCollapseAll = useCallback((path: string) => {
    collapseAllFrom(path);
    toast.success('Collapsed all folders');
  }, [collapseAllFrom]);
  
  
  // Helper function to find a node by path
  const findNodeByPath = useCallback((node: TreeNode, path: string): TreeNode | null => {
    if (node.path === path) return node;
    
    for (const child of node.children) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
    
    return null;
  }, []);

  const filterTree = useCallback((node: TreeNode, query: string): TreeNode | null => {
    if (!query) return node;
    
    const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase());
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter(Boolean) as TreeNode[];
    
    if (matchesQuery || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      };
    }
    
    return null;
  }, []);
  

  const filteredTree = useMemo(() => {
    return filterTree(treeData, searchQuery) || treeData;
  }, [treeData, searchQuery, filterTree]);

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = isPathExpanded(node.path);
    const isActive = currentPath === node.path;
    const hasChildren = node.children.length > 0;
    const isHovered = hoveredFolder === node.path;
    const isCut = clipboardOperation === 'cut' && clipboardItems.some(item => 
      item.key === node.path || item.key === node.path + '/');
    
    // Create a mock R2Object for the folder
    const folderObject: R2Object = {
      key: node.path,
      size: 0,
      lastModified: new Date(),
      isFolder: true
    };
    
    const nodeContent = (
      <motion.div
        initial={false}
        animate={{ 
          backgroundColor: isActive ? 'var(--accent)' : isHovered ? 'var(--accent)/0.5' : 'transparent',
          opacity: isCut ? 0.5 : 1
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "group flex items-center gap-1 rounded-md transition-all duration-150",
          "hover:bg-accent/50",
          isActive && "bg-accent font-medium",
          isCut && "italic"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onMouseEnter={() => setHoveredFolder(node.path)}
        onMouseLeave={() => setHoveredFolder(null)}
        tabIndex={0}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={() => handleToggleFolder(node.path)}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={springPresets.snappy}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.div>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 justify-start px-2 py-1.5 h-auto font-normal",
            "hover:bg-transparent",
            !hasChildren && "ml-6"
          )}
          onClick={() => handleFolderClick(node.path)}
        >
          <motion.div
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={springPresets.gentle}
            className="mr-2"
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-primary" />
            )}
          </motion.div>
          <span className={cn(
            'truncate',
            typography.body(),
            isActive && 'text-accent-foreground'
          )}>
            {node.path === '' ? 'Home' : node.name}
          </span>
        </Button>
      </motion.div>
    );
    
    return (
      <div key={node.path}>
        <DropZone
          targetPath={node.path}
          targetObject={folderObject}
          onHoverExpand={() => {
            if (!isExpanded && hasChildren) {
              handleToggleFolder(node.path);
            }
          }}
          className="my-0.5"
        >
          <FileTreeContextMenu
            node={node}
            onCreateFolder={() => handleCreateFolder(node.path)}
            onRename={() => handleRenameNode(node)}
            onDelete={() => handleDeleteNode(node)}
            onRefresh={() => handleRefresh(node.path)}
            onNavigate={() => handleFolderClick(node.path)}
            onExpandAll={() => handleExpandAll(node.path)}
            onCollapseAll={() => handleCollapseAll(node.path)}
            onPaste={async () => {}}
          >
            {nodeContent}
          </FileTreeContextMenu>
        </DropZone>
        
        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springPresets.smooth}
              style={{ overflow: 'hidden' }}
            >
              {node.children.map(child => renderTreeNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={cn("h-full flex flex-col file-tree-container", className)}>
      {/* Header */}
      <div className="p-grid-4 border-b border-border/50 glass-subtle">
        <h2 className={cn('font-semibold text-foreground mb-grid-3', typography.h4())}>Folders</h2>
        
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('h-8 bg-background/50 border-muted focus:bg-background', typography.body())}
            style={{ paddingLeft: '30px' }}
          />
        </div>
      </div>
      
      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-grid-2">
          <AnimatePresence>
            {filteredTree.children.length === 0 && searchQuery ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn('text-center py-grid-8 text-muted-foreground', typography.body())}
              >
                No folders found
              </motion.div>
            ) : (
              renderTreeNode(filteredTree)
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="p-grid-3 border-t border-border/50 glass-subtle">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full justify-start hover:bg-accent/50', typography.button())}
          onClick={() => loadFolderTree('')}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}