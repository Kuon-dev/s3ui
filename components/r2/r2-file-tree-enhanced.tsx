'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/utils/file-types';
import { stagger } from '@/lib/animations';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

interface R2FileTreeProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

function TreeItem({ 
  node, 
  level = 0, 
  currentPath, 
  onNavigate, 
  onToggle,
  index = 0
}: {
  node: TreeNode;
  level?: number;
  currentPath: string;
  onNavigate: (path: string) => void;
  onToggle: (path: string) => void;
  index?: number;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const childrenRef = useRef<HTMLDivElement>(null);
  const isSelected = currentPath === node.path || currentPath === node.path.replace(/\/$/, '');
  
  const IconComponent = getFileIcon(node.name, node.isFolder, node.isExpanded);
  
  // Entrance animation
  useEffect(() => {
    if (!itemRef.current) return;
    
    itemRef.current.style.animationDelay = `${stagger(index, 0.02)}s`;
    itemRef.current.classList.add('animate-fade-in');
  }, [index]);
  
  // Hover animation handled by CSS classes
  
  // Expand/collapse animation
  useEffect(() => {
    if (!childrenRef.current) return;
    
    if (node.isExpanded) {
      childrenRef.current.style.height = 'auto';
      const height = childrenRef.current.offsetHeight;
      childrenRef.current.style.height = '0';
      // Force reflow
      void childrenRef.current.offsetHeight;
      childrenRef.current.style.transition = 'height 0.3s ease-out, opacity 0.3s ease-out';
      childrenRef.current.style.height = `${height}px`;
      childrenRef.current.style.opacity = '1';
      
      setTimeout(() => {
        if (childrenRef.current) {
          childrenRef.current.style.height = 'auto';
        }
      }, 300);
    } else {
      childrenRef.current.style.transition = 'height 0.2s ease-out, opacity 0.2s ease-out';
      childrenRef.current.style.height = '0px';
      childrenRef.current.style.opacity = '0';
    }
  }, [node.isExpanded]);
  
  const handleClick = () => {
    if (node.isFolder) {
      onToggle(node.path);
    }
    onNavigate(node.path);
  };
  
  return (
    <div ref={itemRef} className="opacity-0">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start text-left h-auto py-1.5 px-2 mb-0.5 rounded-lg transition-all duration-200",
          isSelected && "glass-subtle",
          !isSelected && "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center space-x-2">
          {node.isFolder && (
            <div className={cn(
              "transition-transform duration-200",
              node.isExpanded && "rotate-90"
            )}>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <IconComponent className={cn(
            "h-4 w-4",
            node.isFolder ? "text-primary" : "text-muted-foreground",
            isSelected && "text-primary"
          )} />
          <span className={cn(
            "text-sm truncate",
            isSelected && "font-medium text-primary"
          )}>
            {node.name}
          </span>
        </div>
      </Button>
      
      {node.isFolder && (
        <div 
          ref={childrenRef} 
          className="overflow-hidden"
          style={{ height: 0 }}
        >
          {node.children?.map((child, childIndex) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onToggle={onToggle}
              index={childIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function R2FileTreeEnhanced({ currentPath, onNavigate, className }: R2FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const loadFolderContents = useCallback(async (prefix: string = '') => {
    try {
      const response = await fetch(`/api/r2/folder-tree?prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) throw new Error('Failed to load folder tree');
      
      const data = await response.json();
      return data.tree;
    } catch (error) {
      console.error('Error loading folder tree:', error);
      return [];
    }
  }, []);
  
  const buildTreeFromPath = useCallback(async (path: string) => {
    const parts = path.split('/').filter(Boolean);
    const newExpandedPaths = new Set<string>();
    
    let currentPrefix = '';
    for (const part of parts) {
      currentPrefix = currentPrefix ? `${currentPrefix}/${part}` : part;
      newExpandedPaths.add(currentPrefix + '/');
    }
    
    setExpandedPaths(newExpandedPaths);
  }, []);
  
  useEffect(() => {
    const loadInitialTree = async () => {
      setLoading(true);
      const rootTree = await loadFolderContents();
      setTree(rootTree);
      
      if (currentPath) {
        await buildTreeFromPath(currentPath);
      }
      
      setLoading(false);
    };
    
    loadInitialTree();
  }, [currentPath, loadFolderContents, buildTreeFromPath]);
  
  const handleToggle = useCallback(async (path: string) => {
    const newExpanded = new Set(expandedPaths);
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    if (newExpanded.has(normalizedPath)) {
      newExpanded.delete(normalizedPath);
    } else {
      newExpanded.add(normalizedPath);
      
      // Load children if not already loaded
      const updateNodeChildren = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
        if (!nodes || !Array.isArray(nodes)) return [];
        
        return Promise.all(nodes.map(async (node) => {
          if (node.path === path && (!node.children || node.children.length === 0)) {
            const children = await loadFolderContents(normalizedPath);
            return { ...node, children, isExpanded: true };
          }
          if (node.children) {
            return { ...node, children: await updateNodeChildren(node.children) };
          }
          return node;
        }));
      };
      
      const updatedTree = await updateNodeChildren(tree);
      setTree(updatedTree);
    }
    
    setExpandedPaths(newExpanded);
  }, [expandedPaths, tree, loadFolderContents]);
  
  // Update tree to reflect expanded state
  const treeWithExpandedState = React.useMemo(() => {
    const updateExpandedState = (nodes: TreeNode[]): TreeNode[] => {
      if (!nodes || !Array.isArray(nodes)) {
        return [];
      }
      return nodes.map(node => ({
        ...node,
        isExpanded: expandedPaths.has(node.path.endsWith('/') ? node.path : `${node.path}/`),
        children: node.children ? updateExpandedState(node.children) : undefined
      }));
    };
    
    return updateExpandedState(tree);
  }, [tree, expandedPaths]);
  
  // Animate container entrance
  useEffect(() => {
    if (!containerRef.current || loading) return;
    
    containerRef.current.classList.add('animate-fade-in');
  }, [loading]);
  
  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className={cn("p-4 overflow-auto", className)} style={{ opacity: 0 }}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground px-2">Explorer</h3>
      </div>
      
      <div className="space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start text-left h-auto py-1.5 px-2 mb-0.5 rounded-lg transition-all duration-200",
            currentPath === '' && "glass-subtle",
            currentPath !== '' && "hover:bg-muted/50"
          )}
          onClick={() => onNavigate('')}
        >
          <div className="flex items-center space-x-2">
            <Folder className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Root</span>
          </div>
        </Button>
        
        {treeWithExpandedState.map((node, index) => (
          <TreeItem
            key={node.path}
            node={node}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onToggle={handleToggle}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}