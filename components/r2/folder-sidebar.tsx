'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Home } from 'lucide-react';
import { toast } from 'sonner';
import { FolderTreeNode } from '@/lib/r2/operations';

interface FolderSidebarProps {
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
}

function TreeNode({ 
  node, 
  onNavigate, 
  currentPath, 
  level = 0, 
  onToggle, 
  expandedFolders 
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = currentPath === node.path;
  const hasChildren = node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.path);
  };

  const handleClick = () => {
    onNavigate(node.path);
  };

  return (
    <div>
      <div
        className={`flex items-center space-x-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-800 ${
          isSelected ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        
        <div className="flex-shrink-0">
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
        </div>
        
        <span className="text-sm truncate" title={node.name}>
          {node.name}
        </span>
      </div>

      {isExpanded && hasChildren && (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderSidebar({ currentPath, onNavigate, className = '' }: FolderSidebarProps) {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));

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
                } else if (node.children.length > 0) {
                  return { ...node, children: updateTree(node.children) };
                }
                return node;
              });
            };
            return updateTree(prev);
          }
        });
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

  const handleToggle = useCallback(async (path: string) => {
    const folderPath = path ? `${path}/` : '';
    
    setExpandedFolders(prev => {
      const wasExpanded = prev.has(path);
      if (wasExpanded) {
        const next = new Set(prev);
        next.delete(path);
        return next;
      } else {
        // Load children when expanding
        loadFolderTree(folderPath);
        return new Set([...prev, path]);
      }
    });
  }, [loadFolderTree]);

  const handleRootClick = () => {
    onNavigate('');
  };

  return (
    <div className={`bg-gray-900 border-r border-gray-800 h-full overflow-auto ${className}`}>
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Folders</h3>
        
        {/* Root folder */}
        <div
          className={`flex items-center space-x-2 py-2 px-2 rounded cursor-pointer hover:bg-gray-800 ${
            currentPath === '' ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
          }`}
          onClick={handleRootClick}
        >
          <Home className="h-4 w-4 text-blue-500" />
          <span className="text-sm">Root</span>
        </div>
      </div>

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
            />
          ))
        )}
      </div>
    </div>
  );
}