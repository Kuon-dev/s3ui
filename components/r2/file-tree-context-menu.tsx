'use client';

import React from 'react';
import {
  FolderPlus,
  Upload,
  Edit,
  Trash2,
  RefreshCw,
  Copy,
  Scissors,
  ClipboardPaste,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Link,
  Info
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TreeNode } from './r2-file-tree';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { toast } from 'sonner';

interface FileTreeContextMenuProps {
  node: TreeNode;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onNavigate: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onShowProperties: () => void;
  children: React.ReactNode;
}

export function FileTreeContextMenu({
  node,
  onCreateFolder,
  onRename,
  onDelete,
  onRefresh,
  onNavigate,
  onExpandAll,
  onCollapseAll,
  onShowProperties,
  children
}: FileTreeContextMenuProps) {
  const { 
    clipboardItem, 
    copyToClipboard, 
    canPaste,
    pasteFromClipboard,
    setShowUploadDialog 
  } = useFileBrowserStore();
  const hasClipboardItems = clipboardItem !== null;
  const hasChildren = node.children.length > 0;

  const handleCopy = () => {
    copyToClipboard(node.path, node.name, true);
  };

  const handleCut = () => {
    // Cut is not implemented in the file browser store yet
    // For now, we'll copy and show a different message
    copyToClipboard(node.path, node.name, true);
    toast.info('Cut functionality coming soon! Item copied instead.');
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(node.path);
      toast.success('Path copied to clipboard');
    } catch {
      toast.error('Failed to copy path');
    }
  };

  const handleUpload = () => {
    // Set the target path for upload
    onNavigate(); // Navigate to the folder first
    setTimeout(() => {
      setShowUploadDialog(true);
    }, 100);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Primary Actions */}
        <ContextMenuItem onClick={onNavigate}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onCreateFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
          <ContextMenuShortcut>⌘⇧N</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleUpload}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {/* Edit Actions */}
        <ContextMenuItem onClick={onRename}>
          <Edit className="h-4 w-4 mr-2" />
          Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
          <ContextMenuShortcut>⌦</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {/* Clipboard Actions */}
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCut}>
          <Scissors className="h-4 w-4 mr-2" />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        
        {hasClipboardItems && canPaste(node.path) && (
          <ContextMenuItem 
            onClick={async () => {
              await onNavigate(); // Navigate to folder first
              setTimeout(() => {
                pasteFromClipboard(node.path);
              }, 100); // Small delay to ensure navigation completes
            }}
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Paste (Copy)
            <ContextMenuShortcut>⌘V</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* View Actions */}
        {hasChildren && (
          <>
            <ContextMenuItem onClick={onExpandAll}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Expand All
            </ContextMenuItem>
            
            <ContextMenuItem onClick={onCollapseAll}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Collapse All
            </ContextMenuItem>
            
            <ContextMenuSeparator />
          </>
        )}
        
        <ContextMenuItem onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {/* Utility Actions */}
        <ContextMenuItem onClick={handleCopyPath}>
          <Link className="h-4 w-4 mr-2" />
          Copy Path
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onShowProperties}>
          <Info className="h-4 w-4 mr-2" />
          Properties
          <ContextMenuShortcut>⌘I</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}