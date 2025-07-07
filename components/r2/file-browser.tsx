'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { R2Object } from '@/lib/r2/operations';
import { uploadManager } from '@/lib/service-worker/upload-manager';
import { UploadDialog } from './upload-dialog';
import { CreateFolderDialog } from './create-folder-dialog';
import { RenameDialog } from './rename-dialog';
import { DeleteDialog } from './delete-dialog';
import { Input } from '@/components/ui/input';
import { R2FileTree } from './r2-file-tree';
import { ResizablePanels } from '@/components/ui/resizable';
import { GlobalSearch } from './global-search';
import { FilePreviewDialog } from './file-preview-dialog';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { useClipboard } from '@/lib/contexts/clipboard-context';

interface FileBrowserProps {
  initialPath?: string;
}

export function FileBrowser({ initialPath = '' }: FileBrowserProps) {
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
  const { clipboardItem, copy, paste, canPaste } = useClipboard();

  const loadObjects = useCallback(async () => {
    setLoading(true);
    try {
      // For API calls, ensure folder paths end with '/' for proper prefix matching
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
      
      // Escape to close search
      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, clipboardItem, currentPath, canPaste, handleCopy, handlePaste]);

  const handleNavigate = (path: string) => {
    // For navigation, we always store paths without trailing slashes in state
    // The trailing slash will be added when making API calls in loadObjects
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIconElement = (object: R2Object) => {
    const filename = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
      : object.key.split('/').pop() || object.key;
    
    const IconComponent = getFileIcon(filename, object.isFolder);
    const fileType = getFileType(filename);
    
    // Use color from file type for non-folders
    const colorClass = object.isFolder ? 'text-blue-500' : fileType.iconColor;
    
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
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
          handleNavigate(object.key);
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

  const handleCopy = useCallback((object: R2Object) => {
    const name = object.key.split('/').pop() || object.key;
    copy(object.key, name, object.isFolder);
  }, [copy]);

  const handlePaste = useCallback(async () => {
    if (!clipboardItem) return;
    
    try {
      await paste(currentPath);
      await loadObjects();
    } catch (error) {
      console.error('Paste failed:', error);
    }
  }, [clipboardItem, paste, currentPath, loadObjects]);

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
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
          <div className="h-full flex flex-col space-y-4 p-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('')}
                className="p-1"
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
                    className="p-1"
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search current folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGlobalSearch(true)}
                  className="px-3"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Global
                  <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    ⌘K
                  </kbd>
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                {clipboardItem && canPaste(currentPath) && (
                  <Button 
                    variant="outline" 
                    onClick={handlePaste}
                    title={`Paste "${clipboardItem.name}" here`}
                  >
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Paste
                  </Button>
                )}
              </div>
            </div>

            {/* File Table */}
            <div
              className="flex-1 border border-gray-800 rounded-lg bg-gray-900 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredObjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          {searchQuery ? 'No files or folders match your search.' : 'No files or folders found. Drag and drop files here or use the upload button.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredObjects.map((object) => {
                        const isCopied = clipboardItem?.path === object.key;
                        return (
                          <ContextMenu key={object.key}>
                            <ContextMenuTrigger asChild>
                              <TableRow 
                                className={`cursor-pointer ${isCopied ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''}`}
                                onClick={() => setSelectedObject(object)}
                              >
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getFileIconElement(object)}
                                    <button
                                      className="text-left hover:underline"
                                      onClick={() => {
                                        if (object.isFolder) {
                                          handleNavigate(object.key);
                                        } else {
                                          handleObjectAction(object, 'open');
                                        }
                                      }}
                                    >
                                      <span className={isCopied ? 'font-medium' : ''}>
                                        {object.isFolder 
                                          ? object.key.replace(/\/$/, '').split('/').pop() || object.key.replace(/\/$/, '')
                                          : object.key.split('/').pop()
                                        }
                                      </span>
                                      {isCopied && (
                                        <span className="ml-2 text-xs text-blue-500">(copied)</span>
                                      )}
                                    </button>
                                  </div>
                                </TableCell>
                              <TableCell>
                                {object.isFolder ? '-' : formatFileSize(object.size)}
                              </TableCell>
                              <TableCell>
                                {object.isFolder ? 'Folder' : (object.key.split('.').pop()?.toUpperCase() || 'File')}
                              </TableCell>
                              <TableCell>
                                <span title={format(new Date(object.lastModified), 'PPpp')}>
                                  {format(new Date(object.lastModified), 'MMM dd, yyyy HH:mm')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {!object.isFolder && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleObjectAction(object, 'preview')}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Preview
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleObjectAction(object, 'download')}
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleObjectAction(object, 'copy')}
                                    >
                                      <Clipboard className="h-4 w-4 mr-2" />
                                      Copy
                                    </DropdownMenuItem>
                                    {clipboardItem && canPaste(currentPath) && (
                                      <DropdownMenuItem
                                        onClick={() => handleObjectAction(object, 'paste')}
                                      >
                                        <ClipboardPaste className="h-4 w-4 mr-2" />
                                        Paste
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleObjectAction(object, 'rename')}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleObjectAction(object, 'delete')}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {/* Primary Actions */}
                            <ContextMenuItem onClick={() => handleObjectAction(object, 'open')}>
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
                            
                            {!object.isFolder && getFileType(object.key).previewable && (
                              <ContextMenuItem onClick={() => handleObjectAction(object, 'preview')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </ContextMenuItem>
                            )}
                            
                            {!object.isFolder && (
                              <ContextMenuItem onClick={() => handleObjectAction(object, 'download')}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </ContextMenuItem>
                            )}
                            
                            <ContextMenuSeparator />
                            
                            {/* File Operations */}
                            <ContextMenuItem onClick={() => handleObjectAction(object, 'copy')}>
                              <Clipboard className="h-4 w-4 mr-2" />
                              Copy
                            </ContextMenuItem>
                            
                            {clipboardItem && canPaste(currentPath) && (
                              <ContextMenuItem onClick={() => handleObjectAction(object, 'paste')}>
                                <ClipboardPaste className="h-4 w-4 mr-2" />
                                Paste &quot;{clipboardItem.name}&quot; here
                              </ContextMenuItem>
                            )}
                            
                            <ContextMenuItem onClick={() => handleObjectAction(object, 'rename')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename
                            </ContextMenuItem>
                            
                            <ContextMenuItem onClick={() => handleObjectAction(object, 'copyUrl')}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </ContextMenuItem>
                            
                            <ContextMenuSeparator />
                            
                            {/* Information */}
                            <ContextMenuItem onClick={() => handleObjectAction(object, 'properties')}>
                              <Info className="h-4 w-4 mr-2" />
                              Properties
                            </ContextMenuItem>
                            
                            <ContextMenuSeparator />
                            
                            {/* Danger Zone */}
                            <ContextMenuItem 
                              onClick={() => handleObjectAction(object, 'delete')}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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