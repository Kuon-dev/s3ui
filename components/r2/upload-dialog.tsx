'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  AlertCircle,
  FileIcon,
  CheckCircle2,
  Loader2,
  FolderOpen,
  HardDrive,
  Clock,
  AlertTriangle,
  Sparkles,
  FileUp,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { uploadManager, UploadProgress } from '@/lib/service-worker/upload-manager';
import { validateFiles, formatFileSize, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from '@/lib/utils/file-utils';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { cn } from '@/lib/utils';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
}

interface FileWithProgress extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export function UploadDialog({
  isOpen,
  onClose,
  currentPath,
  onUploadComplete,
}: UploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedCount = useRef(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndSetFiles(files);
  };

  const validateAndSetFiles = (files: File[]) => {
    const validation = validateFiles(files);
    setValidationErrors(validation.errors);
    
    if (validation.isValid) {
      const filesWithProgress: FileWithProgress[] = files.map(file => 
        Object.assign(file, {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          progress: 0,
          status: 'pending' as const,
        })
      );
      setSelectedFiles(prev => [...prev, ...filesWithProgress]);
    } else {
      // Show first few errors in toast
      validation.errors.slice(0, 3).forEach(error => {
        toast.error(error);
      });
    }
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
    const files = Array.from(e.dataTransfer.files);
    validateAndSetFiles(files);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(files => files.filter(f => f.id !== id));
  };

  // Calculate total progress
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setTotalProgress(0);
      return;
    }
    
    const total = selectedFiles.reduce((acc, file) => {
      if (file.status === 'completed') return acc + 100;
      if (file.status === 'uploading') return acc + file.progress;
      return acc;
    }, 0);
    
    setTotalProgress(Math.round(total / selectedFiles.length));
  }, [selectedFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    uploadedCount.current = 0;
    
    try {
      const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
      
      const uploadPromises = pendingFiles.map(async (file) => {
        // Update status to uploading
        setSelectedFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading' as const } : f
        ));
        
        try {
          await uploadManager.uploadFile(file, currentPath, (progress: UploadProgress) => {
            setSelectedFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { ...f, progress: progress.progress } 
                : f
            ));
          });
          
          // Update status to completed
          setSelectedFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'completed' as const, progress: 100 } : f
          ));
          uploadedCount.current++;
        } catch (error) {
          // Update status to failed
          setSelectedFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, status: 'failed' as const, error: error instanceof Error ? error.message : 'Upload failed' } 
              : f
          ));
        }
      });

      await Promise.all(uploadPromises);
      
      if (uploadedCount.current > 0) {
        toast.success(`Successfully uploaded ${uploadedCount.current} file(s)`);
        onUploadComplete();
        
        // Auto close if all succeeded
        if (uploadedCount.current === pendingFiles.length) {
          setTimeout(() => {
            handleClose();
          }, 1000);
        }
      }
    } catch {
      toast.error('Upload process failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setValidationErrors([]);
      setTotalProgress(0);
      uploadedCount.current = 0;
      onClose();
    }
  };

  const getStatusIcon = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
  const canUpload = selectedFiles.some(f => f.status === 'pending') && !uploading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 glass-subtle bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Upload Files
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden",
              isDragging 
                ? "border-blue-500 bg-blue-500/10 scale-[1.02]" 
                : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10",
              "cursor-pointer"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-8 text-center">
              <div className={cn(
                "inline-flex p-4 rounded-2xl mb-4 transition-all duration-200",
                isDragging ? "bg-blue-500/20 scale-110" : "bg-white/10"
              )}>
                {isDragging ? (
                  <Sparkles className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-base font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Max {MAX_FILES_PER_UPLOAD} files</span>
                <span>•</span>
                <span>Max {formatFileSize(MAX_FILE_SIZE)} per file</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-500">Cannot upload these files</p>
                  <ul className="text-sm text-red-400 space-y-1">
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li className="text-red-500">...and {validationErrors.length - 3} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{totalProgress}%</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
            </div>
          )}

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  Files ({selectedFiles.length})
                </h4>
                <span className="text-xs text-muted-foreground">
                  Total: {formatFileSize(totalSize)}
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {selectedFiles.map((file) => {
                  const fileType = getFileType(file.name);
                  const FileIcon = getFileIcon(file.name, false);
                  
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "group relative rounded-lg transition-all duration-200",
                        "glass-subtle border border-white/10",
                        file.status === 'failed' && "border-red-500/50 bg-red-500/5"
                      )}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "rounded-lg p-2 transition-colors",
                            file.status === 'completed' && "bg-green-500/10",
                            file.status === 'uploading' && "bg-blue-500/10",
                            file.status === 'failed' && "bg-red-500/10",
                            file.status === 'pending' && "bg-white/5"
                          )}>
                            <FileIcon className={cn(
                              "h-5 w-5",
                              fileType.iconColor
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              {getStatusIcon(file.status)}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </span>
                              {file.error && (
                                <span className="text-xs text-red-400">
                                  {file.error}
                                </span>
                              )}
                            </div>
                            
                            {file.status === 'uploading' && (
                              <div className="mt-2">
                                <Progress value={file.progress} className="h-1" />
                              </div>
                            )}
                          </div>
                          
                          {file.status !== 'uploading' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => removeFile(file.id)}
                              disabled={uploading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Path */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Upload to:</span>
            <span className="text-sm font-medium">/{currentPath || 'Root'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {selectedFiles.length > 0 && (
              <>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(totalSize)}
                </span>
                {uploading && (
                  <>
                    <span>•</span>
                    <span>{uploadedCount.current} of {selectedFiles.length} uploaded</span>
                  </>
                )}
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={uploading}
              className="min-w-[80px]"
            >
              {uploading ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!canUpload}
              className="min-w-[120px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.filter(f => f.status === 'pending').length} file(s)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}