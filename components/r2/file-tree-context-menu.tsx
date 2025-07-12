'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TreeNode } from './r2-file-tree';
import { UnifiedContextMenu } from './unified-context-menu';

interface FileTreeContextMenuProps {
  node: TreeNode;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onNavigate: () => Promise<void>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPaste: () => Promise<void>;
  children: React.ReactNode;
}

export function FileTreeContextMenu({
  node,
  onCreateFolder,
  onRefresh,
  onNavigate,
  onExpandAll,
  onCollapseAll,
  children
}: FileTreeContextMenuProps) {
  // Convert TreeNode to the format expected by UnifiedContextMenu
  const nodeObject = {
    key: node.path.endsWith('/') ? node.path : node.path + '/',
    name: node.name,
    isFolder: node.isFolder
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <UnifiedContextMenu
          object={nodeObject}
          currentPath={node.path}
          context="file-tree"
          hasChildren={node.children.length > 0}
          onNavigate={onNavigate}
          onCreateFolder={onCreateFolder}
          onRefresh={onRefresh}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}