'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { R2Object } from '@/lib/r2/operations';

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

  const handleDelete = async () => {
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/r2/delete?key=${encodeURIComponent(object.key)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${object.isFolder ? 'Folder' : 'File'} deleted successfully`);
        onDeleted();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Error deleting item');
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete {object?.isFolder ? 'Folder' : 'File'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm">
            Are you sure you want to delete &ldquo;{getItemName()}&rdquo;?
            {object?.isFolder && (
              <span className="block mt-1 text-destructive font-medium">
                This will also delete all files and folders inside it.
              </span>
            )}
          </p>
          
          <p className="text-xs text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete} 
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}