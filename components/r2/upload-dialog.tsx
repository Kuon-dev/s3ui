'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
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
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';

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
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    setValidationErrors([]);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setValidationErrors([]);
    setTotalProgress(0);
    uploadedCount.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    const progressMap = new Map<string, number>();
    
    try {
      for (const fileItem of selectedFiles) {
        if (fileItem.status === 'completed') continue;
        
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'uploading' as const, progress: 0 }
              : f
          )
        );

        try {

          await uploadManager.uploadFile(
            fileItem.file,
            currentPath,
            (progress: UploadProgress) => {
              progressMap.set(fileItem.id, progress.progress);
              
              setSelectedFiles(prev => 
                prev.map(f => 
                  f.id === fileItem.id 
                    ? { ...f, progress: progress.progress }
                    : f
                )
              );
              
              // Calculate total progress
              let total = 0;
              let count = 0;
              selectedFiles.forEach(f => {
                if (f.status === 'completed') {
                  total += 100;
                } else if (f.id === fileItem.id) {
                  total += progress.progress;
                } else {
                  total += progressMap.get(f.id) || 0;
                }
                count++;
              });
              setTotalProgress(Math.round(total / count));
            }
          );

          setSelectedFiles(prev => 
            prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'completed' as const, progress: 100 }
                : f
            )
          );
          
          uploadedCount.current++;
        } catch (error) {
          setSelectedFiles(prev => 
            prev.map(f => 
              f.id === fileItem.id 
                ? { 
                    ...f, 
                    status: 'failed' as const, 
                    error: error instanceof Error ? error.message : 'Upload failed' 
                  }
                : f
            )
          );
          toast.error(`Failed to upload ${fileItem.file.name}`);
        }
      }
      
      if (uploadedCount.current > 0) {
        toast.success(`Successfully uploaded ${uploadedCount.current} file${uploadedCount.current > 1 ? 's' : ''}`);
        onUploadComplete();
      }
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-4 w-4 text-primary" />
          </motion.div>
        );
      case 'completed':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springPresets.bouncy}
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
          </motion.div>
        );
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const canUpload = selectedFiles.length > 0 && !uploading;
  const allCompleted = selectedFiles.length > 0 && selectedFiles.every(f => f.status === 'completed');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.smooth}
          className="p-grid-6 pb-0"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Upload Files
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {currentPath ? `Uploading to: /${currentPath}` : 'Uploading to: Home'}
            </p>
          </DialogHeader>
        </motion.div>

        <div className="flex-1 overflow-y-auto p-grid-6">
          {/* Drop Zone */}
          <motion.div
            animate={{
              scale: isDragging ? 1.02 : 1,
              borderColor: isDragging ? 'var(--primary)' : 'var(--border)',
            }}
            transition={springPresets.gentle}
            className={cn(
              "border-2 border-dashed rounded-lg p-grid-8 text-center transition-all",
              "hover:border-primary/50 hover:bg-accent/5",
              isDragging && "bg-primary/5 border-primary"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            
            <motion.div
              animate={{ y: isDragging ? -5 : 0 }}
              transition={springPresets.gentle}
              className="flex flex-col items-center gap-grid-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-grid-2">
                <h3 className="font-medium text-lg">
                  {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  or{' '}
                  <label htmlFor="file-upload" className="text-primary hover:underline cursor-pointer">
                    browse from your computer
                  </label>
                </p>
              </div>
              
              <div className="flex items-center gap-grid-4 text-xs text-muted-foreground">
                <span>Max {MAX_FILES_PER_UPLOAD} files</span>
                <span>•</span>
                <span>{formatFileSize(MAX_FILE_SIZE)} per file</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Validation Errors */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-grid-4 p-grid-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="space-y-1 text-sm">
                    {validationErrors.map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Files */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-grid-6 space-y-grid-3"
              >
                <div className="flex items-center justify-between mt-2 pb-2">
                  <h4 className="font-medium text-sm">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFiles}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                
                {/* Total Progress */}
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-grid-3 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Progress</span>
                      <span className="text-sm text-muted-foreground">{totalProgress}%</span>
                    </div>
                    <Progress value={totalProgress} className="h-2" />
                  </motion.div>
                )}
                
                <div className="max-h-64 overflow-y-auto my-4 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {selectedFiles.map((fileItem, index) => {
                      const Icon = getFileIcon(fileItem.file.name, false);
                      const fileType = getFileType(fileItem.file.name);
                      
                      return (
                        <motion.div
                          key={fileItem.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05, ...springPresets.gentle }}
                          className={cn(
                            "flex items-center gap-grid-3 p-grid-3 rounded-lg border",
                            "transition-all duration-200",
                            fileItem.status === 'completed' && "bg-success/5 border-success/20",
                            fileItem.status === 'failed' && "bg-destructive/5 border-destructive/20",
                            fileItem.status === 'uploading' && "bg-primary/5 border-primary/20",
                            fileItem.status === 'pending' && "bg-card border-border/50"
                          )}
                        >
                          <Icon className={`h-5 w-5 flex-shrink-0 file-type-${fileType.category}`} />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {fileItem.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                              {fileItem.error && (
                                <span className="text-destructive ml-2">{fileItem.error}</span>
                              )}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-grid-2">
                            {fileItem.status === 'uploading' && (
                              <div className="w-16">
                                <Progress value={fileItem.progress} className="h-1.5" />
                              </div>
                            )}
                            
                            {getStatusIcon(fileItem.status)}
                            
                            {!uploading && fileItem.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileItem.id)}
                                className="h-7 w-7 p-0 hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-grid-6 pt-0 mt-auto"
        >
          <div className="flex justify-end gap-grid-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              {allCompleted ? 'Done' : 'Cancel'}
            </Button>
            {!allCompleted && (
              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                className="min-w-[100px] active-scale"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}