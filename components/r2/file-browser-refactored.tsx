'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Download,
  Eye,
  Search,
  Copy,
  Info,
  FolderOpen,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';
import { R2Object } from '@/lib/r2/operations';
import { uploadManager } from '@/lib/service-worker/upload-manager';
import { UploadDialog } from './upload-dialog';
import { CreateFolderDialog } from './create-folder-dialog';
import { RenameDialog } from './rename-dialog';
import { DeleteDialog } from './delete-dialog';
import { Input } from '@/components/ui/input';
import { R2FileTreeRefactored as R2FileTree } from './r2-file-tree-refactored';
import { ResizablePanels } from '@/components/ui/resizable';
import { GlobalSearch } from './global-search';
import { FilePreviewDialog } from './file-preview-dialog';
import { getFileIcon, getFileType, FileCategory } from '@/lib/utils/file-types';
import { stagger } from '@/lib/animations';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useR2Objects, r2QueryKeys } from '@/lib/hooks/use-r2-queries';
import { useQueryClient } from '@tanstack/react-query';
import { UtilityHeader } from './utility-header';
import { cn } from '@/lib/utils';

interface FileBrowserProps {
  initialPath?: string;
}

// File item component remains the same but uses zustand store
function FileItem({ 
  object, 
  index, 
  onAction,
}: { 
  object: R2Object; 
  index: number;
  onAction: (object: R2Object, action: string) => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  
  const { setCurrentPath, viewMode } = useFileBrowserStore();
  
  useEffect(() => {
    if (!itemRef.current) return;
    
    // Reset animation
    itemRef.current.classList.remove('animate-fade-in');
    itemRef.current.style.opacity = '0';
    
    // Force reflow
    void itemRef.current.offsetHeight;
    
    // Set initial state and add staggered animation
    itemRef.current.style.animationDelay = `${stagger(index, 0.03)}s`;
    itemRef.current.classList.add('animate-fade-in');
  }, [index, viewMode]);
  
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 B';
    if (isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (object.isFolder) {
      // Remove trailing slash for consistent path handling
      const cleanPath = object.key.replace(/\/+$/, '');
      setCurrentPath(cleanPath);
    } else {
      onAction(object, 'open');
    }
  }, [object, setCurrentPath, onAction]);
  
  // Ensure object.key exists and is a string
  if (!object.key || typeof object.key !== 'string') {
    console.error('Invalid object key:', object);
    return null;
  }

  const filename = object.isFolder 
    ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
    : object.key.split('/').pop() || object.key;
    
  const IconComponent = getFileIcon(filename, object.isFolder);
  const fileType = getFileType(filename);
  const colorClass = object.isFolder ? 'text-blue-500' : fileType.iconColor;
  
  const isImage = fileType.category === FileCategory.IMAGE;
  
  if (viewMode === 'grid') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={itemRef}
            className="glass-subtle rounded-xl p-4 cursor-pointer transition-all duration-200 opacity-0 hover:shadow-md hover:bg-card/70"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={cn(
                "rounded-2xl glass-subtle transition-transform duration-200 overflow-hidden",
                isHovered && "scale-105",
                isImage ? "w-24 h-24" : "p-4"
              )}>
                {isImage && !object.isFolder ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={`/api/r2/preview?key=${encodeURIComponent(object.key)}`}
                      alt={filename}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const iconContainer = target.parentElement?.querySelector('.icon-fallback');
                        if (iconContainer) {
                          iconContainer.classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="icon-fallback hidden absolute inset-0 flex items-center justify-center">
                      <IconComponent className={`h-8 w-8 ${colorClass}`} />
                    </div>
                  </div>
                ) : (
                  <IconComponent className={`h-8 w-8 ${colorClass}`} />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground truncate max-w-[120px]" title={filename}>
                  {filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {object.isFolder ? 'Folder' : formatFileSize(object.size || 0)}
                </p>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <FileContextMenu object={object} onAction={onAction} />
      </ContextMenu>
    );
  }
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={itemRef}
          className="group glass-subtle rounded-lg p-4 mb-2 cursor-pointer transition-all duration-200 hover:bg-accent/50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className={cn(
                "rounded-lg glass-subtle transition-transform duration-200 overflow-hidden",
                isHovered && "scale-105",
                isImage ? "w-12 h-12" : "p-2"
              )}>
                {isImage && !object.isFolder ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={`/api/r2/preview?key=${encodeURIComponent(object.key)}`}
                      alt={filename}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const iconContainer = target.parentElement?.querySelector('.icon-fallback');
                        if (iconContainer) {
                          iconContainer.classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="icon-fallback hidden absolute inset-0 flex items-center justify-center">
                      <IconComponent className={`h-5 w-5 ${colorClass}`} />
                    </div>
                  </div>
                ) : (
                  <IconComponent className={`h-5 w-5 ${colorClass}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {object.isFolder ? 'Folder' : `${fileType.description} • ${formatFileSize(object.size || 0)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{object.lastModified ? format(new Date(object.lastModified), 'MMM dd, HH:mm') : '-'}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <FileDropdownMenu object={object} onAction={onAction} />
              </DropdownMenu>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <FileContextMenu object={object} onAction={onAction} />
    </ContextMenu>
  );
}

// Context menu components remain the same
function FileContextMenu({ object, onAction }: { object: R2Object; onAction: (object: R2Object, action: string) => void }) {
  const fileType = getFileType(object.key);
  
  return (
    <ContextMenuContent className="glass">
      <ContextMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'open');
        }} 
        className="hover-lift"
      >
        {object.isFolder ? (
          <>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Folder
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Open
          </>
        )}
      </ContextMenuItem>
      
      {!object.isFolder && fileType.previewable && (
        <ContextMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onAction(object, 'preview');
          }} 
          className="hover-lift"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </ContextMenuItem>
      )}
      
      {!object.isFolder && (
        <ContextMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onAction(object, 'download');
          }} 
          className="hover-lift"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'rename');
        }} 
        className="hover-lift"
      >
        <Edit className="h-4 w-4 mr-2" />
        Rename
      </ContextMenuItem>
      
      <ContextMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'copyUrl');
        }} 
        className="hover-lift"
      >
        <Copy className="h-4 w-4 mr-2" />
        Copy URL
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'properties');
        }} 
        className="hover-lift"
      >
        <Info className="h-4 w-4 mr-2" />
        Properties
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'delete');
        }}
        className="text-red-600 focus:text-red-600 hover-lift"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

