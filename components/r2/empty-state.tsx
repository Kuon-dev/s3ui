'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Upload, FolderOpen, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { springPresets } from '@/lib/animations';

interface EmptyStateProps {
  type: 'empty-folder' | 'no-search-results' | 'error';
  searchQuery?: string;
  onAction?: () => void;
}

export function EmptyState({ type, searchQuery, onAction }: EmptyStateProps) {
  const configs = {
    'empty-folder': {
      icon: FolderOpen,
      title: 'This folder is empty',
      description: 'Drag and drop files here or click the upload button to get started.',
      actionLabel: 'Upload Files',
      actionIcon: Upload,
      showAction: true,
    },
    'no-search-results': {
      icon: Search,
      title: 'No results found',
      description: searchQuery 
        ? `We couldn't find any files matching "${searchQuery}"`
        : 'Try adjusting your search or browse a different folder.',
      actionLabel: 'Clear Search',
      actionIcon: undefined,
      showAction: false,
    },
    'error': {
      icon: FolderOpen,
      title: 'Something went wrong',
      description: 'We encountered an error loading this folder. Please try again.',
      actionLabel: 'Retry',
      actionIcon: undefined,
      showAction: true,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.smooth}
      className="flex flex-col items-center justify-center h-full text-center px-grid-6"
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, ...springPresets.bouncy }}
        className="relative mb-grid-6"
      >
        {/* Background circles */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.05, 0.1],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-32 h-32 rounded-full bg-primary"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.02, 0.05],
          }}
          transition={{ 
            duration: 3,
            delay: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-32 h-32 rounded-full bg-primary"
        />
        
        {/* Main icon */}
        <div className="relative w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="w-16 h-16 text-muted-foreground/50" />
          
          {/* Sparkles for empty folder */}
          {type === 'empty-folder' && (
            <>
              <motion.div
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180],
                }}
                transition={{ 
                  duration: 2,
                  delay: 0,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, -180],
                }}
                transition={{ 
                  duration: 2,
                  delay: 1,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
                className="absolute -bottom-2 -left-2"
              >
                <Sparkles className="w-5 h-5 text-primary/70" />
              </motion.div>
            </>
          )}
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...springPresets.smooth }}
        className="space-y-grid-3 max-w-sm"
      >
        <h3 className="text-xl font-semibold text-foreground">
          {config.title}
        </h3>
        <p className="text-muted-foreground">
          {config.description}
        </p>
      </motion.div>

      {/* Action button */}
      {config.showAction && onAction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, ...springPresets.bouncy }}
          className="mt-grid-6"
        >
          <Button
            onClick={onAction}
            size="lg"
            className="active-scale shadow-soft hover:shadow-hover"
          >
            {config.actionIcon && <config.actionIcon className="h-4 w-4 mr-2" />}
            {config.actionLabel}
          </Button>
        </motion.div>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/4 -left-16 w-32 h-32 rounded-full bg-primary/5 blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ 
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-1/4 -right-16 w-40 h-40 rounded-full bg-primary/5 blur-3xl"
        />
      </div>
    </motion.div>
  );
}