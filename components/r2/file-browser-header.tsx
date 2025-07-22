'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import {
  Upload,
  FolderPlus,
  Search,
  RefreshCw,
  Settings,
  Home,
  ChevronRight,
  Grid3X3,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonEnhanced } from '@/components/ui/button-enhanced';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTypography } from '@/lib/hooks/use-typography';
import { springPresets } from '@/lib/animations';
import { TooltipWrapper as Tooltip } from '@/components/ui/tooltip-wrapper';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUIStateStore } from '@/lib/stores/ui-state-store';

interface FileBrowserHeaderProps {
  currentPath: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigate: (path: string) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onToggleView: () => void;
  viewMode: 'grid' | 'list';
  loading?: boolean;
  itemCount?: number;
  selectedCount?: number;
}

export function FileBrowserHeader({
  currentPath,
  searchQuery,
  onSearchChange,
  onNavigate,
  onUpload,
  onCreateFolder,
  onRefresh,
  onToggleView,
  viewMode,
  loading = false,
  itemCount = 0,
  selectedCount = 0,
}: FileBrowserHeaderProps) {
  const t = useTranslations();
  const typography = useTypography();
  const setShowSettings = useUIStateStore(state => state.setShowSettings);
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  // Parse breadcrumb from path
  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: t('common.home'), path: '' },
    ...pathParts.map((part, index) => ({
      label: part,
      path: pathParts.slice(0, index + 1).join('/'),
    })),
  ];
  
  const densityPadding = {
    compact: 'p-3',
    default: 'p-4',
    spacious: 'p-6',
  };
  
  return (
    <motion.div
      className={cn(
        "border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40",
        densityPadding[uiDensity]
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springPresets.smooth}
    >
      {/* Top Row - Breadcrumb and Actions */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <motion.button
                onClick={() => onNavigate(crumb.path)}
                className={cn(
                  "px-2 py-1 rounded-md hover:bg-accent/50 transition-colors",
                  "max-w-[200px] truncate",
                  index === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  typography.body()
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    {crumb.label}
                  </span>
                ) : (
                  crumb.label
                )}
              </motion.button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Tooltip content={t('headerTooltips.toggleView')} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleView}
              className="h-9 w-9"
            >
              {viewMode === 'grid' ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid3X3 className="h-4 w-4" />
              )}
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" className="h-6" />
          
          <ButtonEnhanced
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('fileBrowser.newFolderButton')}</span>
          </ButtonEnhanced>
          
          <ButtonEnhanced
            variant="gradient"
            size="sm"
            onClick={onUpload}
            className="gap-2"
            elevation="sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('fileBrowser.uploadButton')}</span>
          </ButtonEnhanced>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Tooltip content={t('contextMenu.refresh')} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </Tooltip>
          
          <Tooltip content={t('headerTooltips.settings')} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="h-9 w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      
      {/* Bottom Row - Search and Stats */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t('globalSearch.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "pl-10 pr-4 h-9 bg-muted/50 border-muted focus:bg-background",
              typography.body()
            )}
          />
          {searchQuery && (
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              esc
            </kbd>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3 text-muted-foreground">
          {selectedCount > 0 && (
            <>
              <Badge variant="secondary" className="gap-1">
                <span className={typography.small()}>{t('header.selectedCount', { count: selectedCount })}</span>
              </Badge>
              <Separator orientation="vertical" className="h-4" />
            </>
          )}
          <motion.span
            className={cn("flex items-center gap-1", typography.small())}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={itemCount}
          >
            {t('header.itemCount', { count: itemCount })}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}