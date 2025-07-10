'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Folder, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/utils/file-types';
import { stagger } from '@/lib/animations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useR2FolderTree, usePrefetchFolder } from '@/lib/hooks/use-r2-queries';
import { R2Object } from '@/lib/r2/operations';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  lastModified?: Date;
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

interface R2FileTreeProps {
  className?: string;
}

function TreeItem({ 
  node, 
  level = 0, 
  index = 0
}: {
  node: TreeNode;
  level?: number;
  index?: number;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const childrenRef = useRef<HTMLDivElement>(null);
  
  const {
    currentPath,
    setCurrentPath,
    isPathExpanded,
    toggleFolder,
    setSelectedObject,
    setShowPreviewDialog,
  } = useFileBrowserStore();
  
  const prefetchFolder = usePrefetchFolder();
  
  const isSelected = currentPath === node.path || currentPath === node.path.replace(/\/$/, '');
  const isExpanded = isPathExpanded(node.path);
  
  const IconComponent = getFileIcon(node.name, node.isFolder, isExpanded);
  
  // Entrance animation
  useEffect(() => {
    if (!itemRef.current) return;
    
    itemRef.current.style.animationDelay = `${stagger(index, 0.02)}s`;
    itemRef.current.classList.add('animate-fade-in');
  }, [index]);
  
  // Expand/collapse animation
  useEffect(() => {
    if (!childrenRef.current) return;
    
    if (isExpanded) {
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
  }, [isExpanded]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (node.isFolder) {
      // Navigate to folder
      setCurrentPath(node.path);
      const folderPath = node.path.endsWith('/') ? node.path : `${node.path}/`;
      prefetchFolder(folderPath);
    } else {
      // For files, set the selected object and show preview
      const fileObject: R2Object = {
        key: node.path,
        size: node.size || 0,
        lastModified: node.lastModified || new Date(),
        isFolder: false
      };
      setSelectedObject(fileObject);
      setShowPreviewDialog(true);
    }
  }, [node, setCurrentPath, prefetchFolder, setSelectedObject, setShowPreviewDialog]);
  
  const handleChevronClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (node.isFolder) {
      toggleFolder(node.path);
      // Prefetch folder contents when expanding
      const folderPath = node.path.endsWith('/') ? node.path : `${node.path}/`;
      prefetchFolder(folderPath);
    }
  }, [node, toggleFolder, prefetchFolder]);
  
  const handleMouseEnter = useCallback(() => {
    if (node.isFolder) {
      // Prefetch folder contents on hover for better UX
      const folderPath = node.path.endsWith('/') ? node.path : `${node.path}/`;
      prefetchFolder(folderPath);
    }
  }, [node, prefetchFolder]);
  
  return (
    <div ref={itemRef} className="opacity-0">
      <div
        className={cn(
          "group flex items-center w-full rounded-lg transition-all duration-200 relative overflow-hidden",
          isSelected && "glass-subtle",
          !isSelected && "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.isFolder ? (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto hover:bg-transparent group/chevron flex-shrink-0"
            onClick={handleChevronClick}
          >
            <div className={cn(
              "p-0.5 rounded transition-all duration-200 hover:bg-muted/50",
              isExpanded && "rotate-90"
            )}>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover/chevron:text-foreground" />
            </div>
          </Button>
        ) : (
          <div className="w-4 flex-shrink-0" /> // Spacer for alignment
        )}
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-left h-auto py-1 px-1.5 hover:bg-transparent min-w-0 overflow-hidden"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            <IconComponent className={cn(
              "h-4 w-4 flex-shrink-0",
              node.isFolder ? "text-blue-500" : "text-muted-foreground",
              isSelected && "text-primary"
            )} />
            <span 
              className={cn(
                "text-sm truncate block",
                isSelected && "font-medium text-primary"
              )}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
        </Button>
      </div>
      
      {node.isFolder && (
        <div 
          ref={childrenRef} 
          className="overflow-hidden"
          style={{ height: 0 }}
        >
          {isExpanded && (
            <TreeItemChildren parentPath={node.path} level={level + 1} />
          )}
        </div>
      )}
    </div>
  );
}

function TreeItemChildren({ parentPath, level }: { parentPath: string; level: number }) {
  const folderPath = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  const { data: children, isLoading } = useR2FolderTree(folderPath);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2" style={{ paddingLeft: `${level * 12 + 8}px` }}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!children || children.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: `${level * 12 + 8}px` }}>
        Empty folder
      </div>
    );
  }
  
  return (
    <>
      {children.map((child, index) => (
        <TreeItem
          key={child.path}
          node={child}
          level={level}
          index={index}
        />
      ))}
    </>
  );
}

export function R2FileTreeRefactored({ className }: R2FileTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentPath, setCurrentPath } = useFileBrowserStore();
  const { data: rootTree, isLoading, error } = useR2FolderTree('');
  
  // Animate container entrance
  useEffect(() => {
    if (!containerRef.current || isLoading) return;
    
    containerRef.current.classList.add('animate-fade-in');
  }, [isLoading]);
  
  const handleRootClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPath('');
  }, [setCurrentPath]);
  
  if (isLoading) {
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
  
  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-sm text-red-500">
          Failed to load file tree
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
            "w-full justify-start text-left h-auto py-1 px-2 mb-0.5 rounded-lg transition-all duration-200 overflow-hidden",
            currentPath === '' && "glass-subtle",
            currentPath !== '' && "hover:bg-muted/50"
          )}
          onClick={handleRootClick}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate">Root</span>
          </div>
        </Button>
        
        {rootTree?.map((node, index) => (
          <TreeItem
            key={node.path}
            node={node}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}