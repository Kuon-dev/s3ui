'use client';

import React, { useEffect, useState } from 'react';
import { 
  HardDrive, 
  Files, 
  FolderOpen, 
  Upload as UploadIcon,
  Activity,
  Wifi,
  WifiOff,
  Search,
  FolderPlus,
  RefreshCw,
  Grid3x3,
  List,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { cn } from '@/lib/utils';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { useR2Objects } from '@/lib/hooks/use-r2-queries';
import { useStorageStats } from '@/lib/hooks/use-storage-stats';
import { toast } from 'sonner';

interface UtilityHeaderProps {
  className?: string;
}

export function UtilityHeader({ className }: UtilityHeaderProps) {
  const {
    currentPath,
    viewMode,
    setViewMode,
    setShowUploadDialog,
    setShowCreateFolderDialog,
    setShowGlobalSearch,
  } = useFileBrowserStore();
  
  const { data: objects = [], isLoading, refetch } = useR2Objects(currentPath);
  const { data: storageStats } = useStorageStats();
  const [uploadProgress, setUploadProgress] = useState<{ active: number; total: number }>({ active: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(true);
  
  // Monitor upload progress
  useEffect(() => {
    const checkUploadStatus = () => {
      // This would integrate with your upload manager
      // For now, using mock data
      const active = 0; // uploadManager doesn't have getActiveUploads method
      setUploadProgress({ active, total: active });
    };
    
    checkUploadStatus();
    const interval = setInterval(checkUploadStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  
  // Current folder stats
  const currentFolderSize = objects.reduce((acc, obj) => acc + (obj.isFolder ? 0 : obj.size), 0);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };
  
  const fileCount = objects.filter(obj => !obj.isFolder).length;
  const folderCount = objects.filter(obj => obj.isFolder).length;
  
  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
  };
  
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };
  
  return (
    <div className={cn("glass rounded-2xl px-4 py-2", className)}>
      <div className="flex items-center justify-between">
        {/* Left section - Path and Stats */}
        <div className="flex items-center space-x-6">
          {/* Current Path */}
          <div className="flex items-center space-x-2 text-sm">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center space-x-1 text-muted-foreground">
              <span className="font-medium">Root</span>
              {getBreadcrumbs().map((part, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-medium">{part}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          
          {/* Stats */}
          <div className="flex items-center space-x-4 text-xs">
            {/* File Count */}
            <div className="flex items-center space-x-1.5">
              <Files className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            
            {/* Folder Count */}
            <div className="flex items-center space-x-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
              </span>
            </div>
            
            {/* Current Folder Size */}
            <div className="flex items-center space-x-1.5">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {formatBytes(currentFolderSize)}
                {storageStats && (
                  <span className="text-xs opacity-70"> / {formatBytes(storageStats.totalSize)}</span>
                )}
              </span>
            </div>
          </div>
          
          {/* Upload Activity */}
          {uploadProgress.active > 0 && (
            <>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center space-x-1.5">
                <Activity className="h-3.5 w-3.5 text-success animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {uploadProgress.active} uploading
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* Right section - Actions */}
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="flex items-center space-x-1.5 mr-2">
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
          
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          
          {/* Quick Actions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? (
              <Grid3x3 className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3"
            onClick={() => setShowCreateFolderDialog(true)}
          >
            <FolderPlus className="h-4 w-4 mr-1.5" />
            <span className="text-xs">New Folder</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3"
            onClick={() => setShowUploadDialog(true)}
          >
            <UploadIcon className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Upload</span>
          </Button>
          
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          
          {/* Search Reminder */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3"
            onClick={() => setShowGlobalSearch(true)}
          >
            <Search className="h-4 w-4 mr-1.5" />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          
          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}