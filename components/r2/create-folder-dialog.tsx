'use client';

import React, { useState } from 'react';
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

  const handleCreate = async () => {
    const validation = validateFolderName(folderName);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setCreating(true);
    
    try {
      const folderPath = currentPath 
        ? `${currentPath}/${folderName}`
        : folderName;

      const response = await fetch('/api/r2/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath }),
      });

      if (response.ok) {
        toast.success('Folder created successfully');
        setFolderName('');
        onFolderCreated();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create folder');
      }
    } catch {
      toast.error('Error creating folder');
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
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="folderName" className="text-sm font-medium">
              Folder Name
            </label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter folder name"
              disabled={creating}
              className="mt-1"
            />
          </div>

          <div className="text-sm text-gray-400">
            Create in: /{currentPath}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !folderName.trim()}>
            {creating ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}