'use client';

import React from 'react';
import { Upload, FolderOpen, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTypography } from '@/lib/hooks/use-typography';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';

interface EmptyStateProps {
  type: 'empty-folder' | 'no-search-results' | 'error';
  searchQuery?: string;
  onAction?: () => void;
}

export function EmptyState({ type, searchQuery, onAction }: EmptyStateProps) {
  const typography = useTypography();
  const t = useTranslations('emptyState');
  
  const configs = {
    'empty-folder': {
      icon: FolderOpen,
      title: t('folderEmpty'),
      description: t('dragDropHint'),
      actionLabel: t('uploadFiles'),
      actionIcon: Upload,
      showAction: true,
    },
    'no-search-results': {
      icon: Search,
      title: t('noResults'),
      description: searchQuery 
        ? t('noResultsMessage', { query: searchQuery })
        : t('noResultsHint'),
      actionLabel: t('clearSearch'),
      actionIcon: undefined,
      showAction: false,
    },
    'error': {
      icon: FolderOpen,
      title: t('errorTitle'),
      description: t('errorMessage'),
      actionLabel: t('retry'),
      actionIcon: undefined,
      showAction: true,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full text-center px-grid-6",
        "animate-in fade-in-50 slide-in-from-bottom-4 duration-300"
      )}
    >
      {/* Animated Icon Container */}
      <div className="relative mb-grid-6 animate-in zoom-in-50 duration-500 delay-100">
        {/* Background circles */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-primary opacity-10 animate-pulse-subtle" />
        <div 
          className="absolute inset-0 w-32 h-32 rounded-full bg-primary opacity-5 animate-pulse-subtle"
          style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}
        />
        
        {/* Main icon */}
        <div className="relative w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="w-16 h-16 text-muted-foreground/50" />
          
          {/* Sparkles for empty folder */}
          {type === 'empty-folder' && (
            <>
              <div className="absolute -top-2 -right-2 animate-sparkle">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div 
                className="absolute -bottom-2 -left-2 animate-sparkle"
                style={{ animationDelay: '1s' }}
              >
                <Sparkles className="w-5 h-5 text-primary/70" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Text content */}
      <div 
        className={cn(
          "mt-3 max-w-sm",
          "animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200"
        )}
      >
        <h3 className={cn('text-foreground', typography.h2())}>
          {config.title}
        </h3>
        <p className={typography.caption()}>
          {config.description}
        </p>
      </div>

      {/* Action button */}
      {config.showAction && onAction && (
        <div 
          className={cn(
            "mt-6",
            "animate-in fade-in zoom-in-95 duration-300 delay-300"
          )}
        >
          <Button
            onClick={onAction}
            size="lg"
            className="active-scale shadow-soft hover:shadow-hover"
          >
            {config.actionIcon && <config.actionIcon className="h-4 w-4 mr-2" />}
            {config.actionLabel}
          </Button>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-16 w-32 h-32 rounded-full bg-primary/5 blur-3xl animate-float-left" />
        <div className="absolute bottom-1/4 -right-16 w-40 h-40 rounded-full bg-primary/5 blur-3xl animate-float-right" />
      </div>
    </div>
  );
}