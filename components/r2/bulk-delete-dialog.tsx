'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, Files, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKeys: Set<string>;
  onDeleted: () => void;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  selectedKeys,
  onDeleted,
}: BulkDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleDelete = async () => {
    setDeleting(true);
    const count = selectedKeys.size;
    setProgress({ current: 0, total: count });
    
    try {
      let successCount = 0;
      const errors: string[] = [];
      let current = 0;

      // Delete all selected items
      for (const key of selectedKeys) {
        try {
          const response = await fetch(`/api/r2/delete?key=${encodeURIComponent(key)}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const data = await response.json();
            const fileName = key.split('/').pop() || key;
            errors.push(`${fileName}: ${data.error || 'Failed'}`);
          }
        } catch {
          const fileName = key.split('/').pop() || key;
          errors.push(`${fileName}: Network error`);
        }
        
        current++;
        setProgress({ current, total: count });
      }
      
      if (errors.length === 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Successfully deleted {successCount} {successCount === 1 ? 'item' : 'items'}</span>
          </div>
        );
        onDeleted();
        onClose();
      } else {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>Deleted {successCount} items, but {errors.length} failed</span>
          </div>
        );
        // Still call onDeleted to refresh the list for partial success
        onDeleted();
      }
    } catch {
      toast.error('Error during bulk delete operation');
    } finally {
      setDeleting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  const count = selectedKeys.size;
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

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
                Delete {count} {count === 1 ? 'item' : 'items'}?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Items count display */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Files className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{count} selected {count === 1 ? 'item' : 'items'}</span>
              </div>
              {deleting && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{progress.current} / {progress.total}</span>
                </div>
              )}
            </div>
            
            {/* Progress bar */}
            {deleting && (
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 mb-4">
            <p className="text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                All selected files and folders will be <strong className="font-semibold">permanently deleted</strong>, 
                including any contents inside folders.
              </span>
            </p>
          </div>

          {/* Additional info */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {count === 1 
              ? 'This item will be permanently removed from your storage.'
              : `These ${count} items will be permanently removed from your storage.`}
          </p>
        </div>

        {/* Footer with actions */}
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
                "min-w-[100px] gap-2",
                deleting && "bg-destructive/80"
              )}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting</span>
                </>
              ) : (
                `Delete ${count} ${count === 1 ? 'item' : 'items'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}