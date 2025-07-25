'use client';

import React, { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  Upload,
  FolderPlus,
  MoreHorizontal,
  Trash2,
  Edit,
  Home,
  ChevronRight,
  Download,
  Eye,
  Search,
  Copy,
  Clipboard,
  ClipboardPaste,
  Scissors,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Calendar,
  HardDrive,
  Type,
  FileType,
  RefreshCw,
  FolderIcon,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FileDropZone } from './file-drop-zone';
import { DraggableWrapper } from './draggable-wrapper';
import { DropZone } from './drop-zone';
import { toast } from 'sonner';
import { R2Object } from '@/lib/r2/operations';
import { uploadManager } from '@/lib/service-worker/upload-manager';
import { CreateFolderDialog } from './create-folder-dialog';
import { RenameDialog } from './rename-dialog';
import { DeleteDialog } from './delete-dialog';
import { BulkDeleteDialog } from './bulk-delete-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnifiedContextMenu } from './unified-context-menu';
import { useCommonFileOperations } from '@/lib/hooks/use-common-file-operations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ResizablePanels } from '@/components/ui/resizable';
import { GlobalSearch } from './global-search';
import { FilePreviewDialog } from './file-preview-dialog';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { useFileBrowserStore, useFilteredObjects, useIsLoading, type DragItem } from '@/lib/stores/file-browser-store';
import { useClipboardStore } from '@/lib/stores/clipboard-store';
import { useFileOperations } from '@/lib/hooks/use-file-operations';
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';
import { EmptyState } from './empty-state';
import { R2FileTree } from './r2-file-tree';
import { UploadDialog } from './upload-dialog';
import { TooltipWrapper as Tooltip } from '@/components/ui/tooltip-wrapper';
import { getParentPath } from '@/lib/utils/path';
import { cn } from '@/lib/utils';
import { fileEventBus, type FileSystemEvent } from '@/lib/utils/file-event-bus';
import { SettingsDialog } from './settings-dialog';
import { useSetShowSettings } from '@/lib/stores/ui-state-store';
import { useDensityClasses } from '@/lib/hooks/use-density-classes';
import { useTypography } from '@/lib/hooks/use-typography';

interface FileBrowserProps {
  initialPath?: string;
}

