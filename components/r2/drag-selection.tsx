'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface DragSelectionProps {
  containerRef: React.RefObject<HTMLElement>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  selectableSelector?: string;
  enabled?: boolean;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function DragSelection({ 
  containerRef, 
  onSelectionChange, 
  selectableSelector = '[data-selectable-id]',
  enabled = true 
}: DragSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const selectedItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const getSelectableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(selectableSelector));
  }, [containerRef, selectableSelector]);

  const getElementsInSelection = useCallback((rect: SelectionRect) => {
    const elements = getSelectableElements();
    const selected = new Set<string>();
    
    const minX = Math.min(rect.startX, rect.endX);
    const maxX = Math.max(rect.startX, rect.endX);
    const minY = Math.min(rect.startY, rect.endY);
    const maxY = Math.max(rect.startY, rect.endY);
    
    elements.forEach((element) => {
      const elementRect = element.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (!containerRect) return;
      
      // Calculate element position relative to container
      const relativeRect = {
        left: elementRect.left - containerRect.left,
        right: elementRect.right - containerRect.left,
        top: elementRect.top - containerRect.top,
        bottom: elementRect.bottom - containerRect.top,
      };
      
      // Check if element intersects with selection
      const intersects = !(
        relativeRect.right < minX ||
        relativeRect.left > maxX ||
        relativeRect.bottom < minY ||
        relativeRect.top > maxY
      );
      
      if (intersects) {
        const id = element.getAttribute('data-selectable-id');
        if (id) selected.add(id);
      }
    });
    
    return selected;
  }, [containerRef, getSelectableElements]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled || !containerRef.current) return;
    
    // Only start selection on left click on the container itself
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const isClickOnSelectable = target.closest(selectableSelector);
    const isClickOnContainer = target === containerRef.current || 
      (!isClickOnSelectable && containerRef.current.contains(target));
    
    if (!isClickOnContainer) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;
    
    startPointRef.current = { x: startX, y: startY };
    setIsSelecting(true);
    setSelectionRect({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
    
    // Clear previous selection if not holding Ctrl/Cmd
    if (!e.ctrlKey && !e.metaKey) {
      selectedItemsRef.current.clear();
      onSelectionChange(new Set());
    }
    
    e.preventDefault();
  }, [enabled, containerRef, selectableSelector, onSelectionChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelecting || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;
    
    setSelectionRect({
      startX: startPointRef.current.x,
      startY: startPointRef.current.y,
      endX: currentX,
      endY: currentY,
    });
    
    // Update selection in real-time
    const newSelection = getElementsInSelection({
      startX: startPointRef.current.x,
      startY: startPointRef.current.y,
      endX: currentX,
      endY: currentY,
    });
    
    // Merge with existing selection if Ctrl/Cmd is held
    const finalSelection = new Set([...selectedItemsRef.current, ...newSelection]);
    onSelectionChange(finalSelection);
  }, [isSelecting, containerRef, getElementsInSelection, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    setSelectionRect(null);
    
    // Keep the final selection
    if (selectionRect) {
      const selected = getElementsInSelection(selectionRect);
      const finalSelection = new Set([...selectedItemsRef.current, ...selected]);
      selectedItemsRef.current = finalSelection;
      onSelectionChange(finalSelection);
    }
  }, [isSelecting, selectionRect, getElementsInSelection, onSelectionChange]);

  useEffect(() => {
    if (!containerRef.current || !enabled) return;
    
    const container = containerRef.current;
    container.addEventListener('mousedown', handleMouseDown);
    
    if (isSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [containerRef, enabled, isSelecting, handleMouseDown, handleMouseMove, handleMouseUp]);

  if (!mounted || !isSelecting || !selectionRect) return null;

  const minX = Math.min(selectionRect.startX, selectionRect.endX);
  const minY = Math.min(selectionRect.startY, selectionRect.endY);
  const width = Math.abs(selectionRect.endX - selectionRect.startX);
  const height = Math.abs(selectionRect.endY - selectionRect.startY);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed pointer-events-none z-[9998]"
        style={{
          left: containerRef.current?.getBoundingClientRect().left,
          top: containerRef.current?.getBoundingClientRect().top,
        }}
      >
        <div
          className={cn(
            'absolute border-2 border-primary bg-primary/10',
            'rounded-sm'
          )}
          style={{
            left: minX,
            top: minY,
            width,
            height,
          }}
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}