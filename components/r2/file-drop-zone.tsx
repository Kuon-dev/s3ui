'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FolderOpen } from 'lucide-react';

interface FileDropZoneProps {
  children: React.ReactNode;
  onDrop?: (item: { key: string; name: string; isFolder: boolean; selectedCount?: number }) => void;
  onDropFiles?: (files: File[]) => void;
  currentPath: string;
  className?: string;
}

export function FileDropZone({ children, onDrop, onDropFiles, currentPath, className }: FileDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNativeFileDragOver, setIsNativeFileDragOver] = useState(false);
  const [isInternalDragOver, setIsInternalDragOver] = useState(false);
  
  const { 
    draggingItem,
    currentDropTarget,
    setCurrentDropTarget,
    handleDrop: handleStoreDrop
  } = useFileBrowserStore();

  // Check if we can drop here
  const canDropHere = useCallback(() => {
    if (!draggingItem) return false;
    const itemFolder = draggingItem.key.substring(0, draggingItem.key.lastIndexOf('/'));
    return itemFolder !== currentPath && 
      !(draggingItem.isFolder && currentPath.startsWith(draggingItem.key));
  }, [draggingItem, currentPath]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if it's a native file drag
    if (e.dataTransfer.types.includes('Files')) {
      setIsNativeFileDragOver(true);
    } 
    // Check if it's internal drag
    else if (e.dataTransfer.types.includes('application/json') && canDropHere()) {
      setIsInternalDragOver(true);
      setCurrentDropTarget(currentPath);
    }
  }, [canDropHere, currentPath, setCurrentDropTarget]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setIsNativeFileDragOver(false);
        setIsInternalDragOver(false);
        if (currentDropTarget === currentPath) {
          setCurrentDropTarget(null);
        }
      }
    }
  }, [currentDropTarget, currentPath, setCurrentDropTarget]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files') || canDropHere()) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, [canDropHere]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsNativeFileDragOver(false);
    setIsInternalDragOver(false);
    
    // Handle native file drop
    if (e.dataTransfer.files.length > 0) {
      if (onDropFiles) {
        onDropFiles(Array.from(e.dataTransfer.files));
      }
    }
    // Handle internal drag and drop
    else if (e.dataTransfer.types.includes('application/json')) {
      try {
        const dragData = e.dataTransfer.getData('application/json');
        if (dragData && canDropHere()) {
          const data = JSON.parse(dragData);
          console.log('[FileDropZone] Drop received:', { data, currentPath });
          if (onDrop) {
            onDrop(data);
          } else {
            await handleStoreDrop(currentPath);
          }
        }
      } catch (error) {
        console.error('[FileDropZone] Error handling drop:', error);
      }
    }
  }, [canDropHere, currentPath, onDrop, onDropFiles, handleStoreDrop]);

  const showInternalDropIndicator = isInternalDragOver && canDropHere();
  const showNativeDropIndicator = isNativeFileDragOver;

  return (
    <div 
      ref={ref} 
      className={cn(
        'relative',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      <AnimatePresence>
        {showInternalDropIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-lg" />
            <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.3 }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Drop here to move
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {showNativeDropIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-lg animate-pulse" />
            <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.3 }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Drop files to upload
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}