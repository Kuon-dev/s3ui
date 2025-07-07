'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import { FolderTreeNode } from '@/lib/r2/operations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';

interface R2FileTreeProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

interface TreeNodeProps {
  node: FolderTreeNode;
  onNavigate: (path: string) => void;
  currentPath: string;
  level?: number;
  onToggle: (path: string) => void;
  expandedFolders: Set<string>;
  onLoadChildren: (path: string) => Promise<void>;
}

function TreeNode({ 
  node, 
  onNavigate, 
  currentPath, 
  level = 0, 
  onToggle, 
  expandedFolders,
  onLoadChildren
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = currentPath === node.path;
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only folders can be toggled
    if (!node.isFolder) return;
    
    if (!isExpanded) {
      setLoading(true);
      try {
        await onLoadChildren(node.path);
      } finally {
        setLoading(false);
      }
    }
    
    onToggle(node.path);
  };

  const handleClick = () => {
    if (node.isFolder) {
      onNavigate(node.path);
    }
    // For files, we could add file preview/download functionality here in the future
  };

  return (
    <div>
      <div
        className={`flex items-center space-x-1 py-1 px-2 rounded transition-colors ${
          node.isFolder ? 'cursor-pointer hover:bg-gray-800' : 'cursor-default hover:bg-gray-800/50'
        } ${
          isSelected ? 'bg-gray-700 text-blue-400' : 'text-gray-300 hover:text-gray-100'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.isFolder ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" /> // Spacer for files
        )}
        
        <div className="flex-shrink-0">
          {(() => {
            const IconComponent = getFileIcon(node.name, node.isFolder, isExpanded);
            const fileType = getFileType(node.name);
            const colorClass = node.isFolder ? 'text-blue-500' : fileType.iconColor;
            
            return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
          })()}
        </div>
        
        <span className="text-sm truncate" title={node.name}>
          {node.name}
        </span>
      </div>

      {node.isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onNavigate={onNavigate}
              currentPath={currentPath}
              level={level + 1}
              onToggle={onToggle}
              expandedFolders={expandedFolders}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function R2FileTree({ currentPath, onNavigate, className = '' }: R2FileTreeProps) {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadedFolders, setLoadedFolders] = useState<Set<string>>(new Set(['']));

  const loadFolderTree = useCallback(async (prefix: string = '') => {
    try {
      const response = await fetch(`/api/r2/folder-tree?prefix=${encodeURIComponent(prefix)}`);
      const data = await response.json();
      
      if (response.ok) {
        setFolderTree(prev => {
          if (prefix === '') {
            return data.folderTree;
          } else {
            // Update the tree by adding children to the expanded folder
            const updateTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
              return nodes.map(node => {
                if (node.path === prefix.replace(/\/$/, '')) {
                  return { ...node, children: data.folderTree };
                } else if (node.children && node.children.length > 0) {
                  return { ...node, children: updateTree(node.children) };
                }
                return node;
              });
            };
            return updateTree(prev);
          }
        });
        
        setLoadedFolders(prev => new Set([...prev, prefix]));
      } else {
        toast.error('Failed to load folder tree');
      }
    } catch {
      toast.error('Error loading folder tree');
    }
  }, []);

  useEffect(() => {
    const loadInitialTree = async () => {
      setLoading(true);
      try {
        await loadFolderTree('');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialTree();
  }, [loadFolderTree]);

  // Auto-expand folders in current path
  useEffect(() => {
    if (currentPath) {
      const pathParts = currentPath.split('/').filter(Boolean);
      
      setExpandedFolders(prev => {
        const pathsToExpand = new Set(prev);
        
        let buildPath = '';
        for (const part of pathParts) {
          buildPath = buildPath ? `${buildPath}/${part}` : part;
          pathsToExpand.add(buildPath);
        }
        
        return pathsToExpand;
      });
    }
  }, [currentPath]);

  const handleToggle = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const wasExpanded = prev.has(path);
      if (wasExpanded) {
        const next = new Set(prev);
        next.delete(path);
        return next;
      } else {
        return new Set([...prev, path]);
      }
    });
  }, []);

  const handleLoadChildren = useCallback(async (path: string) => {
    const folderPath = path ? `${path}/` : '';
    
    // Only load if not already loaded and if it's a folder
    if (!loadedFolders.has(folderPath)) {
      await loadFolderTree(folderPath);
    }
  }, [loadFolderTree, loadedFolders]);

  const handleRootClick = () => {
    onNavigate('');
  };

  return (
    <div className={`bg-gray-900 border-r border-gray-800 h-full overflow-hidden ${className}`}>
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Folders</h3>
        
        {/* Root folder */}
        <Button
          variant="ghost"
          className={`w-full justify-start p-2 h-auto ${
            currentPath === '' ? 'bg-gray-700 text-blue-400' : 'text-gray-300 hover:bg-gray-800'
          }`}
          onClick={handleRootClick}
        >
          <Home className="h-4 w-4 mr-2 text-blue-500" />
          <span className="text-sm">Root</span>
        </Button>
      </div>

      <ScrollArea className="h-full">
        <div className="p-2">
          {loading ? (
            <div className="text-gray-400 text-sm p-2">Loading folders...</div>
          ) : folderTree.length === 0 ? (
            <div className="text-gray-400 text-sm p-2">No folders found</div>
          ) : (
            folderTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                onNavigate={onNavigate}
                currentPath={currentPath}
                onToggle={handleToggle}
                expandedFolders={expandedFolders}
                onLoadChildren={handleLoadChildren}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}