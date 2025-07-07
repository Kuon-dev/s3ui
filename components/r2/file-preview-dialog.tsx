'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  AlertCircle,
  FileText,
  Volume2,
} from 'lucide-react';
import { R2Object } from '@/lib/r2/operations';
import { getFileType, FileCategory } from '@/lib/utils/file-types';

interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: R2Object | null;
}

/**
 * Comprehensive file preview dialog supporting multiple file types.
 * Handles images, audio, video, text files, and PDFs with appropriate viewers.
 */
export function FilePreviewDialog({ isOpen, onClose, file }: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  
  // Image viewer state
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  
  // Audio/Video player state for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPlaying, setIsPlaying] = useState(false);

  const fileType = file ? getFileType(file.key) : null;
  const filename = file ? file.key.split('/').pop() || file.key : '';

  // Generate preview URL and load content when file changes
  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const previewPath = `/api/r2/preview?key=${encodeURIComponent(file.key)}`;
        
        if (fileType?.category === FileCategory.DOCUMENT && 
            (fileType.mimeType === 'text/plain' || fileType.mimeType === 'text/markdown')) {
          // Load text content directly
          const response = await fetch(previewPath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const content = await response.text();
          setTextContent(content);
        } else {
          // Use URL for other file types
          setPreviewUrl(previewPath);
        }
      } catch (error) {
        console.error('Preview load error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [file, isOpen, fileType]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setImageScale(1);
      setImageRotation(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (!file) return;
    
    // Open download in new tab
    const downloadUrl = `/api/r2/download?key=${encodeURIComponent(file.key)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleImageControls = (action: 'zoomIn' | 'zoomOut' | 'rotate') => {
    switch (action) {
      case 'zoomIn':
        setImageScale(prev => Math.min(prev * 1.2, 5));
        break;
      case 'zoomOut':
        setImageScale(prev => Math.max(prev / 1.2, 0.1));
        break;
      case 'rotate':
        setImageRotation(prev => (prev + 90) % 360);
        break;
    }
  };

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 mb-2">Preview Error</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (!fileType || !file) return null;

    // Handle different file categories
    switch (fileType.category) {
      case FileCategory.IMAGE:
        return (
          <div className="space-y-4">
            {/* Image Controls */}
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageControls('zoomOut')}
                  disabled={imageScale <= 0.1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageControls('zoomIn')}
                  disabled={imageScale >= 5}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageControls('rotate')}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-gray-400">
                {Math.round(imageScale * 100)}%
              </span>
            </div>
            
            {/* Image Viewer */}
            <div className="relative overflow-hidden glass-subtle rounded-lg">
              <div className="overflow-auto max-h-[400px] min-h-[200px] flex items-center justify-center p-4">
                {previewUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt={filename}
                    className="max-w-full max-h-full object-contain transition-transform"
                    style={{
                      transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center',
                    }}
                    onError={() => setError('Failed to load image')}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case FileCategory.AUDIO:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex p-4 rounded-2xl glass-subtle mb-4">
                <Volume2 className="h-16 w-16 text-purple-500" />
              </div>
            </div>
            
            {/* Audio Player */}
            {previewUrl && (
              <audio
                controls
                className="w-full glass-subtle rounded-lg p-2"
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src={previewUrl} type={fileType.mimeType} />
                Your browser does not support audio playback.
              </audio>
            )}
          </div>
        );

      case FileCategory.VIDEO:
        return (
          <div className="space-y-4">
            {/* Video Player */}
            {previewUrl && (
              <video
                controls
                className="w-full max-h-[500px] glass-subtle rounded-lg object-contain"
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src={previewUrl} type={fileType.mimeType} />
                Your browser does not support video playback.
              </video>
            )}
          </div>
        );

      case FileCategory.DOCUMENT:
        if (fileType.mimeType === 'application/pdf') {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span className="text-sm text-gray-400">PDF Document</span>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              
              {/* PDF Embed */}
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-[500px] glass-subtle rounded-lg border-0"
                  title={filename}
                />
              )}
            </div>
          );
        } else if (textContent !== null) {
          // Text file preview
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Text Document</span>
                </div>
                <span className="text-sm text-gray-500">
                  {textContent.length} characters
                </span>
              </div>
              
              <div className="bg-gray-900 rounded p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {textContent}
                </pre>
              </div>
            </div>
          );
        }
        break;

      default:
        // Unsupported file type
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Preview not available</p>
              <p className="text-gray-500 text-sm mb-4">
                {fileType.description} files cannot be previewed
              </p>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          </div>
        );
    }

    return null;
  };

  if (!file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass w-full max-w-[min(90vw,56rem)] max-h-[90vh] overflow-hidden p-0 bg-background/95 backdrop-blur-xl border-white/10" showCloseButton={false}>
        <div className="p-6 h-full flex flex-col min-w-0">
          <DialogHeader className="space-y-3 mb-4 flex-shrink-0 min-w-0">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <DialogTitle className="text-xl font-semibold text-foreground truncate block" title={filename}>
                  {filename}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button onClick={handleDownload} variant="ghost" size="sm" className="glass-subtle hover-lift">
                  <Download className="h-4 w-4" />
                  <span className="ml-2 text-xs hidden sm:inline">Download</span>
                </Button>
                <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 glass-subtle hover-lift">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground min-w-0">
              <span className="font-medium whitespace-nowrap">{fileType?.description}</span>
              <span className="text-xs flex-shrink-0">•</span>
              <span className="whitespace-nowrap">{formatFileSize(file.size)}</span>
              {fileType && !fileType.previewable && (
                <>
                  <span className="text-xs flex-shrink-0">•</span>
                  <span className="text-amber-500/80 whitespace-nowrap">Preview may be limited</span>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-w-0">
            <div className="h-full overflow-auto rounded-lg">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}