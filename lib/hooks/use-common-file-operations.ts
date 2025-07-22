import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useClipboardStore } from '@/lib/stores/clipboard-store';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useFileOperations } from './use-file-operations';
import { R2Object } from '@/lib/r2/operations';
import { toast } from 'sonner';

/**
 * Common file operations that can be used by both file tree and table views
 */
export function useCommonFileOperations() {
  const t = useTranslations();
  const {
    setSelectedObject,
    setShowRenameDialog,
    setShowDeleteDialog,
    setShowPreviewDialog,
  } = useFileBrowserStore();
  
  const { 
    copy: copyToClipboard,
    cut: cutToClipboard,
  } = useClipboardStore();
  
  const { downloadFile } = useFileOperations();

  const handleCopy = useCallback((object: R2Object | { key: string; name: string; isFolder: boolean }, sourcePath: string) => {
    const isR2Object = 'size' in object;
    const name = isR2Object ? (object.key.split('/').pop() || object.key) : object.name;
    const key = object.key;
    const isFolder = isR2Object ? (object.isFolder || false) : object.isFolder;
    
    copyToClipboard([{ key, name, isFolder }], sourcePath);
    toast.success(t('success.copiedItem', { name }));
  }, [copyToClipboard, t]);
  
  const handleCut = useCallback((object: R2Object | { key: string; name: string; isFolder: boolean }, sourcePath: string) => {
    const isR2Object = 'size' in object;
    const name = isR2Object ? (object.key.split('/').pop() || object.key) : object.name;
    const key = object.key;
    const isFolder = isR2Object ? (object.isFolder || false) : object.isFolder;
    
    cutToClipboard([{ key, name, isFolder }], sourcePath);
    toast.success(t('success.cutItem', { name }));
  }, [cutToClipboard, t]);

  const handleRename = useCallback((object: R2Object | { key: string; name: string; isFolder: boolean }) => {
    // Convert to R2Object format if needed
    const r2Object: R2Object = 'size' in object ? object : {
      key: object.key,
      size: 0,
      lastModified: new Date(),
      isFolder: object.isFolder,
    };
    
    setSelectedObject(r2Object);
    setShowRenameDialog(true);
  }, [setSelectedObject, setShowRenameDialog]);

  const handleDelete = useCallback((object: R2Object | { key: string; name: string; isFolder: boolean }) => {
    // Convert to R2Object format if needed
    const r2Object: R2Object = 'size' in object ? object : {
      key: object.key,
      size: 0,
      lastModified: new Date(),
      isFolder: object.isFolder,
    };
    
    setSelectedObject(r2Object);
    setShowDeleteDialog(true);
  }, [setSelectedObject, setShowDeleteDialog]);

  const handlePreview = useCallback((object: R2Object) => {
    setSelectedObject(object);
    setShowPreviewDialog(true);
  }, [setSelectedObject, setShowPreviewDialog]);

  const handleDownload = useCallback(async (object: R2Object) => {
    const fileName = object.key.split('/').pop() || object.key;
    await downloadFile(object.key, fileName);
  }, [downloadFile]);

  const handleCopyUrl = useCallback(async (object: R2Object | { key: string }) => {
    try {
      const key = object.key;
      const url = `${window.location.origin}/api/r2/preview?key=${encodeURIComponent(key)}`;
      await navigator.clipboard.writeText(url);
      toast.success(t('success.urlCopied'));
    } catch {
      toast.error(t('errors.failedToCopyUrl'));
    }
  }, [t]);

  const handleCopyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(t('success.pathCopied'));
    } catch {
      toast.error(t('errors.failedToCopyPath'));
    }
  }, [t]);

  return {
    handleCopy,
    handleCut,
    handleRename,
    handleDelete,
    handlePreview,
    handleDownload,
    handleCopyUrl,
    handleCopyPath,
  };
}