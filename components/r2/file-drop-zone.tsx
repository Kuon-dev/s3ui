'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  children: React.ReactNode;
  onDrop: (item: any) => void;
  onDropFiles?: (files: File[]) => void;
  currentPath: string;
  className?: string;
}

export function FileDropZone({ children, onDrop, onDropFiles, currentPath, className }: FileDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNativeFileDragOver, setIsNativeFileDragOver] = useState(false);
  
  const { 
    draggingItem,
    currentDropTarget,
    setCurrentDropTarget,
    handleDrop: handleStoreDrop
  } = useFileBrowserStore();

  // Handle internal drag-and-drop
  useEffect(() => {
    if (!draggingItem || !ref.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const isInBounds = 
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      
      // Check if we can drop here
      const itemFolder = draggingItem.key.substring(0, draggingItem.key.lastIndexOf('/'));
      const canDropHere = itemFolder !== currentPath && 
        !(draggingItem.isFolder && currentPath.startsWith(draggingItem.key));
      
      if (isInBounds && canDropHere) {
        if (currentDropTarget !== currentPath) {
          console.log('[FileDropZone] Mouse entered drop zone:', currentPath);
          setCurrentDropTarget(currentPath);
        }
      } else if (currentDropTarget === currentPath) {
        console.log('[FileDropZone] Mouse left drop zone:', currentPath);
        setCurrentDropTarget(null);
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (!ref.current || currentDropTarget !== currentPath || !draggingItem) return;
      
      const rect = ref.current.getBoundingClientRect();
      const isInBounds = 
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      
      if (isInBounds) {
        console.log('[FileDropZone] Drop detected in current folder');
        await handleStoreDrop(currentPath);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingItem, currentDropTarget, currentPath, setCurrentDropTarget, handleStoreDrop]);

  const isOver = currentDropTarget === currentPath;
  const canDrop = draggingItem && isOver;

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsNativeFileDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we're actually leaving the drop zone
    if (e.currentTarget === e.target) {
      setIsNativeFileDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files.length > 0) {
      e.preventDefault();
      setIsNativeFileDragOver(false);
      if (onDropFiles) {
        onDropFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  return (
    <div 
      ref={ref} 
      className={cn(
        className,
        (isOver && canDrop) && 'bg-primary/10 border-2 border-primary border-dashed',
        isNativeFileDragOver && 'bg-primary/10 border-2 border-primary border-dashed animate-pulse'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {(isOver && canDrop) && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
            Drop here to move to this folder
          </div>
        </div>
      )}
    </div>
  );
}