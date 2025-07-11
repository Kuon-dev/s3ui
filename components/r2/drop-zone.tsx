'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { R2Object } from '@/lib/r2/operations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen } from 'lucide-react';

interface DropZoneProps {
  targetPath: string;
  targetObject?: R2Object;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onHoverExpand?: () => void;
  expandDelay?: number;
}

export function DropZone({ 
  targetPath, 
  targetObject,
  children, 
  className,
  disabled = false,
  onHoverExpand,
  expandDelay = 700
}: DropZoneProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isOver, setIsOver] = useState(false);
  
  const { 
    draggingItem,
    currentDropTarget,
    setCurrentDropTarget,
    canDrop,
    handleDrop: handleStoreDrop
  } = useFileBrowserStore();

  const isValidTarget = targetObject?.isFolder && 
    draggingItem && 
    !disabled &&
    canDrop(draggingItem, targetPath);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isValidTarget) {
      setIsOver(true);
      setCurrentDropTarget(targetPath);
      
      // Start expand timer for folders
      if (onHoverExpand && !expandTimeoutRef.current) {
        expandTimeoutRef.current = setTimeout(() => {
          onHoverExpand();
        }, expandDelay);
      }
    }
  }, [isValidTarget, targetPath, setCurrentDropTarget, onHoverExpand, expandDelay]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the element
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setIsOver(false);
        if (currentDropTarget === targetPath) {
          setCurrentDropTarget(null);
        }
        
        // Clear expand timer
        if (expandTimeoutRef.current) {
          clearTimeout(expandTimeoutRef.current);
          expandTimeoutRef.current = null;
        }
      }
    }
  }, [currentDropTarget, targetPath, setCurrentDropTarget]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isValidTarget) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, [isValidTarget]);

  const handleDragDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsOver(false);
    
    // Clear expand timer
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    
    if (!isValidTarget) return;
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (dragData) {
        const data = JSON.parse(dragData);
        console.log('[DropZone] Drop received:', { data, targetPath });
        await handleStoreDrop(targetPath);
      }
    } catch (error) {
      console.error('[DropZone] Error handling drop:', error);
    }
  }, [isValidTarget, targetPath, handleStoreDrop]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, []);

  const showDropIndicator = isValidTarget && isOver && currentDropTarget === targetPath;

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'relative transition-all duration-200',
        showDropIndicator && 'scale-[1.02]',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDragDrop}
      data-drop-target={targetPath}
    >
      {children}
      
      <AnimatePresence>
        {showDropIndicator && (
          <>
            {/* Drop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              <div className="absolute inset-0 bg-primary/10 rounded-lg" />
              <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg animate-pulse" />
            </motion.div>
            
            {/* Drop indicator badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2, type: 'spring', bounce: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            >
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="h-4 w-4" />
                Drop here
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}