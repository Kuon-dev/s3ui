'use client';

import React from 'react';
import { TableRow } from '@/components/ui/table';
import { DraggableWrapper } from './draggable-wrapper';
import { DropZone } from './drop-zone';
import { R2Object } from '@/lib/r2/operations';
import { cn } from '@/lib/utils';

interface DraggableFileRowProps {
  object: R2Object;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DraggableFileRow({ 
  object, 
  children, 
  className, 
  onClick
}: DraggableFileRowProps) {
  const handleRowClick = (e: React.MouseEvent) => {
    // Prevent click when dragging
    if (e.defaultPrevented) return;
    onClick?.();
  };

  return (
    <DraggableWrapper
      object={object}
      className="w-full"
      onDragStart={() => {
        // Mark the click as prevented during drag
        document.addEventListener('click', (e) => e.preventDefault(), { once: true, capture: true });
      }}
    >
      <DropZone
        targetPath={object.key}
        targetObject={object}
        className="w-full"
        disabled={!object.isFolder}
      >
        <TableRow 
          className={cn(
            'cursor-pointer hover:bg-muted/50 transition-colors',
            className
          )}
          onClick={handleRowClick}
        >
          {children}
        </TableRow>
      </DropZone>
    </DraggableWrapper>
  );
}