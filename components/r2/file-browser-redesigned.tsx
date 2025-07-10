'use client';

import React, { useEffect, useCallback } from 'react';
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
  Info,
  FolderOpen,
  Clipboard,
  ClipboardPaste,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Calendar,
  HardDrive,
  Type,
  FileType,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanels } from '@/components/ui/resizable';
import { GlobalSearchEnhanced } from './global-search-enhanced';
import { FilePreviewDialog } from './file-preview-dialog';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { useFileBrowserStore, useFilteredObjects, useIsLoading } from '@/lib/stores/file-browser-store';
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';
import { EmptyState } from './empty-state';
import { R2FileTreeGlassmorphism } from './r2-file-tree-glassmorphism';
import { UploadDialogEnhanced } from './upload-dialog-enhanced';
import { EnhancedTooltip } from '@/components/ui/tooltip-enhanced';
import { FloatingActionButton } from './floating-action-button';

interface FileBrowserProps {
  initialPath?: string;
}

export function FileBrowserRedesigned({ initialPath = '' }: FileBrowserProps) {
  const {
    currentPath,
    searchQuery,
    selectedObject,
    clipboardItem,
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
    copyToClipboard,
    pasteFromClipboard,
    canPaste,
  } = useFileBrowserStore();

  const filteredObjects = useFilteredObjects();
  const loading = useIsLoading(`objects-${currentPath}`);
  const [viewMode] = React.useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = React.useState<'name' | 'size' | 'date' | 'type'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    uploadManager.initialize();
    if (initialPath && initialPath !== currentPath) {
      setCurrentPath(initialPath);
    } else {
      loadObjects(currentPath);
    }
  }, [initialPath, currentPath, setCurrentPath, loadObjects]);

  // Clear selection when changing paths
  useEffect(() => {
    setSelectedItems(new Set());
  }, [currentPath]);

  const handleCopy = useCallback((object: R2Object) => {
    const name = object.key.split('/').pop() || object.key;
    copyToClipboard(object.key, name, object.isFolder);
  }, [copyToClipboard]);

  const handlePaste = useCallback(async () => {
    if (!clipboardItem) return;
    
    try {
      await pasteFromClipboard(currentPath);
    } catch (error) {
      console.error('Paste failed:', error);
    }
  }, [clipboardItem, pasteFromClipboard, currentPath]);

  const handleDownload = async (object: R2Object) => {
    try {
      const response = await fetch(`/api/r2/download?key=${encodeURIComponent(object.key)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = object.key.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else {
        toast.error('Failed to download file');
      }
    } catch {
      toast.error('Error downloading file');
    }
  };

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search (Ctrl/Cmd + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // Copy (Ctrl/Cmd + C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedObject) {
        e.preventDefault();
        handleCopy(selectedObject);
      }
      
      // Paste (Ctrl/Cmd + V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboardItem && canPaste(currentPath)) {
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
      
      // Refresh (F5)
      if (e.key === 'F5') {
        e.preventDefault();
        refreshCurrentFolder();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, clipboardItem, currentPath, canPaste, handleCopy, handlePaste, setShowGlobalSearch, selectedItems, sortedObjects, refreshCurrentFolder]);

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
    setSelectedObject(object);
    switch (action) {
      case 'download':
        handleDownload(object);
        break;
      case 'preview':
        setShowPreviewDialog(true);
        break;
      case 'rename':
        setShowRenameDialog(true);
        break;
      case 'delete':
        setShowDeleteDialog(true);
        break;
      case 'open':
        if (object.isFolder) {
          navigateToFolder(object.key).catch(console.error);
        } else {
          setShowPreviewDialog(true);
        }
        break;
      case 'copy':
        handleCopy(object);
        break;
      case 'paste':
        handlePaste();
        break;
      case 'copyUrl':
        handleCopyUrl(object);
        break;
      case 'properties':
        handleShowProperties(object);
        break;
    }
  };


  const handleCopyUrl = async (object: R2Object) => {
    try {
      const url = `${window.location.origin}/api/r2/preview?key=${encodeURIComponent(object.key)}`;
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleShowProperties = (object: R2Object) => {
    const filename = object.key.split('/').pop() || object.key;
    const fileType = getFileType(filename);
    
    const properties = [
      `Name: ${filename}`,
      `Type: ${fileType.description}`,
      `Size: ${object.isFolder ? 'Folder' : formatFileSize(object.size)}`,
      `Modified: ${format(new Date(object.lastModified), 'PPpp')}`,
      `Path: ${object.key}`,
      `Previewable: ${fileType.previewable ? 'Yes' : 'No'}`,
    ].join('\n');
    
    toast.info(properties, {
      duration: 5000,
    });
  };


  const handleDropToCurrentFolder = useCallback(async (draggedItem: DragItem) => {
    const destinationPath = currentPath ? `${currentPath}/${draggedItem.name}` : draggedItem.name;
    
    // Check if destination already exists
    const destinationExists = filteredObjects.some(obj => obj.key === destinationPath || obj.key === `${destinationPath}/`);
    if (destinationExists) {
      toast.error(`A file or folder named "${draggedItem.name}" already exists in this location`);
      return;
    }
    
    // Perform move operation
    const loadingToast = toast.loading(`Moving "${draggedItem.name}"...`);
    
    try {
      await renameObject(draggedItem.key, destinationPath);
      toast.dismiss(loadingToast);
      toast.success(`Successfully moved "${draggedItem.name}"`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Failed to move file');
    }
  }, [currentPath, filteredObjects, renameObject]);

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadManager.uploadFile(file, currentPath, (progress) => {
          toast.info(`Uploading ${file.name}: ${progress.progress}%`);
        });
        toast.success(`${file.name} uploaded successfully`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
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

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    const confirmMessage = `Are you sure you want to delete ${count} ${count === 1 ? 'item' : 'items'}?`;
    
    if (!confirm(confirmMessage)) return;
    
    const loadingToast = toast.loading(`Deleting ${count} ${count === 1 ? 'item' : 'items'}...`);
    
    try {
      // Delete all selected items
      for (const key of selectedItems) {
        const response = await fetch(`/api/r2/delete?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`Failed to delete ${key}`);
        }
      }
      
      toast.dismiss(loadingToast);
      toast.success(`Successfully deleted ${count} ${count === 1 ? 'item' : 'items'}`);
      setSelectedItems(new Set());
      refreshCurrentFolder();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Failed to delete items');
    }
  };

  const renderFileItem = (object: R2Object, index: number) => {
    const isCopied = clipboardItem?.path === object.key;
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
                  group relative p-2.5 rounded-lg border border-border/50 
                  hover:border-primary/50 hover:shadow-soft transition-all duration-200
                  ${isCopied ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-card'}
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
                    {isCopied && (
                      <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                        <Copy className="h-2 w-2 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 w-full">
                    <button
                      className="text-xs font-medium truncate w-full hover:text-primary transition-colors"
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
                      {object.isFolder ? 'Folder' : formatFileSize(object.size)}
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
            <DraggableWrapper object={object}>
              {content}
            </DraggableWrapper>
          </DropZone>
        );
      }

      return (
        <DraggableWrapper key={object.key} object={object}>
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
                ${isCopied ? 'bg-primary/10 border-l-4 border-primary' : ''}
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
                  className="text-left hover:underline truncate block flex-1 font-medium text-xs"
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
                  {isCopied && (
                    <span className="ml-1 text-[10px] text-primary">(copied)</span>
                  )}
                </button>
              </div>
              
              {/* Column alignment matching headers */}
              <div className="flex items-center gap-2 text-xs">
                {/* Type column - w-24 */}
                <span className="w-20 text-muted-foreground truncate">
                  {object.isFolder ? 'Folder' : fileType.description}
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
                    <EnhancedTooltip content="Download">
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
                    </EnhancedTooltip>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <EnhancedTooltip content="More actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="More actions"
                          className="h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </EnhancedTooltip>
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
          <DraggableWrapper object={object}>
            {listContent}
          </DraggableWrapper>
        </DropZone>
      );
    }

    return (
      <DraggableWrapper key={object.key} object={object}>
        {listContent}
      </DraggableWrapper>
    );
  };

  const renderDropdownMenuItems = (object: R2Object) => (
    <>
      {!object.isFolder && (
        <>
          <DropdownMenuItem onClick={() => handleObjectAction(object, 'preview')}>
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleObjectAction(object, 'download')}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem onClick={() => handleObjectAction(object, 'copy')}>
        <Clipboard className="h-3 w-3 mr-1" />
        Copy
      </DropdownMenuItem>
      {clipboardItem && canPaste(currentPath) && (
        <DropdownMenuItem onClick={() => handleObjectAction(object, 'paste')}>
          <ClipboardPaste className="h-3 w-3 mr-1" />
          Paste
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => handleObjectAction(object, 'rename')}>
        <Edit className="h-3 w-3 mr-1" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleObjectAction(object, 'delete')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </DropdownMenuItem>
    </>
  );

  const renderContextMenuItems = (object: R2Object) => (
    <>
      <ContextMenuItem onClick={() => handleObjectAction(object, 'open')}>
        {object.isFolder ? (
          <>
            <FolderOpen className="h-3 w-3 mr-1" />
            Open Folder
          </>
        ) : (
          <>
            <Eye className="h-3 w-3 mr-1" />
            Open
          </>
        )}
      </ContextMenuItem>
      
      {!object.isFolder && getFileType(object.key).previewable && (
        <ContextMenuItem onClick={() => handleObjectAction(object, 'preview')}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </ContextMenuItem>
      )}
      
      {!object.isFolder && (
        <ContextMenuItem onClick={() => handleObjectAction(object, 'download')}>
          <Download className="h-3 w-3 mr-1" />
          Download
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => handleObjectAction(object, 'copy')}>
        <Clipboard className="h-3 w-3 mr-1" />
        Copy
      </ContextMenuItem>
      
      {clipboardItem && canPaste(currentPath) && (
        <ContextMenuItem onClick={() => handleObjectAction(object, 'paste')}>
          <ClipboardPaste className="h-3 w-3 mr-1" />
          Paste &quot;{clipboardItem.name}&quot; here
        </ContextMenuItem>
      )}
      
      <ContextMenuItem onClick={() => handleObjectAction(object, 'rename')}>
        <Edit className="h-3 w-3 mr-1" />
        Rename
      </ContextMenuItem>
      
      <ContextMenuItem onClick={() => handleObjectAction(object, 'copyUrl')}>
        <Copy className="h-3 w-3 mr-1" />
        Copy URL
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => handleObjectAction(object, 'properties')}>
        <Info className="h-3 w-3 mr-1" />
        Properties
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onClick={() => handleObjectAction(object, 'delete')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </ContextMenuItem>
    </>
  );

  return (
    <div className="h-full bg-background">
      <ResizablePanels
        leftPanel={
          <div className="h-full glass-subtle">
            <R2FileTreeGlassmorphism
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
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <EnhancedTooltip content="Go to home" delayDuration={800}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => await navigateToFolder('')}
                    className="p-1 hover:bg-accent h-6 w-6"
                    aria-label="Navigate to home"
                  >
                    <Home className="h-3 w-3" />
                  </Button>
                </EnhancedTooltip>
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
                      className="px-2 py-0.5 hover:bg-accent font-medium text-xs h-6"
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
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search in current folder..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-7 bg-background/50 border-muted focus:bg-background transition-colors text-xs"
                    />
                  </div>
                  <EnhancedTooltip content="Search all folders" shortcut="⌘K">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGlobalSearch(true)}
                      className="px-2 h-7 border-muted hover:bg-accent text-xs"
                      aria-label="Global search"
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Global
                      <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
                        ⌘K
                      </kbd>
                    </Button>
                  </EnhancedTooltip>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <EnhancedTooltip content="Refresh current folder" shortcut="F5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshCurrentFolder}
                      className="h-7 px-2 border-muted hover:bg-accent"
                      aria-label="Refresh folder"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </EnhancedTooltip>
                  
                  {/* Sort Controls */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <EnhancedTooltip content={`Sort by ${sortBy} (${sortOrder === 'asc' ? 'ascending' : 'descending'}) - Click to change`} delayDuration={800}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2 gap-1 border-muted hover:bg-accent hover:border-accent-foreground transition-colors"
                          aria-label={`Sort by ${sortBy} in ${sortOrder === 'asc' ? 'ascending' : 'descending'} order`}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {sortBy === 'name' && 'Name'}
                            {sortBy === 'size' && 'Size'}
                            {sortBy === 'date' && 'Date'}
                            {sortBy === 'type' && 'Type'}
                          </span>
                          <motion.div
                            key={sortOrder}
                            initial={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
                            animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                            transition={springPresets.snappy}
                          >
                            <SortAsc className="h-3 w-3 text-foreground" />
                          </motion.div>
                        </Button>
                      </EnhancedTooltip>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => setSortBy('name')}
                        className={sortBy === 'name' ? 'bg-accent' : ''}
                      >
                        <Type className="h-3 w-3 mr-1" />
                        Sort by Name
                        {sortBy === 'name' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            ✓
                          </motion.div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('size')}
                        className={sortBy === 'size' ? 'bg-accent' : ''}
                      >
                        <HardDrive className="h-3 w-3 mr-1" />
                        Sort by Size
                        {sortBy === 'size' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            ✓
                          </motion.div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('date')}
                        className={sortBy === 'date' ? 'bg-accent' : ''}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Sort by Date
                        {sortBy === 'date' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            ✓
                          </motion.div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('type')}
                        className={sortBy === 'type' ? 'bg-accent' : ''}
                      >
                        <FileType className="h-3 w-3 mr-1" />
                        Sort by Type
                        {sortBy === 'type' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            ✓
                          </motion.div>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortOrder === 'asc' ? (
                          <>
                            <SortDesc className="h-3 w-3 mr-1" />
                            Sort Descending
                          </>
                        ) : (
                          <>
                            <SortAsc className="h-3 w-3 mr-1" />
                            Sort Ascending
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
                        <span className="text-xs font-medium">
                          {selectedItems.size} selected
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedItems(new Set())}
                          className="h-5 px-1.5 text-xs"
                        >
                          Clear
                        </Button>
                      </motion.div>
                      <EnhancedTooltip content="Delete selected items">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="active-scale"
                          aria-label="Delete selected"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete ({selectedItems.size})
                        </Button>
                      </EnhancedTooltip>
                    </>
                  ) : (
                    <>
                      <EnhancedTooltip content="Upload files to current folder">
                        <Button
                          onClick={() => setShowUploadDialog(true)}
                          className="h-7 px-2 active-scale shadow-soft hover:shadow-hover hover:bg-accent text-xs"
                          aria-label="Upload files"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </EnhancedTooltip>
                      <EnhancedTooltip content="Create a new folder">
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateFolderDialog(true)}
                          className="h-7 px-2 active-scale border-muted hover:bg-accent text-xs"
                          aria-label="Create new folder"
                        >
                          <FolderPlus className="h-3 w-3 mr-1" />
                          New Folder
                        </Button>
                      </EnhancedTooltip>
                    </>
                  )}
                  
                  <AnimatePresence>
                    {clipboardItem && canPaste(currentPath) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={springPresets.snappy}
                      >
                        <EnhancedTooltip content={`Paste "${clipboardItem.name}" here`} shortcut="⌘V">
                          <Button 
                            variant="outline" 
                            onClick={handlePaste}
                            className="active-scale"
                            aria-label={`Paste ${clipboardItem.name}`}
                          >
                            <ClipboardPaste className="h-3 w-3 mr-1" />
                            Paste
                          </Button>
                        </EnhancedTooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-grid-3">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-muted-foreground">Loading files...</p>
                    </div>
                  </div>
                ) : sortedObjects.length === 0 ? (
                  <EmptyState
                    type={searchQuery ? 'no-search-results' : 'empty-folder'}
                    searchQuery={searchQuery}
                    onAction={searchQuery ? undefined : () => setShowUploadDialog(true)}
                  />
                ) : (
                  <div>
                    {/* Column Headers for List View */}
                    {viewMode === 'list' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center px-2 py-1 mb-1 border-b border-border/50 text-xs text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-sm z-20"
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
                            aria-label="Select all"
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
                            Name
                            {sortBy === 'name' && (
                              <motion.div
                                key={sortOrder}
                                initial={{ rotate: 0 }}
                                animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                                transition={springPresets.snappy}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </motion.div>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
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
                            Type
                            {sortBy === 'type' && (
                              <motion.div
                                key={sortOrder}
                                initial={{ rotate: 0 }}
                                animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                                transition={springPresets.snappy}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </motion.div>
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
                            Size
                            {sortBy === 'size' && (
                              <motion.div
                                key={sortOrder}
                                initial={{ rotate: 0 }}
                                animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                                transition={springPresets.snappy}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </motion.div>
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
                            Modified
                            {sortBy === 'date' && (
                              <motion.div
                                key={sortOrder}
                                initial={{ rotate: 0 }}
                                animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                                transition={springPresets.snappy}
                              >
                                <SortAsc className="h-2.5 w-2.5" />
                              </motion.div>
                            )}
                          </button>
                        </div>
                        <div className="w-20" /> {/* Space for actions */}
                      </motion.div>
                    )}

                    {/* File List */}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5' : 'space-y-0.5'}>
                      <AnimatePresence mode="popLayout">
                        {sortedObjects.map((object, index) => renderFileItem(object, index))}
                      </AnimatePresence>
                    </div>

                    {/* Status Bar */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between px-2 py-1.5 mt-2 border-t border-border/50 text-xs text-muted-foreground"
                    >
                      <div>
                        {selectedItems.size > 0 ? (
                          <span className="font-medium text-foreground">
                            {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
                          </span>
                        ) : (
                          <>
                            {sortedObjects.length} {sortedObjects.length === 1 ? 'item' : 'items'}
                            {sortedObjects.filter(o => o.isFolder).length > 0 && (
                              <span> • {sortedObjects.filter(o => o.isFolder).length} {sortedObjects.filter(o => o.isFolder).length === 1 ? 'folder' : 'folders'}</span>
                            )}
                            {sortedObjects.filter(o => !o.isFolder).length > 0 && (
                              <span> • {sortedObjects.filter(o => !o.isFolder).length} {sortedObjects.filter(o => !o.isFolder).length === 1 ? 'file' : 'files'}</span>
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        {sortedObjects.filter(o => !o.isFolder).length > 0 && (
                          <span>Total size: {formatFileSize(sortedObjects.filter(o => !o.isFolder).reduce((acc, obj) => acc + obj.size, 0))}</span>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
                </div>
              </ScrollArea>
            </FileDropZone>
          </div>
        }
        defaultLeftWidth={280}
        minLeftWidth={240}
        maxLeftWidth={400}
      />

      {/* Dialogs */}
      <UploadDialogEnhanced
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
      <GlobalSearchEnhanced
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={navigateToFolder}
      />
      
      {/* Floating Action Button */}
      <FloatingActionButton
        onUpload={() => setShowUploadDialog(true)}
        onCreateFolder={() => setShowCreateFolderDialog(true)}
      />
    </div>
  );
}