'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ClipboardItem {
  path: string;
  name: string;
  isFolder: boolean;
  timestamp: number;
}

interface ClipboardContextType {
  clipboardItem: ClipboardItem | null;
  copy: (path: string, name: string, isFolder: boolean) => void;
  paste: (destinationPath: string) => Promise<void>;
  clear: () => void;
  canPaste: (currentPath: string) => boolean;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export function ClipboardProvider({ children }: { children: React.ReactNode }) {
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);

  const copy = useCallback((path: string, name: string, isFolder: boolean) => {
    setClipboardItem({
      path,
      name,
      isFolder,
      timestamp: Date.now(),
    });
    toast.success(`Copied "${name}" to clipboard`);
  }, []);

  const paste = useCallback(async (destinationPath: string) => {
    if (!clipboardItem) return;

    try {
      const response = await fetch('/api/r2/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: clipboardItem.path,
          destinationPath: destinationPath,
          isFolder: clipboardItem.isFolder,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to paste');
      }

      toast.success(`Pasted "${clipboardItem.name}" successfully`);
    } catch (error) {
      console.error('Paste error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to paste');
      throw error;
    }
  }, [clipboardItem]);

  const clear = useCallback(() => {
    setClipboardItem(null);
  }, []);

  const canPaste = useCallback((currentPath: string) => {
    if (!clipboardItem) return false;
    
    // Prevent pasting a folder into itself or its subdirectories
    if (clipboardItem.isFolder) {
      const sourcePath = clipboardItem.path.endsWith('/') 
        ? clipboardItem.path 
        : clipboardItem.path + '/';
      const destPath = currentPath.endsWith('/') 
        ? currentPath 
        : currentPath + '/';
      
      if (destPath.startsWith(sourcePath)) {
        return false;
      }
    }
    
    // Prevent pasting into the same directory
    const sourceDir = clipboardItem.path.substring(0, clipboardItem.path.lastIndexOf('/'));
    const currentDir = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
    
    return sourceDir !== currentDir;
  }, [clipboardItem]);

  return (
    <ClipboardContext.Provider value={{ clipboardItem, copy, paste, clear, canPaste }}>
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error('useClipboard must be used within a ClipboardProvider');
  }
  return context;
}