'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { FileIcon, FolderIcon, Copy } from 'lucide-react';

interface DragPreviewProps {
  isDragging: boolean;
  selectedCount?: number;
}

export function DragPreview({ isDragging, selectedCount = 1 }: DragPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const { draggingItem } = useFileBrowserStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  if (!mounted || !isDragging || !draggingItem) return null;

  const Icon = draggingItem.isFolder ? FolderIcon : FileIcon;
  const iconColor = draggingItem.isFolder ? 'text-primary' : 'text-muted-foreground';

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: position.x + 10,
          top: position.y + 10,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-2xl">
          <div className="relative">
            <Icon className={cn('h-4 w-4', iconColor)} />
            {selectedCount > 1 && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {selectedCount}
              </div>
            )}
          </div>
          <span className="text-sm font-medium max-w-[200px] truncate">
            {draggingItem.name}
            {selectedCount > 1 && ` and ${selectedCount - 1} more`}
          </span>
          <Copy className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="absolute inset-0 bg-primary/20 blur-xl -z-10" />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}