export function FileBrowser({ initialPath = '' }: FileBrowserProps) {
  const typography = useTypography();
  const t = useTranslations();
  const {
    currentPath,
    searchQuery,
    selectedObject,
    showUploadDialog,
    showCreateFolderDialog,
    showRenameDialog,
    showDeleteDialog,
    showPreviewDialog,
    showGlobalSearch,
    setCurrentPath,
    navigateToFolder,
    setSearchQuery,
    setSelectedObject,
    setShowUploadDialog,
    setShowCreateFolderDialog,
    setShowRenameDialog,
    setShowDeleteDialog,
    setShowPreviewDialog,
    setShowGlobalSearch,
    loadObjects,
    refreshCurrentFolder,
    renameObject,
    checkAndRestore,
  } = useFileBrowserStore();
  
  const {
    hasItems: hasClipboardItems,
    canPaste,
    items: clipboardItems,
    operation: clipboardOperation,
    copy: copyToClipboard
  } = useClipboardStore();
  
  const { 
    handleCopy: handleCopyCommon,
    handleCut: handleCutCommon,
    handlePreview,
    handleDownload,
    handleCopyUrl 
  } = useCommonFileOperations();

  const filteredObjects = useFilteredObjects();
  const loading = useIsLoading(`objects-${currentPath}`);
  const [viewMode] = React.useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = React.useState<'name' | 'size' | 'date' | 'type'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [pasteConflicts, setPasteConflicts] = React.useState<Array<{item: {key: string; name: string; isFolder: boolean}; existingKey: string}>>([]);
  const [showConflictDialog, setShowConflictDialog] = React.useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false);
  const setShowSettings = useSetShowSettings();
  const densityClasses = useDensityClasses();
  
  // Debug logging
  React.useEffect(() => {
    console.log('[FileBrowser] Component rendered - currentPath:', currentPath, 'objects count:', filteredObjects.length);
  }, [currentPath, filteredObjects]);
  
  const { paste } = useFileOperations();

  useEffect(() => {
    uploadManager.initialize();
    
    // Check if we need to restore state after a refresh
    checkAndRestore().then(() => {
      // Only load if we didn't restore (restoration includes navigation)
      if (initialPath && initialPath !== currentPath) {
        setCurrentPath(initialPath);
      } else {
        loadObjects(currentPath);
      }
    });
  }, [initialPath, currentPath, setCurrentPath, loadObjects, checkAndRestore]);

  // Clear selection when changing paths
  useEffect(() => {
    setSelectedItems(new Set());
  }, [currentPath]);

  // Subscribe to file system events to update UI when files/folders are renamed
  useEffect(() => {
    // Handler for file rename events
    const handleFileRenamed = async (event: FileSystemEvent) => {
      const { oldPath, newPath, metadata } = event.payload;
      
      // Skip if oldPath or newPath is missing
      if (!oldPath || !newPath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      
      // Check if the renamed file is in the current folder
      const oldParent = getParentPath(oldPath);
      const newParent = getParentPath(newPath);
      
      // Refresh if the file was renamed in the current folder or moved to/from it
      if (oldParent === currentPath || newParent === currentPath) {
        await refreshCurrentFolder();
      }
    };

    // Handler for folder rename events
    const handleFolderRenamed = async (event: FileSystemEvent) => {
      const { oldPath, newPath, metadata } = event.payload;
      
      // Skip if oldPath or newPath is missing
      if (!oldPath || !newPath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      
      // Remove trailing slashes for comparison
      const oldFolderPath = oldPath.endsWith('/') ? oldPath.slice(0, -1) : oldPath;
      const newFolderPath = newPath.endsWith('/') ? newPath.slice(0, -1) : newPath;
      
      // Check if current path is affected by the folder rename
      if (currentPath === oldFolderPath || currentPath.startsWith(oldFolderPath + '/')) {
        // Current path is the renamed folder or inside it - navigate to new path
        const newCurrentPath = currentPath === oldFolderPath 
          ? newFolderPath 
          : newFolderPath + currentPath.substring(oldFolderPath.length);
        
        await navigateToFolder(newCurrentPath);
      } else {
        // Check if the renamed folder is in the current folder
        const oldParent = getParentPath(oldFolderPath);
        const newParent = getParentPath(newFolderPath);
        
        if (oldParent === currentPath || newParent === currentPath) {
          await refreshCurrentFolder();
        }
      }
    };

    // Subscribe to events
    const unsubscribeFileRenamed = fileEventBus.on('file.renamed', handleFileRenamed);
    const unsubscribeFolderRenamed = fileEventBus.on('folder.renamed', handleFolderRenamed);
    
    // Also subscribe to file/folder creation and deletion events
    const handleFileCreated = async (event: FileSystemEvent) => {
      const { path: filePath, metadata } = event.payload;
      
      // Skip if path is missing
      if (!filePath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      const parent = getParentPath(filePath);
      if (parent === currentPath) {
        await refreshCurrentFolder();
      }
    };
    
    const handleFileDeleted = async (event: FileSystemEvent) => {
      const { path: filePath, metadata } = event.payload;
      
      // Skip if path is missing
      if (!filePath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      const parent = getParentPath(filePath);
      if (parent === currentPath) {
        await refreshCurrentFolder();
      }
    };
    
    const handleFolderCreated = async (event: FileSystemEvent) => {
      const { path: folderPath, metadata } = event.payload;
      
      // Skip if path is missing
      if (!folderPath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      const folderWithoutSlash = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
      const parent = getParentPath(folderWithoutSlash);
      if (parent === currentPath) {
        await refreshCurrentFolder();
      }
    };
    
    const handleFolderDeleted = async (event: FileSystemEvent) => {
      const { path: folderPath, metadata } = event.payload;
      
      // Skip if path is missing
      if (!folderPath) return;
      
      // Only refresh for remote events (from other tabs)
      const isRemote = metadata && typeof metadata === 'object' && 'isRemote' in metadata && metadata.isRemote === true;
      if (!isRemote) return;
      const folderWithoutSlash = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
      const parent = getParentPath(folderWithoutSlash);
      if (parent === currentPath) {
        await refreshCurrentFolder();
      }
    };
    
    const unsubscribeFileCreated = fileEventBus.on('file.created', handleFileCreated);
    const unsubscribeFileDeleted = fileEventBus.on('file.deleted', handleFileDeleted);
    const unsubscribeFolderCreated = fileEventBus.on('folder.created', handleFolderCreated);
    const unsubscribeFolderDeleted = fileEventBus.on('folder.deleted', handleFolderDeleted);
    
    // Cleanup subscriptions on unmount or when currentPath changes
    return () => {
      unsubscribeFileRenamed();
      unsubscribeFolderRenamed();
      unsubscribeFileCreated();
      unsubscribeFileDeleted();
      unsubscribeFolderCreated();
      unsubscribeFolderDeleted();
    };
  }, [currentPath, navigateToFolder, refreshCurrentFolder]);

  const handleCopy = useCallback((object: R2Object) => {
    handleCopyCommon(object, currentPath);
  }, [handleCopyCommon, currentPath]);
  
  const handleCut = useCallback((object: R2Object) => {
    handleCutCommon(object, currentPath);
  }, [handleCutCommon, currentPath]);

  const checkForConflicts = useCallback(() => {
    const conflicts: Array<{item: {key: string; name: string; isFolder: boolean}; existingKey: string}> = [];
    const currentObjects = filteredObjects;
    
    for (const item of clipboardItems) {
      const itemName = item.name;
      const existingObject = currentObjects.find(obj => {
        const objName = obj.key.split('/').pop() || '';
        return objName === itemName;
      });
      
      if (existingObject) {
        conflicts.push({ item, existingKey: existingObject.key });
      }
    }
    
    return conflicts;
  }, [clipboardItems, filteredObjects]);

  const handlePaste = useCallback(async (skipConflicts?: boolean) => {
    if (!hasClipboardItems()) return;
    
    // Check for conflicts first
    if (!skipConflicts) {
      const conflicts = checkForConflicts();
      if (conflicts.length > 0) {
        setPasteConflicts(conflicts);
        setShowConflictDialog(true);
        return;
      }
    }
    
    try {
      // Use the paste function from useFileOperations
      await paste(currentPath);
      
      // Refresh the current folder
      await refreshCurrentFolder();
      
      // Clear conflicts
      setPasteConflicts([]);
    } catch (error) {
      console.error('Paste failed:', error);
      toast.error(error instanceof Error ? error.message : t('errors.failedToPaste'));
    }
  }, [hasClipboardItems, paste, refreshCurrentFolder, checkForConflicts, currentPath, t]);


  // Sort objects based on current sort settings
  const sortedObjects = React.useMemo(() => {
    const sorted = [...filteredObjects].sort((a, b) => {
      // Always put folders first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let compareValue = 0;
      
      switch (sortBy) {
        case 'name': {
          const aName = a.isFolder 
            ? a.key.replace(/\/$/, '').split('/').pop() || a.key
            : a.key.split('/').pop() || a.key;
          const bName = b.isFolder 
            ? b.key.replace(/\/$/, '').split('/').pop() || b.key
            : b.key.split('/').pop() || b.key;
          compareValue = aName.localeCompare(bName, undefined, { numeric: true });
          break;
        }
        case 'size': {
          compareValue = a.size - b.size;
          break;
        }
        case 'date': {
          compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        }
        case 'type': {
          const aName = a.key.split('/').pop() || a.key;
          const bName = b.key.split('/').pop() || b.key;
          const aType = getFileType(aName).category;
          const bType = getFileType(bName).category;
          compareValue = aType.localeCompare(bType);
          if (compareValue === 0) {
            // If same type, sort by name
            compareValue = aName.localeCompare(bName, undefined, { numeric: true });
          }
          break;
        }
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [filteredObjects, sortBy, sortOrder]);

  const handleBulkCopy = useCallback(() => {
    if (selectedItems.size === 0) return;
    
    const itemsToCopy = sortedObjects
      .filter(obj => selectedItems.has(obj.key))
      .map(obj => ({
        key: obj.key,
        name: obj.key.split('/').pop() || obj.key,
        isFolder: obj.isFolder
      }));
    
    copyToClipboard(itemsToCopy, currentPath);
    toast.success(t('success.copiedToClipboard', { count: itemsToCopy.length }));
  }, [selectedItems, sortedObjects, copyToClipboard, currentPath, t]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search (Ctrl/Cmd + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // Copy (Ctrl/Cmd + C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedItems.size > 0) {
          // Copy multiple selected items
          handleBulkCopy();
        } else if (selectedObject) {
          // Fall back to single item copy
          handleCopy(selectedObject);
        }
      }
      
      // Paste (Ctrl/Cmd + V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && hasClipboardItems() && canPaste(currentPath)) {
        e.preventDefault();
        handlePaste();
      }
      
      // Escape to close search or clear selection
      if (e.key === 'Escape') {
        if (selectedItems.size > 0) {
          setSelectedItems(new Set());
        } else {
          setShowGlobalSearch(false);
        }
      }
      
      // Select all (Ctrl/Cmd + A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allKeys = new Set(sortedObjects.map(obj => obj.key));
        setSelectedItems(allKeys);
      }
      
      // Settings (Ctrl/Cmd + ,)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      
      // Refresh (F5)
      if (e.key === 'F5') {
        e.preventDefault();
        refreshCurrentFolder();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, hasClipboardItems, currentPath, canPaste, handleCopy, handleBulkCopy, handlePaste, setShowGlobalSearch, selectedItems, sortedObjects, refreshCurrentFolder, setShowSettings]);

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIconElement = (object: R2Object, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const filename = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
      : object.key.split('/').pop() || object.key;
    
    const IconComponent = getFileIcon(filename, object.isFolder);
    const fileType = getFileType(filename);
    
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    // Use color from file type for non-folders
    const colorClass = object.isFolder ? 'text-primary' : `file-type-${fileType.category}`;
    
    return <IconComponent className={`${sizeClasses[size]} ${colorClass}`} />;
  };

  const handleObjectAction = (object: R2Object, action: string) => {
    switch (action) {
      case 'download':
        handleDownload(object);
        break;
      case 'preview':
        handlePreview(object);
        break;
      case 'rename':
        setSelectedObject(object);
        setShowRenameDialog(true);
        break;
      case 'delete':
        setSelectedObject(object);
        setShowDeleteDialog(true);
        break;
      case 'open':
        if (object.isFolder) {
          navigateToFolder(object.key).catch(console.error);
        } else {
          handlePreview(object);
        }
        break;
      case 'copy':
        handleCopy(object);
        break;
      case 'cut':
        handleCut(object);
        break;
      case 'paste':
        handlePaste();
        break;
      case 'copyUrl':
        handleCopyUrl(object);
        break;
    }
  };





  const handleDropToCurrentFolder = useCallback(async (draggedItem: DragItem) => {
    const destinationPath = currentPath ? `${currentPath}/${draggedItem.name}` : draggedItem.name;
    
    // Check if destination already exists
    const destinationExists = filteredObjects.some(obj => obj.key === destinationPath || obj.key === `${destinationPath}/`);
    if (destinationExists) {
      toast.error(t('errors.itemAlreadyExists', { name: draggedItem.name }));
      return;
    }
    
    // Perform move operation
    const loadingToast = toast.loading(t('info.movingItem', { name: draggedItem.name }));
    
    try {
      await renameObject(draggedItem.key, destinationPath);
      toast.dismiss(loadingToast);
      toast.success(t('success.movedItem', { name: draggedItem.name }));
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : t('errors.failedToMove'));
    }
  }, [currentPath, filteredObjects, renameObject, t]);

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadManager.uploadFile(file, currentPath, (progress) => {
          toast.info(t('info.uploadingFile', { name: file.name, progress: progress.progress }));
        });
        toast.success(t('success.fileUploaded', { name: file.name }));
      } catch {
        toast.error(t('errors.failedToUpload', { name: file.name }));
      }
    }
    refreshCurrentFolder();
  };

  const toggleSelection = (key: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedItems(newSelection);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setShowBulkDeleteDialog(true);
  };

  const renderFileItem = (object: R2Object, index: number) => {
    const isCut = clipboardOperation === 'cut' && clipboardItems.some(item => item.key === object.key);
    const isInClipboard = clipboardItems.some(item => item.key === object.key);
    const isSelected = selectedItems.has(object.key);
    const filename = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
      : object.key.split('/').pop() || object.key;
    const fileType = getFileType(filename);

    if (viewMode === 'grid') {
      const content = (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ delay: index * 0.03, ...springPresets.gentle }}
          className="relative"
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={`
                  group relative ${densityClasses.gridItemPadding} ${densityClasses.borderRadius} border border-border/50 
                  hover:border-primary/50 hover:shadow-soft transition-all duration-200
                  ${isInClipboard ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-card'}
                  ${isCut ? 'opacity-50' : ''}
                  ${selectedObject?.key === object.key ? 'ring-2 ring-primary' : ''}
                  ${isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
                  hover:scale-[1.02] active:scale-[0.98]
                `}
                onClick={() => setSelectedObject(object)}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(object.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100 bg-background/80 backdrop-blur-sm"
                    aria-label={`Select ${filename}`}
                  />
                </div>
                
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="relative">
                    {getFileIconElement(object, 'lg')}
                    {isInClipboard && (
                      <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                        <Copy className="h-2 w-2 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 w-full">
                    <button
                      className={cn(typography.body(), 'font-medium truncate w-full hover:text-primary transition-colors')}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (object.isFolder) {
                          await navigateToFolder(object.key);
                        } else {
                          handleObjectAction(object, 'open');
                        }
                      }}
                      title={filename}
                    >
                      {filename}
                    </button>
                    <p className="text-[10px] text-muted-foreground">
                      {object.isFolder ? t('common.folder') : formatFileSize(object.size)}
                    </p>
                  </div>
                  
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {renderContextMenuItems(object)}
            </ContextMenuContent>
          </ContextMenu>
        </motion.div>
      );

      // Wrap with appropriate components based on type
      if (object.isFolder) {
        return (
          <DropZone
            key={object.key}
            targetPath={object.key}
            targetObject={object}
          >
            <DraggableWrapper 
              object={object} 
              selected={isSelected}
              selectedCount={selectedItems.size}
            >
              {content}
            </DraggableWrapper>
          </DropZone>
        );
      }

      return (
        <DraggableWrapper 
          key={object.key} 
          object={object}
          selected={isSelected}
          selectedCount={selectedItems.size}
        >
          {content}
        </DraggableWrapper>
      );
    }

    // List view
    const listContent = (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ delay: index * 0.02, ...springPresets.gentle }}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`
                group flex items-center px-2 py-1.5 rounded-lg
                hover:bg-accent/50 transition-all duration-200
                ${isInClipboard ? 'bg-primary/10 border-l-4 border-primary' : ''}
                ${isCut ? 'opacity-50' : ''}
                ${selectedObject?.key === object.key ? 'bg-accent' : ''}
                ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : ''}
              `}
              onClick={() => setSelectedObject(object)}
            >
              {/* Name column - flex-1 to take remaining space */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(object.key)}
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100"
                  aria-label={`Select ${filename}`}
                />
                <div className="flex-shrink-0 w-5">
                  {getFileIconElement(object, 'md')}
                </div>
                <button
                  className={cn('text-left hover:underline truncate block flex-1 font-medium', typography.body())}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (object.isFolder) {
                      await navigateToFolder(object.key);
                    } else {
                      handleObjectAction(object, 'open');
                    }
                  }}
                  title={filename}
                >
                  {filename}
                  {isInClipboard && (
                    <span className="ml-1 text-[10px] text-primary">(copied)</span>
                  )}
                </button>
              </div>
              
              {/* Column alignment matching headers */}
              <div className={cn('flex items-center gap-2', typography.small())}>
                {/* Type column - w-24 */}
                <span className="w-20 text-muted-foreground truncate">
                  {object.isFolder ? t('common.folder') : fileType.description}
                </span>
                
                {/* Size column - w-20 */}
                <span className="w-16 text-muted-foreground text-right">
                  {object.isFolder ? '--' : formatFileSize(object.size)}
                </span>
                
                {/* Modified column - w-28 */}
                <span className="w-24 text-muted-foreground">
                  {format(new Date(object.lastModified), 'MMM dd, yyyy')}
                </span>
              </div>
              
              {/* Actions column - w-20 */}
              <div className="flex items-center gap-1 w-20 justify-end">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {!object.isFolder && (
                    <Tooltip content={t('common.download')}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleObjectAction(object, 'download');
                        }}
                        aria-label={`Download ${filename}`}
                        className="h-6 w-6 p-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Tooltip content={t('fileBrowser.moreActionsTooltip')}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('fileBrowser.moreActions')}
                          className="h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {renderDropdownMenuItems(object)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {renderContextMenuItems(object)}
          </ContextMenuContent>
        </ContextMenu>
      </motion.div>
    );

    // Wrap with appropriate components based on type
    if (object.isFolder) {
      return (
        <DropZone
          key={object.key}
          targetPath={object.key}
          targetObject={object}
        >
          <DraggableWrapper 
            object={object}
            selected={isSelected}
            selectedCount={selectedItems.size}
          >
            {listContent}
          </DraggableWrapper>
        </DropZone>
      );
    }

    return (
      <DraggableWrapper 
        key={object.key} 
        object={object}
        selected={isSelected}
        selectedCount={selectedItems.size}
      >
        {listContent}
      </DraggableWrapper>
    );
  };

  const renderDropdownMenuItems = (object: R2Object) => (
    <>
      {!object.isFolder && (
        <>
          <DropdownMenuItem onClick={() => handlePreview(object)}>
            <Eye className="h-3 w-3 mr-1" />
            {t('common.preview')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload(object)}>
            <Download className="h-3 w-3 mr-1" />
            {t('common.download')}
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem onClick={() => handleCopy(object)}>
        <Clipboard className="h-3 w-3 mr-1" />
        {t('common.copy')}
        <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleCut(object)}>
        <Scissors className="h-3 w-3 mr-1" />
        {t('common.cut')}
        <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
      </DropdownMenuItem>
      {hasClipboardItems() && canPaste(currentPath) && (
        <DropdownMenuItem onClick={() => handlePaste()}>
          <ClipboardPaste className="h-3 w-3 mr-1" />
          {t('contextMenu.pasteItems', { count: clipboardItems.length, operation: 'paste' })}
          <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => {
        setSelectedObject(object);
        setShowRenameDialog(true);
      }}>
        <Edit className="h-3 w-3 mr-1" />
        {t('common.rename')}
        <DropdownMenuShortcut>F2</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          setSelectedObject(object);
          setShowDeleteDialog(true);
        }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        {t('common.delete')}
        <DropdownMenuShortcut>⌦</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );

  const renderContextMenuItems = (object: R2Object) => (
    <UnifiedContextMenu
      object={object}
      currentPath={currentPath}
      context="table"
      onNavigate={object.isFolder ? async () => await navigateToFolder(object.key) : undefined}
      onCreateFolder={object.isFolder ? () => {
        navigateToFolder(object.key);
        setShowCreateFolderDialog(true);
      } : undefined}
    />
  );

  return (
    <div className="h-full bg-background">
      <ResizablePanels
        leftPanel={
          <div className="h-full glass-subtle">
            <R2FileTree
              currentPath={currentPath}
              onNavigate={navigateToFolder}
              className="h-full"
            />
          </div>
        }
        rightPanel={
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="glass-subtle border-b px-3 py-2">
              {/* Breadcrumb Navigation */}
              <div className={cn('flex items-center gap-1 mb-2', typography.small('text-muted-foreground'))}>
                <Tooltip content={t('fileBrowser.goToHome')} delayDuration={800}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => await navigateToFolder('')}
                    className="p-1 hover:bg-accent h-6 w-6"
                    aria-label={t('fileBrowser.goToHome')}
                  >
                    <Home className="h-3 w-3" />
                  </Button>
                </Tooltip>
                {getBreadcrumbs().map((part, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const pathParts = getBreadcrumbs().slice(0, index + 1);
                        const targetPath = pathParts.join('/');
                        await navigateToFolder(targetPath);
                      }}
                      className={cn('px-2 py-0.5 hover:bg-accent font-medium h-6', typography.body())}
                    >
                      {part}
                    </Button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search and Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t('fileBrowser.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn('h-7 bg-background/50 border-muted focus:bg-background transition-colors', typography.body())}
                      style={{ paddingLeft: '28px' }}
                    />
                  </div>
                  <Tooltip content={t('fileBrowser.searchAllFolders')} shortcut="⌘K">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGlobalSearch(true)}
                      className={cn('px-2 h-7 border-muted hover:bg-accent', typography.button())}
                      aria-label={t('fileBrowser.searchAllFolders')}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      {t('fileBrowser.global')}
                      <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
                        ⌘K
                      </kbd>
                    </Button>
                  </Tooltip>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <Tooltip content={t('fileBrowser.refreshCurrentFolder')} shortcut="F5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshCurrentFolder()}
                      className="h-7 px-2 border-muted hover:bg-accent"
                      aria-label={t('fileBrowser.refreshCurrentFolder')}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </Tooltip>
                  
                  {/* Sort Controls */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Tooltip content={t('fileBrowser.sortTooltip', { by: sortBy, order: sortOrder })} delayDuration={800}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2 gap-1 border-muted hover:bg-accent hover:border-accent-foreground transition-colors"
                          aria-label={`Sort by ${sortBy} in ${sortOrder === 'asc' ? 'ascending' : 'descending'} order`}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span className={cn('font-medium', typography.button())}>
                            {sortBy === 'name' && t('fileBrowser.name')}
                            {sortBy === 'size' && t('fileBrowser.size')}
                            {sortBy === 'date' && t('fileBrowser.date')}
                            {sortBy === 'type' && t('fileBrowser.type')}
                          </span>
                          <div
                            key={sortOrder}
                            className="transition-transform duration-200"
                            style={{ transform: `rotate(${sortOrder === 'asc' ? '0deg' : '180deg'})` }}
                          >
                            <SortAsc className="h-3 w-3 text-foreground" />
                          </div>
                        </Button>
                      </Tooltip>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => setSortBy('name')}
                        className={sortBy === 'name' ? 'bg-accent' : ''}
                      >
                        <Type className="h-3 w-3 mr-1" />
                        {t('fileBrowser.sortByName')}
                        {sortBy === 'name' && (
                          <div className="ml-auto scale-100 animate-in zoom-in-50 duration-150">
                            ✓
                          </div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('size')}
                        className={sortBy === 'size' ? 'bg-accent' : ''}
                      >
                        <HardDrive className="h-3 w-3 mr-1" />
                        {t('fileBrowser.sortBySize')}
                        {sortBy === 'size' && (
                          <div className="ml-auto scale-100 animate-in zoom-in-50 duration-150">
                            ✓
                          </div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('date')}
                        className={sortBy === 'date' ? 'bg-accent' : ''}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {t('fileBrowser.sortByDate')}
                        {sortBy === 'date' && (
                          <div className="ml-auto scale-100 animate-in zoom-in-50 duration-150">
                            ✓
                          </div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('type')}
                        className={sortBy === 'type' ? 'bg-accent' : ''}
                      >
                        <FileType className="h-3 w-3 mr-1" />
                        {t('fileBrowser.sortByType')}
                        {sortBy === 'type' && (
                          <div className="ml-auto scale-100 animate-in zoom-in-50 duration-150">
                            ✓
                          </div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortOrder === 'asc' ? (
                          <>
                            <SortDesc className="h-3 w-3 mr-1" />
                            {t('fileBrowser.sortDescending')}
                          </>
                        ) : (
                          <>
                            <SortAsc className="h-3 w-3 mr-1" />
                            {t('fileBrowser.sortAscending')}
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>


                  {/* Action Buttons */}
                  {selectedItems.size > 0 ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-lg"
                      >
                        <span className={cn('font-medium', typography.button())}>
                          {selectedItems.size} selected
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedItems(new Set())}
                          className={cn('h-5 px-1.5', typography.button())}
                        >
                          {t('common.clear')}
                        </Button>
                      </motion.div>
                      <Tooltip content={t('fileBrowser.deleteItemsTooltip')}>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="active-scale"
                          aria-label={t('fileBrowser.deleteItemsTooltip')}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete ({selectedItems.size})
                        </Button>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip content={t('fileBrowser.uploadFilesTooltip')}>
                        <Button
                          onClick={() => setShowUploadDialog(true)}
                          className={cn('h-7 px-2 active-scale shadow-soft hover:shadow-hover hover:bg-accent', typography.button())}
                          aria-label={t('fileBrowser.uploadFilesTooltip')}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('fileBrowser.createFolderTooltip')}>
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateFolderDialog(true)}
                          className={cn('h-7 px-2 active-scale border-muted hover:bg-accent', typography.button())}
                          aria-label={t('fileBrowser.createFolderTooltip')}
                        >
                          <FolderPlus className="h-3 w-3 mr-1" />
                          New Folder
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  
                  {hasClipboardItems() && canPaste(currentPath) && (
                    <div className="animate-in fade-in-0 zoom-in-90 duration-200">
                      <Tooltip content={t('fileBrowser.pasteTooltip', { operation: clipboardOperation || 'paste', count: clipboardItems.length })} shortcut="⌘V">
                        <Button 
                          variant="outline" 
                          onClick={() => handlePaste()}
                          className="active-scale"
                          aria-label={t('fileBrowser.pasteItems', { count: clipboardItems.length })}
                        >
                          <ClipboardPaste className="h-3 w-3 mr-1" />
                          {t('fileBrowser.paste')}
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Settings Button */}
                  <Tooltip content={t('fileBrowser.openSettingsTooltip')} shortcut="⌘,">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="h-7 px-2 border-muted hover:bg-accent"
                      aria-label={t('fileBrowser.openSettingsTooltip')}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* File Content Area */}
            <FileDropZone
              onDrop={handleDropToCurrentFolder}
              onDropFiles={(files) => {
                const fileList = new DataTransfer();
                files.forEach(file => fileList.items.add(file));
                handleFileUpload(fileList.files);
              }}
              currentPath={currentPath}
              className="flex-1 overflow-hidden h-full"
            >
              {(loading || sortedObjects.length === 0) ? (
                <div className="h-full flex items-center justify-center p-3">
                  {loading ? (
                    <div className="text-center space-y-grid-3">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-muted-foreground">Loading files...</p>
                    </div>
                  ) : (
                    <EmptyState
                      type={searchQuery ? 'no-search-results' : 'empty-folder'}
                      searchQuery={searchQuery}
                      onAction={searchQuery ? undefined : () => setShowUploadDialog(true)}
                    />
                  )}
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-3">
                    {/* Column Headers for List View */}
                    {viewMode === 'list' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn('flex items-center px-2 py-1 mb-1 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-20', typography.small('text-muted-foreground'))}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedItems.size === sortedObjects.length && sortedObjects.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const allKeys = new Set(sortedObjects.map(obj => obj.key));
                                setSelectedItems(allKeys);
                              } else {
                                setSelectedItems(new Set());
                              }
                            }}
                            className="mr-1"
                            aria-label={t('fileBrowser.selectAll')}
                          />
                          <div className="w-4" /> {/* Space for icon */}
                          <button
                            className={`flex items-center gap-1 hover:text-foreground transition-colors ${sortBy === 'name' ? 'text-foreground font-medium' : ''}`}
                            onClick={() => {
                              if (sortBy === 'name') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('name');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            {t('fileBrowser.name')}
                            {sortBy === 'name' && (
                              <div
                                key={sortOrder}
                                className="transition-transform duration-200"
                                style={{ transform: `rotate(${sortOrder === 'asc' ? '0deg' : '180deg'})` }}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </button>
                        </div>
                        <div className={cn('flex items-center gap-2', typography.small())}>
                          <button
                            className={`flex items-center gap-1 hover:text-foreground transition-colors w-20 ${sortBy === 'type' ? 'text-foreground font-medium' : ''}`}
                            onClick={() => {
                              if (sortBy === 'type') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('type');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            {t('fileBrowser.type')}
                            {sortBy === 'type' && (
                              <div
                                key={sortOrder}
                                className="transition-transform duration-200"
                                style={{ transform: `rotate(${sortOrder === 'asc' ? '0deg' : '180deg'})` }}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </button>
                          <button
                            className={`flex items-center gap-1 hover:text-foreground transition-colors w-16 ${sortBy === 'size' ? 'text-foreground font-medium' : ''}`}
                            onClick={() => {
                              if (sortBy === 'size') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('size');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            {t('fileBrowser.size')}
                            {sortBy === 'size' && (
                              <div
                                key={sortOrder}
                                className="transition-transform duration-200"
                                style={{ transform: `rotate(${sortOrder === 'asc' ? '0deg' : '180deg'})` }}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </button>
                          <button
                            className={`flex items-center gap-1 hover:text-foreground transition-colors w-24 ${sortBy === 'date' ? 'text-foreground font-medium' : ''}`}
                            onClick={() => {
                              if (sortBy === 'date') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortBy('date');
                                setSortOrder('asc');
                              }
                            }}
                          >
                            {t('fileBrowser.modified')}
                            {sortBy === 'date' && (
                              <div
                                key={sortOrder}
                                className="transition-transform duration-200"
                                style={{ transform: `rotate(${sortOrder === 'asc' ? '0deg' : '180deg'})` }}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </button>
                        </div>
                        <div className="w-20" /> {/* Space for actions */}
                      </motion.div>
                    )}

                    {/* File List */}
                    <div className={viewMode === 'grid' ? densityClasses.gridCols : 'space-y-0.5'}>
                      <AnimatePresence mode="popLayout">
                        {/* Parent Folder Drop Zone - only show if not in root */}
                        {currentPath && (
                          <motion.div
                            key="parent-folder"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={springPresets.gentle}
                            className={viewMode === 'grid' ? 'col-span-full' : ''}
                          >
                            <DropZone
                              targetPath={getParentPath(currentPath)}
                              targetObject={{ key: getParentPath(currentPath), isFolder: true } as R2Object}
                            >
                              <div 
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                                  "hover:bg-accent/50 cursor-pointer group",
                                  "border border-dashed border-muted-foreground/30",
                                  viewMode === 'grid' ? 'justify-center' : ''
                                )}
                                onClick={() => navigateToFolder(getParentPath(currentPath))}
                              >
                                <FolderIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className={cn('group-hover:text-foreground transition-colors', typography.body('text-muted-foreground'))}>
                                  .. ({t('fileBrowser.parentFolder')})
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                              </div>
                            </DropZone>
                          </motion.div>
                        )}
                        {sortedObjects.map((object, index) => renderFileItem(object, index))}
                      </AnimatePresence>
                    </div>

                    {/* Status Bar */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={cn('flex items-center justify-between px-2 py-1.5 mt-2 border-t border-border/50', typography.small('text-muted-foreground'))}
                    >
                      <div>
                        {selectedItems.size > 0 ? (
                          <span className="font-medium text-foreground">
                            {t('fileBrowser.itemsSelected', { count: selectedItems.size })}
                          </span>
                        ) : (
                          <>
                            {t('fileBrowser.itemsCount', { count: sortedObjects.length })}
                            {sortedObjects.filter(o => o.isFolder).length > 0 && (
                              <span> • {t('fileBrowser.folderCount', { count: sortedObjects.filter(o => o.isFolder).length })}</span>
                            )}
                            {sortedObjects.filter(o => !o.isFolder).length > 0 && (
                              <span> • {t('fileBrowser.fileCount', { count: sortedObjects.filter(o => !o.isFolder).length })}</span>
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        {sortedObjects.filter(o => !o.isFolder).length > 0 && (
                          <span>{t('fileBrowser.totalSize', { size: formatFileSize(sortedObjects.filter(o => !o.isFolder).reduce((acc, obj) => acc + obj.size, 0)) })}</span>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </ScrollArea>
              )}
            </FileDropZone>
          </div>
        }
        defaultLeftWidth={280}
        minLeftWidth={240}
        maxLeftWidth={400}
      />

      {/* Dialogs */}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        currentPath={currentPath}
        onUploadComplete={refreshCurrentFolder}
      />
      
      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        currentPath={currentPath}
        onFolderCreated={refreshCurrentFolder}
      />

      {selectedObject && (
        <>
          <RenameDialog
            isOpen={showRenameDialog}
            onClose={() => {
              setShowRenameDialog(false);
              setSelectedObject(null);
            }}
            object={selectedObject}
            onRenamed={refreshCurrentFolder}
          />
          
          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedObject(null);
            }}
            object={selectedObject}
            onDeleted={refreshCurrentFolder}
          />
          
          <FilePreviewDialog
            isOpen={showPreviewDialog}
            onClose={() => {
              setShowPreviewDialog(false);
              setSelectedObject(null);
            }}
            file={selectedObject}
          />
        </>
      )}

      {/* Global Search */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={navigateToFolder}
      />
      
      {/* Paste Conflict Dialog */}
      {showConflictDialog && (
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('fileBrowser.fileConflictsDetected')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className={typography.body()}>
                {t('fileBrowser.conflictMessage', { count: pasteConflicts.length })}:
              </p>
              <ScrollArea className="max-h-48">
                <ul className={cn('space-y-1', typography.body())}>
                  {pasteConflicts.map((conflict, index) => (
                    <li key={index} className="text-muted-foreground">
                      • {conflict.item.name}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <p className={typography.body()}>
                {t('fileBrowser.conflictQuestion')}
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConflictDialog(false);
                  setPasteConflicts([]);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConflictDialog(false);
                  handlePaste(true); // Skip conflicts
                }}
              >
                {t('fileBrowser.skipConflicts')}
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  setShowConflictDialog(false);
                  // Delete existing files first
                  for (const conflict of pasteConflicts) {
                    await fetch(`/api/r2/delete?key=${encodeURIComponent(conflict.existingKey)}`, {
                      method: 'DELETE',
                    });
                  }
                  setPasteConflicts([]);
                  handlePaste(false); // Paste all
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('fileBrowser.replaceAll')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <BulkDeleteDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => {
          setShowBulkDeleteDialog(false);
        }}
        selectedKeys={selectedItems}
        onDeleted={() => {
          setSelectedItems(new Set());
          refreshCurrentFolder();
        }}
      />
      
      {/* Settings Dialog */}
      <SettingsDialog />
      
    </div>
  );
}