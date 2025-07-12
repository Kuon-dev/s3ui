'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { R2Object } from '@/lib/r2/operations';
import { AlertTriangle, Folder, File, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  object: R2Object;
  onDeleted: () => void;
}

export function DeleteDialog({
  isOpen,
  onClose,
  object,
  onDeleted,
}: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { deleteObject } = useFileBrowserStore();

  const handleDelete = async () => {
    setDeleting(true);
    
    try {
      // Use the store's deleteObject method which handles tree updates
      await deleteObject(object.key);
      
      // The store method already shows success toast, so we just close
      onClose();
      
      // Call onDeleted callback if provided (for backward compatibility)
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      // Error is already handled by the store method
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  const getItemName = () => {
    if (!object) return '';
    return object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || ''
      : object.key.split('/').pop() || '';
  };

  const itemName = getItemName();
  const Icon = object?.isFolder ? Folder : File;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[440px] p-0 gap-0 overflow-hidden">
        {/* Header with icon */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1 pt-1">
              <h2 className="text-lg font-semibold text-foreground">
                Delete {object?.isFolder ? 'folder' : 'file'}?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Item being deleted */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 mb-4">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">{itemName}</span>
            </div>
          </div>

          {/* Warning for folders */}
          {object?.isFolder && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 mb-4">
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  All files and subfolders inside <strong className="font-semibold">{itemName}</strong> will be permanently deleted.
                </span>
              </p>
            </div>
          )}

          {/* Additional info */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {object?.isFolder 
              ? 'This will permanently remove the folder and all of its contents from your storage.' 
              : 'This file will be permanently removed from your storage.'}
          </p>
        </div>

        {/* Footer with actions - separated with border */}
        <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={handleClose} 
              disabled={deleting}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete} 
              disabled={deleting}
              className={cn(
                "min-w-[80px] gap-2",
                deleting && "bg-destructive/80"
              )}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting</span>
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}