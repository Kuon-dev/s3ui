'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { R2Object } from '@/lib/r2/operations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  targetPath: string;
  targetObject?: R2Object;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DropZone({ 
  targetPath, 
  targetObject,
  children, 
  className,
  disabled = false
}: DropZoneProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  
  const { 
    draggingItem,
    currentDropTarget,
    setCurrentDropTarget,
    validDropTargets
  } = useFileBrowserStore();

  const isValidTarget = useMemo(() => {
    return targetObject?.isFolder && 
      draggingItem && 
      validDropTargets.has(targetPath) &&
      !disabled;
  }, [targetObject?.isFolder, draggingItem, validDropTargets, targetPath, disabled]);

  useEffect(() => {
    if (!draggingItem || !dropZoneRef.current || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dropZoneRef.current) return;
      
      const rect = dropZoneRef.current.getBoundingClientRect();
      const isInBounds = 
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      
      if (isInBounds && isValidTarget) {
        if (!isOver) {
          console.log('[DropZone] Mouse entered:', targetPath);
          setIsOver(true);
          setCurrentDropTarget(targetPath);
        }
      } else {
        if (isOver) {
          console.log('[DropZone] Mouse left:', targetPath);
          setIsOver(false);
          if (currentDropTarget === targetPath) {
            setCurrentDropTarget(null);
          }
        }
      }
    };

    // Add global event listeners
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      setIsOver(false);
    };
  }, [draggingItem, isOver, targetPath, currentDropTarget, setCurrentDropTarget, isValidTarget, disabled]);

  // Clean up when dragging stops
  useEffect(() => {
    if (!draggingItem) {
      setIsOver(false);
    }
  }, [draggingItem]);

  const showDropIndicator = isValidTarget && isOver && currentDropTarget === targetPath;

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'relative transition-all',
        showDropIndicator && 'ring-2 ring-primary ring-offset-2 bg-primary/10',
        className
      )}
      data-drop-target={targetPath}
    >
      {children}
      {showDropIndicator && (
        <div className="absolute inset-0 pointer-events-none border-2 border-primary border-dashed rounded-lg animate-pulse" />
      )}
    </div>
  );
}