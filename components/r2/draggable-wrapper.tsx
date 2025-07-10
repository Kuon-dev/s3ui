'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { R2Object } from '@/lib/r2/operations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';

interface DraggableWrapperProps {
  object: R2Object;
  children: React.ReactNode;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function DraggableWrapper({ 
  object, 
  children, 
  className,
  onDragStart,
  onDragEnd
}: DraggableWrapperProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { 
    startDragging, 
    stopDragging,
    currentDropTarget,
    validDropTargets
  } = useFileBrowserStore();

  const filename = object.isFolder 
    ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
    : object.key.split('/').pop() || object.key;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragOffset({ x: offsetX, y: offsetY });
    
    console.log('[Draggable] Drag started:', {
      key: object.key,
      isFolder: object.isFolder,
      name: filename
    });
    
    setIsDragging(true);
    startDragging({
      key: object.key,
      name: filename,
      isFolder: object.isFolder
    });
    
    if (onDragStart) onDragStart();
    
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !nodeRef.current) return;
    
    // Update visual position
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    nodeRef.current.style.transform = `translate(${x}px, ${y}px)`;
    nodeRef.current.style.zIndex = '1000';
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    console.log('[Draggable] Drag ended:', {
      key: object.key,
      currentDropTarget
    });
    
    setIsDragging(false);
    
    // Reset position after drop
    if (nodeRef.current) {
      nodeRef.current.style.transform = '';
      nodeRef.current.style.zIndex = '';
    }
    
    stopDragging();
    if (onDragEnd) onDragEnd();
  }, [isDragging, object.key, currentDropTarget, stopDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset position when component unmounts or object changes
  useEffect(() => {
    const currentNode = nodeRef.current;
    return () => {
      if (currentNode) {
        currentNode.style.transform = '';
        currentNode.style.zIndex = '';
      }
    };
  }, [object.key]);

  const isValidDropTarget = object.isFolder && validDropTargets.has(object.key);
  const isCurrentDropTarget = currentDropTarget === object.key;

  return (
    <div
      ref={nodeRef}
      className={cn(
        'cursor-move transition-all touch-none',
        isDragging && 'opacity-50 z-50',
        isValidDropTarget && isCurrentDropTarget && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}