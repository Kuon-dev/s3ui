'use client';

import React, { useState } from 'react';
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
import { validateFolderName } from '@/lib/utils/file-utils';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onFolderCreated: () => void;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  currentPath,
  onFolderCreated,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const { createFolder } = useFileBrowserStore();
  const t = useTranslations();

  const handleCreate = async () => {
    const validation = validateFolderName(folderName);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setCreating(true);
    
    try {
      // Use the store's createFolder method which handles path updates
      await createFolder(folderName);
      
      // The store method already shows success toast, so we just close
      setFolderName('');
      onClose();
      
      // Call onFolderCreated callback if provided (for backward compatibility)
      if (onFolderCreated) {
        onFolderCreated();
      }
    } catch (error) {
      // Error is already handled by the store method
      console.error('Create folder error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setFolderName('');
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createFolderDialog.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="folderName" className="text-sm font-medium">
              {t('createFolderDialog.folderNameLabel')}
            </label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('createFolderDialog.placeholder')}
              disabled={creating}
              className="mt-1"
            />
          </div>

          <div className="text-sm text-gray-400">
            {t('createFolderDialog.createIn', { path: currentPath })}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={creating || !folderName.trim()}>
            {creating ? t('createFolderDialog.creating') : t('createFolderDialog.createButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}