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
        className={`flex items-center space-x-1 py-1 px-2 rounded cursor-pointer hover:bg-muted ${
          isSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted rounded"
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
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-primary" />
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
  const [allFoldersLoaded, setAllFoldersLoaded] = useState(false);

  // Build a complete tree structure from a flat list of folder paths
  const buildTreeFromFlatList = (folderPaths: string[]): FolderTreeNode[] => {
    interface TreeNode extends FolderTreeNode {
      _childrenMap?: { [key: string]: TreeNode };
    }
    
    const root: { [key: string]: TreeNode } = {};
    
    // Sort paths to ensure parents come before children
    folderPaths.sort();
    
    for (const path of folderPaths) {
      const parts = path.split('/');
      let currentLevel = root;
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: currentPath,
            children: [],
            isExpanded: false,
            isFolder: true,
          };
        }
        
        if (i < parts.length - 1) {
          // Create children object if it doesn't exist
          if (!currentLevel[part]._childrenMap) {
            currentLevel[part]._childrenMap = {};
          }
          currentLevel = currentLevel[part]._childrenMap!;
        }
      }
    }
    
    // Convert the tree structure to array format
    const convertToArray = (level: { [key: string]: TreeNode }): FolderTreeNode[] => {
      return Object.values(level).map(node => {
        if (node._childrenMap) {
          node.children = convertToArray(node._childrenMap);
          delete node._childrenMap;
        }
        return node;
      }).sort((a, b) => a.name.localeCompare(b.name));
    };
    
    return convertToArray(root);
  };

  // Load all folders at once for better drag-and-drop experience
  const loadAllFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/r2/all-folders');
      const data = await response.json();
      
      if (response.ok && data.folders) {
        const tree = buildTreeFromFlatList(data.folders);
        setFolderTree(tree);
        setAllFoldersLoaded(true);
        
        // Auto-expand all folders in the current path
        if (currentPath) {
          const pathParts = currentPath.split('/').filter(Boolean);
          const pathsToExpand = new Set<string>();
          
          let buildPath = '';
          for (const part of pathParts) {
            buildPath = buildPath ? `${buildPath}/${part}` : part;
            pathsToExpand.add(buildPath);
          }
          
          setExpandedFolders(pathsToExpand);
        }
      } else {
        toast.error('Failed to load folders');
      }
    } catch (error) {
      console.error('Error loading all folders:', error);
      toast.error('Error loading folders');
    }
  }, [currentPath]);

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
        // Try to load all folders at once for better drag-and-drop support
        await loadAllFolders();
      } catch (error) {
        // Fallback to lazy loading if all-folders endpoint fails
        console.error('Failed to load all folders, falling back to lazy loading:', error);
        await loadFolderTree('');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialTree();
  }, [loadAllFolders, loadFolderTree]);

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
        // Only load children if not all folders are loaded
        if (!allFoldersLoaded) {
          loadFolderTree(folderPath);
        }
        return new Set([...prev, path]);
      }
    });
  }, [loadFolderTree, allFoldersLoaded]);

  const handleRootClick = () => {
    onNavigate('');
  };

  return (
    <div className={`bg-background border-r border-border h-full overflow-auto ${className}`}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
        
        {/* Root folder */}
        <div
          className={`flex items-center space-x-2 py-2 px-2 rounded cursor-pointer hover:bg-muted ${
            currentPath === '' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          }`}
          onClick={handleRootClick}
        >
          <Home className="h-4 w-4 text-primary" />
          <span className="text-sm">Root</span>
        </div>
      </div>

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