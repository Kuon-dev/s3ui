'use client';

import React, { useRef, useState, useEffect } from 'react';
import { R2Object } from '@/lib/r2/operations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';
import { DragPreview } from './drag-preview';

interface DraggableWrapperProps {
  object: R2Object;
  children: React.ReactNode;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  selected?: boolean;
  selectedCount?: number;
}

export function DraggableWrapper({ 
  object, 
  children, 
  className,
  onDragStart,
  onDragEnd,
  selected = false,
  selectedCount = 1
}: DraggableWrapperProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { 
    startDragging, 
    stopDragging,
    currentDropTarget,
    validDropTargets
  } = useFileBrowserStore();

  const filename = object.isFolder 
    ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
    : object.key.split('/').pop() || object.key;

  const handleDragStart = (e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', object.key);
    e.dataTransfer.setData('application/json', JSON.stringify({
      key: object.key,
      name: filename,
      isFolder: object.isFolder,
      selectedCount: selected ? selectedCount : 1
    }));
    
    // Create invisible drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = '1px';
    dragImage.style.height = '1px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a brief delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    setIsDragging(true);
    
    // Create drag item with selected items if applicable
    const dragItem = {
      key: object.key,
      name: filename,
      isFolder: object.isFolder
    };
    
    // Pass drag item to store which will handle selected items
    startDragging(dragItem);
    
    if (onDragStart) onDragStart();
    
    // Add dragging class to body for global cursor
    document.body.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    
    setIsDragging(false);
    
    // Small delay to allow drop event to fire first
    setTimeout(() => {
      stopDragging();
      if (onDragEnd) onDragEnd();
    }, 0);
    
    // Remove dragging class from body
    document.body.classList.remove('dragging');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('dragging');
    };
  }, []);

  const isValidDropTarget = object.isFolder && validDropTargets.has(object.key);
  const isCurrentDropTarget = currentDropTarget === object.key;

  return (
    <>
      <div
        ref={nodeRef}
        draggable
        className={cn(
          'cursor-grab active:cursor-grabbing transition-all',
          isDragging && 'opacity-50',
          isValidDropTarget && isCurrentDropTarget && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </div>
      
      {/* Custom drag preview */}
      <DragPreview 
        isDragging={isDragging} 
        selectedCount={selected ? selectedCount : 1}
      />
    </>
  );
}