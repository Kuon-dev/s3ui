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

interface FileWithProgress {
  file: File;
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
      const filesWithProgress: FileWithProgress[] = files
        .filter(file => {
          if (!file || !file.name || file.name === '') {
            console.error('File missing name:', file ? { name: file.name, size: file.size, type: file.type } : 'null file');
            toast.error('One or more files are invalid or missing names');
            return false;
          }
          return true;
        })
        .map(file => ({
          file: file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          progress: 0,
          status: 'pending' as const,
        }));
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
    
    const newTotalProgress = Math.round(total / selectedFiles.length);
    console.log('UploadDialog: Calculating total progress:', {
      selectedFiles: selectedFiles.map(f => ({ id: f.id, progress: f.progress, status: f.status })),
      total,
      length: selectedFiles.length,
      newTotalProgress
    });
    setTotalProgress(newTotalProgress);
  }, [selectedFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    uploadedCount.current = 0;
    
    try {
      const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
      
      const uploadPromises = pendingFiles.map(async (fileWrapper) => {
        // Update status to uploading
        setSelectedFiles(prev => prev.map(f => 
          f.id === fileWrapper.id ? { ...f, status: 'uploading' as const } : f
        ));
        
        try {
          console.log(`Starting upload for file: ${fileWrapper.file.name}, path: ${currentPath}`);
          await uploadManager.uploadFile(fileWrapper.file, currentPath, (progress: UploadProgress) => {
            console.log('UploadDialog: Received progress update:', progress);
            setSelectedFiles(prev => {
              const updated = prev.map(f => 
                f.id === fileWrapper.id 
                  ? { ...f, progress: progress.progress } 
                  : f
              );
              console.log('UploadDialog: Updated selectedFiles:', updated.find(f => f.id === fileWrapper.id));
              return updated;
            });
          });
          
          // Update status to completed
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileWrapper.id ? { ...f, status: 'completed' as const, progress: 100 } : f
          ));
          uploadedCount.current++;
          console.log(`Upload completed for file: ${fileWrapper.file.name}`);
        } catch (error) {
          console.error(`Upload failed for file: ${fileWrapper.file.name}`, error);
          // Update status to failed
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileWrapper.id 
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
          // Set uploading to false before closing
          setUploading(false);
          setTimeout(() => {
            handleClose();
          }, 1000);
        } else {
          setUploading(false);
        }
      } else {
        setUploading(false);
      }
    } catch {
      toast.error('Upload process failed');
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
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const totalSize = selectedFiles.reduce((acc, fileWrapper) => acc + fileWrapper.file.size, 0);
  const canUpload = selectedFiles.some(f => f.status === 'pending') && !uploading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 glass-subtle bg-background/95 backdrop-blur-xl border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Upload Files
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden",
              isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-border bg-muted/50 hover:border-border hover:bg-muted",
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
                isDragging ? "bg-primary/20 scale-110" : "bg-muted"
              )}>
                {isDragging ? (
                  <Sparkles className="h-8 w-8 text-primary" />
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
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Cannot upload these files</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li className="text-destructive">...and {validationErrors.length - 3} more errors</li>
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
                {selectedFiles.map((fileWrapper) => {
                  // Ensure file has a name before calling getFileType
                  if (!fileWrapper.file || !fileWrapper.file.name) {
                    console.error('File missing name:', fileWrapper);
                    return null;
                  }
                  const fileType = getFileType(fileWrapper.file.name);
                  const FileIcon = getFileIcon(fileWrapper.file.name, false);
                  
                  return (
                    <div
                      key={fileWrapper.id}
                      className={cn(
                        "group relative rounded-lg transition-all duration-200",
                        "glass-subtle border border-border",
                        fileWrapper.status === 'failed' && "border-destructive/50 bg-destructive/5"
                      )}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "rounded-lg p-2 transition-colors",
                            fileWrapper.status === 'completed' && "bg-success/10",
                            fileWrapper.status === 'uploading' && "bg-primary/10",
                            fileWrapper.status === 'failed' && "bg-destructive/10",
                            fileWrapper.status === 'pending' && "bg-muted/50"
                          )}>
                            <FileIcon className={cn(
                              "h-5 w-5",
                              fileType.iconColor
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate" title={fileWrapper.file.name}>
                                {fileWrapper.file.name}
                              </p>
                              {getStatusIcon(fileWrapper.status)}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(fileWrapper.file.size)}
                              </span>
                              {fileWrapper.error && (
                                <span className="text-xs text-destructive/80">
                                  {fileWrapper.error}
                                </span>
                              )}
                            </div>
                            
                            {fileWrapper.status === 'uploading' && (
                              <div className="mt-2">
                                <Progress value={fileWrapper.progress} className="h-1" />
                              </div>
                            )}
                          </div>
                          
                          {fileWrapper.status !== 'uploading' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => removeFile(fileWrapper.id)}
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
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <FolderOpen className="h-4 w-4 text-primary" />
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