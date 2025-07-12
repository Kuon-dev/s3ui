'use client';

import React from 'react';
import {
  FolderPlus,
  Upload,
  Edit,
  Trash2,
  RefreshCw,
  Copy,
  Scissors,
  ClipboardPaste,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Link,
  Download,
  Eye,
} from 'lucide-react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { useClipboardStore } from '@/lib/stores/clipboard-store';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useFileOperations } from '@/lib/hooks/use-file-operations';
import { useCommonFileOperations } from '@/lib/hooks/use-common-file-operations';
import { R2Object } from '@/lib/r2/operations';
import { getFileType } from '@/lib/utils/file-types';

export interface UnifiedContextMenuProps {
  object: R2Object | { key: string; name: string; isFolder: boolean };
  currentPath: string;
  
  // Context-specific props
  context: 'file-tree' | 'table';
  hasChildren?: boolean; // For folders in tree
  
  // Callbacks for context-specific actions
  onNavigate?: () => Promise<void>;
  onCreateFolder?: () => void;
  onRefresh?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function UnifiedContextMenu({
  object,
  currentPath,
  context,
  hasChildren = false,
  onNavigate,
  onCreateFolder,
  onRefresh,
  onExpandAll,
  onCollapseAll,
}: UnifiedContextMenuProps) {
  const { setShowUploadDialog } = useFileBrowserStore();
  const { 
    hasItems: hasClipboardItems,
    canPaste,
    operation: clipboardOperation,
    items: clipboardItems,
  } = useClipboardStore();
  const { paste } = useFileOperations();
  const {
    handleCopy,
    handleCut,
    handleRename,
    handleDelete,
    handlePreview,
    handleDownload,
    handleCopyUrl,
    handleCopyPath,
  } = useCommonFileOperations();

  const isFolder = 'isFolder' in object ? object.isFolder : true;
  const objectKey = object.key;
  
  // Check if file is previewable
  const isPreviewable = !isFolder && getFileType(objectKey).previewable;

  const handlePaste = async () => {
    // For file tree context, navigate to folder first if provided
    if (context === 'file-tree' && onNavigate) {
      await onNavigate();
    }
    
    // Use the file operations hook to handle paste
    await paste(isFolder ? objectKey : currentPath);
  };

  const handleUpload = async () => {
    // For file tree, navigate to the folder first
    if (context === 'file-tree' && onNavigate) {
      await onNavigate();
    }
    setShowUploadDialog(true);
  };

  return (
    <>
      {/* Primary Actions */}
      {isFolder && onNavigate && (
        <ContextMenuItem onClick={onNavigate}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open
        </ContextMenuItem>
      )}
      
      {!isFolder && context === 'table' && (
        <ContextMenuItem onClick={() => handlePreview(object as R2Object)}>
          <Eye className="h-4 w-4 mr-2" />
          {isPreviewable ? 'Preview' : 'Open'}
        </ContextMenuItem>
      )}
      
      {isFolder && onCreateFolder && (
        <ContextMenuItem onClick={onCreateFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </ContextMenuItem>
      )}
      
      {isFolder && context === 'file-tree' && (
        <ContextMenuItem onClick={handleUpload}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </ContextMenuItem>
      )}
      
      {!isFolder && (
        <ContextMenuItem onClick={() => handleDownload(object as R2Object)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      {/* Edit Actions */}
      <ContextMenuItem onClick={() => handleCopy(object, currentPath)}>
        <Copy className="h-4 w-4 mr-2" />
        Copy
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
      
      <ContextMenuItem onClick={() => handleCut(object, currentPath)}>
        <Scissors className="h-4 w-4 mr-2" />
        Cut
        <ContextMenuShortcut>⌘X</ContextMenuShortcut>
      </ContextMenuItem>
      
      {hasClipboardItems() && canPaste(isFolder ? objectKey : currentPath) && (
        <ContextMenuItem onClick={handlePaste}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Paste {clipboardItems.length} item(s) ({clipboardOperation})
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => handleRename(object)}>
        <Edit className="h-4 w-4 mr-2" />
        Rename
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      
      <ContextMenuItem 
        onClick={() => handleDelete(object)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
        <ContextMenuShortcut>⌦</ContextMenuShortcut>
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      {/* View Actions - Tree specific */}
      {context === 'file-tree' && hasChildren && (
        <>
          {onExpandAll && (
            <ContextMenuItem onClick={onExpandAll}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Expand All
            </ContextMenuItem>
          )}
          
          {onCollapseAll && (
            <ContextMenuItem onClick={onCollapseAll}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Collapse All
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator />
        </>
      )}
      
      {/* Refresh - Tree specific */}
      {context === 'file-tree' && onRefresh && (
        <>
          <ContextMenuItem onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
            <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
        </>
      )}
      
      {/* Utility Actions */}
      {context === 'file-tree' ? (
        <ContextMenuItem onClick={() => handleCopyPath(objectKey)}>
          <Link className="h-4 w-4 mr-2" />
          Copy Path
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={() => handleCopyUrl(object)}>
          <Link className="h-4 w-4 mr-2" />
          Copy URL
        </ContextMenuItem>
      )}
    </>
  );
}