function FileDropdownMenu({ object, onAction }: { object: R2Object; onAction: (object: R2Object, action: string) => void }) {
  return (
    <DropdownMenuContent className="glass">
      {!object.isFolder && (
        <>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onAction(object, 'preview');
            }} 
            className="hover-lift"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onAction(object, 'download');
            }} 
            className="hover-lift"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem 
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'rename');
        }} 
        className="hover-lift"
      >
        <Edit className="h-4 w-4 mr-2" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          onAction(object, 'delete');
        }}
        className="text-red-600 hover-lift"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function FileBrowserRefactored({ initialPath = '' }: FileBrowserProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);
  
  // Zustand store
  const {
    currentPath,
    setCurrentPath,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    isDragging,
    setIsDragging,
    selectedObject,
    setSelectedObject,
    showUploadDialog,
    setShowUploadDialog,
    showCreateFolderDialog,
    setShowCreateFolderDialog,
    showRenameDialog,
    setShowRenameDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    showGlobalSearch,
    setShowGlobalSearch,
  } = useFileBrowserStore();
  
  // React Query
  const { data: objects = [], isLoading, refetch } = useR2Objects(currentPath);
  const queryClient = useQueryClient();
  
  // Enhanced refresh function that also refreshes sidebar
  const refreshAll = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: r2QueryKeys.all });
  }, [refetch, queryClient]);
  
  // Initialize path
  useEffect(() => {
    if (initialPath) {
      setCurrentPath(initialPath);
    }
  }, [initialPath, setCurrentPath]);
  
  useEffect(() => {
    uploadManager.initialize();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      handler: () => setShowGlobalSearch(true),
      description: 'Global search'
    },
    {
      key: 'n',
      ctrl: true,
      handler: () => setShowCreateFolderDialog(true),
      description: 'New folder'
    },
    {
      key: 'u',
      ctrl: true,
      handler: () => setShowUploadDialog(true),
      description: 'Upload files'
    },
    {
      key: 'g',
      ctrl: true,
      handler: () => setViewMode(viewMode === 'list' ? 'grid' : 'list'),
      description: 'Toggle view mode'
    },
    {
      key: 'Escape',
      handler: () => {
        setShowGlobalSearch(false);
        setShowUploadDialog(false);
        setShowCreateFolderDialog(false);
        setShowRenameDialog(false);
        setShowDeleteDialog(false);
        setShowPreviewDialog(false);
      },
      description: 'Close dialogs'
    },
    {
      key: 'r',
      ctrl: true,
      handler: () => refreshAll(),
      description: 'Refresh'
    }
  ]);

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


  const filteredObjects = objects.filter(object => {
    if (!searchQuery) return true;
    const name = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || ''
      : object.key.split('/').pop() || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          // Remove trailing slash for consistent path handling
          const cleanPath = object.key.replace(/\/+$/, '');
          setCurrentPath(cleanPath);
        } else {
          setShowPreviewDialog(true);
        }
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

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) {
      toast.error('No files selected');
      return;
    }

    // Validate files before upload
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!file || !(file instanceof File)) {
        toast.error('Invalid file detected');
        continue;
      }
      if (!file.name || typeof file.name !== 'string') {
        toast.error('File with invalid name detected');
        continue;
      }
      if (file.size === 0) {
        toast.error(`File "${file.name}" is empty`);
        continue;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large (max 100MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      toast.error('No valid files to upload');
      return;
    }

    for (const file of validFiles) {
      try {
        await uploadManager.uploadFile(file, currentPath, (progress) => {
          toast.info(`Uploading ${file.name}: ${progress.progress}%`);
        });
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }
    refreshAll();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 B';
    if (isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Utility Header */}
      <div className="flex-shrink-0 p-4">
        <UtilityHeader />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanels
          leftPanel={
            <R2FileTree className="h-full" />
          }
          rightPanel={
            <div className="h-full flex flex-col space-y-4 p-6">
              {/* Search Bar */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search current folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-subtle focus-ring"
                  />
                </div>
              </div>

            {/* File List */}
            <div
              ref={dropZoneRef}
              className={`flex-1 rounded-2xl overflow-hidden transition-all duration-200 ${
                isDragging ? 'glass scale-[1.02]' : 'glass-subtle'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div ref={fileListRef} className="h-full overflow-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground animate-pulse">Loading files...</p>
                    </div>
                  </div>
                ) : filteredObjects.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">
                        {searchQuery ? 'No files or folders match your search.' : 'No files or folders found.'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop files here or use the upload button.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : ''}>
                    {filteredObjects
                      .filter(object => object && object.key && typeof object.key === 'string')
                      .map((object, index) => (
                        <FileItem
                          key={object.key}
                          object={object}
                          index={index}
                          onAction={handleObjectAction}
                        />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
          defaultLeftWidth={280}
          minLeftWidth={220}
          maxLeftWidth={400}
        />
      </div>

      {/* Dialogs */}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        currentPath={currentPath}
        onUploadComplete={refreshAll}
      />
      
      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        currentPath={currentPath}
        onFolderCreated={refreshAll}
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
            onRenamed={refreshAll}
          />
          
          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedObject(null);
            }}
            object={selectedObject}
            onDeleted={refreshAll}
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
        onNavigate={setCurrentPath}
      />
    </div>
  );
}