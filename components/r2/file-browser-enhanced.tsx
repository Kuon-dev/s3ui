'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Grid,
  List,
} from 'lucide-react';
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
import { R2FileTreeEnhanced as R2FileTree } from './r2-file-tree-enhanced';
import { ResizablePanels } from '@/components/ui/resizable';
import { GlobalSearch } from './global-search';
import { FilePreviewDialog } from './file-preview-dialog';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { stagger } from '@/lib/animations';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface FileBrowserProps {
  initialPath?: string;
}

// File item component with hover animations
function FileItem({ 
  object, 
  index, 
  onNavigate, 
  onAction,
  viewMode = 'list'
}: { 
  object: R2Object; 
  index: number;
  onNavigate: (path: string) => void;
  onAction: (object: R2Object, action: string) => void;
  viewMode: 'list' | 'grid';
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const filename = object.isFolder 
    ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
    : object.key.split('/').pop() || object.key;
    
  const IconComponent = getFileIcon(filename, object.isFolder);
  const fileType = getFileType(filename);
  const colorClass = object.isFolder ? 'text-blue-500' : fileType.iconColor;
  
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
  
  // Hover effect is handled by CSS classes
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (viewMode === 'grid') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={itemRef}
            className="glass-subtle rounded-xl p-4 cursor-pointer transition-all duration-200 opacity-0 hover:shadow-md hover:bg-card/70"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              if (object.isFolder) {
                onNavigate(object.key);
              } else {
                onAction(object, 'open');
              }
            }}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-4 rounded-2xl glass-subtle ${isHovered ? 'scale-105' : ''} transition-transform duration-200`}>
                <IconComponent className={`h-8 w-8 ${colorClass}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                  {filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {object.isFolder ? 'Folder' : formatFileSize(object.size)}
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
          className="group glass-subtle rounded-lg p-4 mb-2 cursor-pointer transition-all duration-200 opacity-0 hover:shadow-md hover:bg-card/70"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (object.isFolder) {
              onNavigate(object.key);
            } else {
              onAction(object, 'open');
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className={`p-2 rounded-lg glass-subtle ${isHovered ? 'scale-105' : ''} transition-transform duration-200`}>
                <IconComponent className={`h-5 w-5 ${colorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate animated-underline">
                  {filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {object.isFolder ? 'Folder' : `${fileType.description} • ${formatFileSize(object.size)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{format(new Date(object.lastModified), 'MMM dd, HH:mm')}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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

// Reusable context menu content
function FileContextMenu({ object, onAction }: { object: R2Object; onAction: (object: R2Object, action: string) => void }) {
  const fileType = getFileType(object.key);
  
  return (
    <ContextMenuContent className="glass">
      <ContextMenuItem onClick={() => onAction(object, 'open')} className="hover-lift">
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
        <ContextMenuItem onClick={() => onAction(object, 'preview')} className="hover-lift">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </ContextMenuItem>
      )}
      
      {!object.isFolder && (
        <ContextMenuItem onClick={() => onAction(object, 'download')} className="hover-lift">
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => onAction(object, 'rename')} className="hover-lift">
        <Edit className="h-4 w-4 mr-2" />
        Rename
      </ContextMenuItem>
      
      <ContextMenuItem onClick={() => onAction(object, 'copyUrl')} className="hover-lift">
        <Copy className="h-4 w-4 mr-2" />
        Copy URL
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => onAction(object, 'properties')} className="hover-lift">
        <Info className="h-4 w-4 mr-2" />
        Properties
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem 
        onClick={() => onAction(object, 'delete')}
        className="text-red-600 focus:text-red-600 hover-lift"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

// Reusable dropdown menu content
function FileDropdownMenu({ object, onAction }: { object: R2Object; onAction: (object: R2Object, action: string) => void }) {
  return (
    <DropdownMenuContent className="glass">
      {!object.isFolder && (
        <>
          <DropdownMenuItem onClick={() => onAction(object, 'preview')} className="hover-lift">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction(object, 'download')} className="hover-lift">
            <Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem onClick={() => onAction(object, 'rename')} className="hover-lift">
        <Edit className="h-4 w-4 mr-2" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onAction(object, 'delete')}
        className="text-red-600 hover-lift"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function FileBrowserEnhanced({ initialPath = '' }: FileBrowserProps) {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState<R2Object | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isDragging, setIsDragging] = useState(false);
  
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  const loadObjects = useCallback(async () => {
    setLoading(true);
    try {
      const apiPrefix = currentPath && !currentPath.endsWith('/') ? `${currentPath}/` : currentPath;
      const response = await fetch(`/api/r2/list?prefix=${encodeURIComponent(apiPrefix)}`);
      const data = await response.json();
      
      if (response.ok) {
        setObjects(data.objects);
      } else {
        toast.error('Failed to load files');
      }
    } catch {
      toast.error('Error loading files');
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    uploadManager.initialize();
    loadObjects();
  }, [currentPath, loadObjects]);

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
      handler: () => setViewMode(prev => prev === 'list' ? 'grid' : 'list'),
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
      handler: () => loadObjects(),
      description: 'Refresh'
    }
  ]);

  const handleNavigate = (path: string) => {
    const displayPath = path.endsWith('/') ? path.slice(0, -1) : path;
    setCurrentPath(displayPath);
  };

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

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
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
          handleNavigate(object.key);
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
    loadObjects();
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full">
      <ResizablePanels
        leftPanel={
          <R2FileTree
            currentPath={currentPath}
            onNavigate={handleNavigate}
            className="h-full"
          />
        }
        rightPanel={
          <div className="h-full flex flex-col space-y-4 p-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('')}
                className="p-1 hover-lift"
              >
                <Home className="h-4 w-4" />
              </Button>
              {getBreadcrumbs().map((part, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="h-4 w-4" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const pathParts = getBreadcrumbs().slice(0, index + 1);
                      const targetPath = pathParts.join('/');
                      handleNavigate(targetPath);
                    }}
                    className="p-1 hover-lift animated-underline"
                  >
                    {part}
                  </Button>
                </React.Fragment>
              ))}
            </div>

            {/* Search and Actions */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search current folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-subtle focus-ring"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGlobalSearch(true)}
                  className="px-3 hover-lift glass-subtle"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Global
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  className="hover-lift"
                >
                  {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="hover-lift glass interactive"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateFolderDialog(true)}
                  className="hover-lift glass-subtle"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
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
                {loading ? (
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
                    {filteredObjects.map((object, index) => (
                      <FileItem
                        key={object.key}
                        object={object}
                        index={index}
                        onNavigate={handleNavigate}
                        onAction={handleObjectAction}
                        viewMode={viewMode}
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

      {/* Dialogs */}
      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        currentPath={currentPath}
        onUploadComplete={loadObjects}
      />
      
      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        currentPath={currentPath}
        onFolderCreated={loadObjects}
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
            onRenamed={loadObjects}
          />
          
          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedObject(null);
            }}
            object={selectedObject}
            onDeleted={loadObjects}
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
        onNavigate={handleNavigate}
      />
    </div>
  );
}

