'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { R2Object } from '@/lib/r2/operations';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { validatePath } from '@/lib/utils/path-validation';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  object: R2Object;
  onRenamed: () => void;
}

export function RenameDialog({
  isOpen,
  onClose,
  object,
  onRenamed,
}: RenameDialogProps) {
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const { renameObject } = useFileBrowserStore();
  const t = useTranslations();

  useEffect(() => {
    if (isOpen && object) {
      // Extract the name from the key
      const name = object.isFolder 
        ? object.key.replace(/\/$/, '').split('/').pop() || ''
        : object.key.split('/').pop() || '';
      setNewName(name);
    }
  }, [isOpen, object]);

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error(t('renameDialog.emptyNameError'));
      return;
    }

    // Validate the name using path validation utilities
    const validation = validatePath(newName, { 
      isFolder: object.isFolder,
      checkReserved: true,
      strictMode: false 
    });
    
    if (!validation.isValid) {
      // Show the first error
      toast.error(validation.errors[0]);
      return;
    }
    
    // Show warnings if any
    validation.warnings.forEach(warning => {
      console.warn('Rename warning:', warning);
    });

    setRenaming(true);
    
    try {
      // Use the sanitized name if available
      // Remove trailing slash before getting the name
      const normalizedPath = validation.normalizedPath?.replace(/\/$/, '') || newName;
      const finalName = normalizedPath.split('/').pop() || newName;
      
      // Ensure the name is not empty
      if (!finalName.trim()) {
        toast.error(t('renameDialog.nameRequiredError'));
        setRenaming(false);
        return;
      }
      
      // Build new key
      const pathParts = object.key.split('/');
      pathParts[pathParts.length - (object.isFolder ? 2 : 1)] = finalName;
      
      let newKey = pathParts.join('/');
      if (object.isFolder && !newKey.endsWith('/')) {
        newKey += '/';
      }

      console.log('[RenameDialog] Starting rename:', object.key, '->', newKey);

      // Use the store's renameObject method which handles path updates
      await renameObject(object.key, newKey);
      
      console.log('[RenameDialog] Rename completed');
      
      // The store method already shows success toast, so we just close
      onClose();
      
      // Call onRenamed callback if provided (for backward compatibility)
      if (onRenamed) {
        onRenamed();
      }
    } catch (error) {
      // Error is already handled by the store method
      console.error('Rename error:', error);
    } finally {
      setRenaming(false);
    }
  };

  const handleClose = () => {
    if (!renaming) {
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    }
  };

  const getCurrentName = () => {
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
            {t('renameDialog.title', { type: object?.isFolder ? t('common.folder') : t('common.file') })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="newName" className="text-sm font-medium">
              {t('renameDialog.newNameLabel')}
            </label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('renameDialog.placeholder')}
              disabled={renaming}
              className="mt-1"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {t('renameDialog.currentName', { name: getCurrentName() })}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={renaming}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleRename} 
            disabled={renaming || !newName.trim() || newName === getCurrentName()}
          >
            {renaming ? t('renameDialog.renaming') : t('common.rename')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}