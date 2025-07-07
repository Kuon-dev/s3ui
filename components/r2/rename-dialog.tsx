'use client';

import React, { useState, useEffect } from 'react';
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
      toast.error('Please enter a name');
      return;
    }

    // Validate name
    if (newName.includes('/') || newName.includes('\\')) {
      toast.error('Name cannot contain slashes');
      return;
    }

    setRenaming(true);
    
    try {
      // Build new key
      const pathParts = object.key.split('/');
      pathParts[pathParts.length - (object.isFolder ? 2 : 1)] = newName;
      
      let newKey = pathParts.join('/');
      if (object.isFolder && !newKey.endsWith('/')) {
        newKey += '/';
      }

      const response = await fetch('/api/r2/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          oldKey: object.key, 
          newKey 
        }),
      });

      if (response.ok) {
        toast.success(`${object.isFolder ? 'Folder' : 'File'} renamed successfully`);
        onRenamed();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to rename');
      }
    } catch {
      toast.error('Error renaming item');
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
            Rename {object?.isFolder ? 'Folder' : 'File'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="newName" className="text-sm font-medium">
              New Name
            </label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter new name"
              disabled={renaming}
              className="mt-1"
            />
          </div>

          <div className="text-sm text-gray-400">
            Current name: {getCurrentName()}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={renaming}>
            Cancel
          </Button>
          <Button 
            onClick={handleRename} 
            disabled={renaming || !newName.trim() || newName === getCurrentName()}
          >
            {renaming ? 'Renaming...' : 'Rename'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}