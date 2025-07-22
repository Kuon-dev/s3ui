'use client';

import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { R2Object } from '@/lib/r2/operations';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { formatFileSize } from '@/lib/utils/file-utils';
import { useTypography } from '@/lib/hooks/use-typography';
import { springPresets } from '@/lib/animations';
import { CardEnhanced } from '@/components/ui/card-enhanced';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Folder, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStateStore } from '@/lib/stores/ui-state-store';

interface FileGridItemProps {
  object: R2Object;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPreview?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function FileGridItem({
  object,
  isSelected,
  onSelect,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPreview,
  onDownload,
  className,
}: FileGridItemProps) {
  const typography = useTypography();
  const showThumbnails = useUIStateStore(state => state.showThumbnails);
  const thumbnailSize = useUIStateStore(state => state.thumbnailSize);
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  const [isHovered, setIsHovered] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);
  
  const filename = object.key.split('/').pop() || object.key;
  const Icon = object.isFolder ? Folder : getFileIcon(filename);
  const fileType = getFileType(filename);
  const isImage = fileType.category === 'image' && showThumbnails;
  
  const densityConfig = {
    compact: {
      padding: 'p-3',
      iconSize: 'h-12 w-12',
      gap: 'gap-2',
    },
    default: {
      padding: 'p-4',
      iconSize: 'h-16 w-16',
      gap: 'gap-3',
    },
    spacious: {
      padding: 'p-5',
      iconSize: 'h-20 w-20',
      gap: 'gap-4',
    },
  };
  
  const config = densityConfig[uiDensity];
  
  return (
    <motion.div
      className={cn("relative group", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springPresets.gentle}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onContextMenu={onContextMenu}
    >
      <CardEnhanced
        variant={isSelected ? 'elevated' : 'default'}
        interactive
        glow={isHovered}
        className={cn(
          config.padding,
          "cursor-pointer transition-all",
          isSelected && "ring-2 ring-primary ring-offset-2",
          "hover:shadow-lg"
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {/* Selection Checkbox */}
        <motion.div
          className="absolute top-2 left-2 z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered || isSelected ? 1 : 0,
            scale: isHovered || isSelected ? 1 : 0.8,
          }}
          transition={springPresets.gentle}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="bg-background/80 backdrop-blur-sm"
          />
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div
          className="absolute top-2 right-2 z-10"
          initial={{ opacity: 0, x: 10 }}
          animate={{ 
            opacity: showActions || isHovered ? 1 : 0,
            x: showActions || isHovered ? 0 : 10,
          }}
          transition={springPresets.gentle}
        >
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1">
            {!object.isFolder && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview?.();
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
        
        {/* Content */}
        <div className={cn("flex flex-col items-center text-center", config.gap)}>
          {/* Icon/Thumbnail */}
          <motion.div
            className={cn(
              "relative flex items-center justify-center rounded-lg",
              config.iconSize,
              object.isFolder ? "bg-primary/10" : "bg-muted/50"
            )}
            whileHover={{ scale: 1.05 }}
            transition={springPresets.bouncy}
          >
            {isImage ? (
              <img
                src={`/api/r2/preview?key=${encodeURIComponent(object.key)}`}
                alt={filename}
                className="w-full h-full object-cover rounded-lg"
                style={{ maxWidth: thumbnailSize, maxHeight: thumbnailSize }}
              />
            ) : (
              <Icon className={cn(
                "text-muted-foreground",
                object.isFolder && "text-primary",
                uiDensity === 'compact' ? "h-6 w-6" : 
                uiDensity === 'default' ? "h-8 w-8" : "h-10 w-10"
              )} />
            )}
            
            {/* File type badge */}
            {!object.isFolder && fileType && (
              <Badge
                variant="secondary"
                className={cn(
                  "absolute -bottom-1 -right-1",
                  typography.tiny()
                )}
              >
                {filename.split('.').pop()?.toUpperCase() || ''}
              </Badge>
            )}
          </motion.div>
          
          {/* Name */}
          <div className="w-full">
            <p className={cn(
              "font-medium truncate",
              typography.body(),
              isSelected && "text-primary"
            )}>
              {filename}
            </p>
          </div>
          
          {/* Metadata */}
          <div className={cn(
            "flex items-center gap-3 text-muted-foreground",
            typography.small()
          )}>
            {!object.isFolder && (
              <span>{formatFileSize(object.size)}</span>
            )}
            <span className="hidden sm:inline">
              {format(object.lastModified, 'MMM d')}
            </span>
          </div>
        </div>
      </CardEnhanced>
    </motion.div>
  );
}