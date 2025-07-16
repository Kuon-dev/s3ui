'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Eye, MousePointer, Cog, RotateCcw, Check } from 'lucide-react';
import { 
  useUIStateStore,
  type AccentColor,
  type Theme,
  type UIDensity,
  type DateFormat,
  type SizeFormat
} from '@/lib/stores/ui-state-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SettingsSection = 'appearance' | 'file-display' | 'behavior' | 'advanced';

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: 'blue', label: 'Blue', color: 'oklch(0.75 0.15 240)' },
  { value: 'purple', label: 'Purple', color: 'oklch(0.75 0.15 280)' },
  { value: 'pink', label: 'Pink', color: 'oklch(0.75 0.15 340)' },
  { value: 'red', label: 'Red', color: 'oklch(0.75 0.15 25)' },
  { value: 'orange', label: 'Orange', color: 'oklch(0.75 0.15 60)' },
  { value: 'yellow', label: 'Yellow', color: 'oklch(0.75 0.15 90)' },
  { value: 'green', label: 'Green', color: 'oklch(0.75 0.15 150)' },
  { value: 'teal', label: 'Teal', color: 'oklch(0.75 0.15 180)' },
  { value: 'cyan', label: 'Cyan', color: 'oklch(0.75 0.15 200)' }
];

export function SettingsPanel() {
  const showSettings = useUIStateStore(state => state.showSettings);
  const setShowSettings = useUIStateStore(state => state.setShowSettings);
  const [hasChanges, setHasChanges] = useState(false);
  
  const resetSettings = useUIStateStore(state => state.resetSettings);
  
  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults');
    setHasChanges(false);
  };
  
  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="flex-1">
          <TabsList className="grid w-full grid-cols-4 px-6">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="file-display" className="gap-2">
              <Eye className="h-4 w-4" />
              File Display
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-2">
              <MousePointer className="h-4 w-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Cog className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[500px] px-6 py-6">
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <AppearanceSettings onSettingChange={() => setHasChanges(true)} />
            </TabsContent>
            
            <TabsContent value="file-display" className="space-y-6 mt-0">
              <FileDisplaySettings onSettingChange={() => setHasChanges(true)} />
            </TabsContent>
            
            <TabsContent value="behavior" className="space-y-6 mt-0">
              <BehaviorSettings onSettingChange={() => setHasChanges(true)} />
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-6 mt-0">
              <AdvancedSettings onSettingChange={() => setHasChanges(true)} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-green-500" />
                Settings saved automatically
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Appearance Settings Component
function AppearanceSettings({
  onSettingChange
}: { onSettingChange: () => void }) {
  const theme = useUIStateStore(state => state.theme);
  const accentColor = useUIStateStore(state => state.accentColor);
  const uiDensity = useUIStateStore(state => state.uiDensity);
  const showAnimations = useUIStateStore(state => state.showAnimations);
  const reduceMotion = useUIStateStore(state => state.reduceMotion);
  const setTheme = useUIStateStore(state => state.setTheme);
  const setAccentColor = useUIStateStore(state => state.setAccentColor);
  const setUIDensity = useUIStateStore(state => state.setUIDensity);
  const setShowAnimations = useUIStateStore(state => state.setShowAnimations);
  const setReduceMotion = useUIStateStore(state => state.setReduceMotion);
  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Theme</Label>
        <RadioGroup value={theme} onValueChange={(value) => {
          setTheme(value as Theme);
          onSettingChange();
        }}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="font-normal cursor-pointer">Light</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="font-normal cursor-pointer">Dark</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="font-normal cursor-pointer">Follow system</Label>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />
      
      {/* Accent Color */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Accent Color</Label>
        <div className="grid grid-cols-9 gap-2">
          {accentColors.map((color) => (
            <motion.button
              key={color.value}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setAccentColor(color.value);
                onSettingChange();
              }}
              className={cn(
                "h-8 w-8 rounded-md ring-2 ring-offset-2 ring-offset-background transition-all",
                accentColor === color.value
                  ? "ring-foreground"
                  : "ring-transparent hover:ring-muted-foreground/50"
              )}
              style={{ backgroundColor: color.color }}
              title={color.label}
            />
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* UI Density */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Interface Density</Label>
        <RadioGroup value={uiDensity} onValueChange={(value) => {
          setUIDensity(value as UIDensity);
          onSettingChange();
        }}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="compact" id="compact" />
            <Label htmlFor="compact" className="font-normal cursor-pointer">
              Compact - More content visible
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="default" id="default" />
            <Label htmlFor="default" className="font-normal cursor-pointer">
              Default - Balanced spacing
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="spacious" id="spacious" />
            <Label htmlFor="spacious" className="font-normal cursor-pointer">
              Spacious - More breathing room
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />
      
      {/* Animations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="animations" className="text-base font-medium">
              Enable Animations
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Smooth transitions and effects
            </p>
          </div>
          <Switch
            id="animations"
            checked={showAnimations}
            onCheckedChange={(checked) => {
              setShowAnimations(checked);
              onSettingChange();
            }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reduce-motion" className="text-base font-medium">
              Reduce Motion
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Minimize animations for accessibility
            </p>
          </div>
          <Switch
            id="reduce-motion"
            checked={reduceMotion}
            onCheckedChange={(checked) => {
              setReduceMotion(checked);
              onSettingChange();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// File Display Settings Component
function FileDisplaySettings({
  onSettingChange
}: { onSettingChange: () => void }) {
  const showFileExtensions = useUIStateStore(state => state.showFileExtensions);
  const dateFormat = useUIStateStore(state => state.dateFormat);
  const sizeFormat = useUIStateStore(state => state.sizeFormat);
  const groupFoldersFirst = useUIStateStore(state => state.groupFoldersFirst);
  const showThumbnails = useUIStateStore(state => state.showThumbnails);
  const thumbnailSize = useUIStateStore(state => state.thumbnailSize);
  const setShowFileExtensions = useUIStateStore(state => state.setShowFileExtensions);
  const setDateFormat = useUIStateStore(state => state.setDateFormat);
  const setSizeFormat = useUIStateStore(state => state.setSizeFormat);
  const setGroupFoldersFirst = useUIStateStore(state => state.setGroupFoldersFirst);
  const setShowThumbnails = useUIStateStore(state => state.setShowThumbnails);
  const setThumbnailSize = useUIStateStore(state => state.setThumbnailSize);
  return (
    <div className="space-y-6">
      {/* File Extensions */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="file-extensions" className="text-base font-medium">
            Show File Extensions
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Display file extensions like .txt, .pdf
          </p>
        </div>
        <Switch
          id="file-extensions"
          checked={showFileExtensions}
          onCheckedChange={(checked) => {
            setShowFileExtensions(checked);
            onSettingChange();
          }}
        />
      </div>
      
      <Separator />
      
      {/* Date Format */}
      <div className="space-y-3">
        <Label htmlFor="date-format" className="text-base font-medium">
          Date Format
        </Label>
        <Select value={dateFormat} onValueChange={(value) => {
          setDateFormat(value as DateFormat);
          onSettingChange();
        }}>
          <SelectTrigger id="date-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relative">Relative (2 hours ago)</SelectItem>
            <SelectItem value="short">Short (Jan 15, 2025)</SelectItem>
            <SelectItem value="long">Long (January 15, 2025 at 3:30 PM)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Separator />
      
      {/* Size Format */}
      <div className="space-y-3">
        <Label htmlFor="size-format" className="text-base font-medium">
          File Size Format
        </Label>
        <Select value={sizeFormat} onValueChange={(value) => {
          setSizeFormat(value as SizeFormat);
          onSettingChange();
        }}>
          <SelectTrigger id="size-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (KB, MB, GB)</SelectItem>
            <SelectItem value="bytes">Bytes (1,234,567)</SelectItem>
            <SelectItem value="decimal">Decimal (1.23 MB)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Separator />
      
      {/* Group Folders */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="group-folders" className="text-base font-medium">
            Group Folders First
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Show all folders before files
          </p>
        </div>
        <Switch
          id="group-folders"
          checked={groupFoldersFirst}
          onCheckedChange={(checked) => {
            setGroupFoldersFirst(checked);
            onSettingChange();
          }}
        />
      </div>
      
      <Separator />
      
      {/* Thumbnails */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-thumbnails" className="text-base font-medium">
              Show Thumbnails
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Preview images in grid view
            </p>
          </div>
          <Switch
            id="show-thumbnails"
            checked={showThumbnails}
            onCheckedChange={(checked) => {
              setShowThumbnails(checked);
              onSettingChange();
            }}
          />
        </div>
        
        {showThumbnails && (
          <div className="space-y-3">
            <Label htmlFor="thumbnail-size" className="text-base font-medium">
              Thumbnail Size: {thumbnailSize}px
            </Label>
            <Slider
              id="thumbnail-size"
              min={40}
              max={160}
              step={20}
              value={[thumbnailSize]}
              onValueChange={([value]) => {
                setThumbnailSize(value);
                onSettingChange();
              }}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Behavior Settings Component
function BehaviorSettings({
  onSettingChange
}: { onSettingChange: () => void }) {
  const confirmDelete = useUIStateStore(state => state.confirmDelete);
  const confirmBulkOperations = useUIStateStore(state => state.confirmBulkOperations);
  const doubleClickAction = useUIStateStore(state => state.doubleClickAction);
  const autoRefreshInterval = useUIStateStore(state => state.autoRefreshInterval);
  const searchIncludeContent = useUIStateStore(state => state.searchIncludeContent);
  const setConfirmDelete = useUIStateStore(state => state.setConfirmDelete);
  const setConfirmBulkOperations = useUIStateStore(state => state.setConfirmBulkOperations);
  const setDoubleClickAction = useUIStateStore(state => state.setDoubleClickAction);
  const setAutoRefreshInterval = useUIStateStore(state => state.setAutoRefreshInterval);
  const setSearchIncludeContent = useUIStateStore(state => state.setSearchIncludeContent);
  return (
    <div className="space-y-6">
      {/* Confirmations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="confirm-delete" className="text-base font-medium">
              Confirm Before Delete
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Ask for confirmation when deleting files
            </p>
          </div>
          <Switch
            id="confirm-delete"
            checked={confirmDelete}
            onCheckedChange={(checked) => {
              setConfirmDelete(checked);
              onSettingChange();
            }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="confirm-bulk" className="text-base font-medium">
              Confirm Bulk Operations
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Ask when performing actions on multiple files
            </p>
          </div>
          <Switch
            id="confirm-bulk"
            checked={confirmBulkOperations}
            onCheckedChange={(checked) => {
              setConfirmBulkOperations(checked);
              onSettingChange();
            }}
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Double Click Action */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Double Click Action</Label>
        <RadioGroup value={doubleClickAction} onValueChange={(value) => {
          setDoubleClickAction(value as 'open' | 'preview');
          onSettingChange();
        }}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="open" id="open" />
            <Label htmlFor="open" className="font-normal cursor-pointer">
              Open/Navigate to folder
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="preview" id="preview" />
            <Label htmlFor="preview" className="font-normal cursor-pointer">
              Preview file
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />
      
      {/* Auto Refresh */}
      <div className="space-y-3">
        <Label htmlFor="auto-refresh" className="text-base font-medium">
          Auto Refresh Interval
        </Label>
        <Select value={String(autoRefreshInterval)} onValueChange={(value) => {
          setAutoRefreshInterval(Number(value));
          onSettingChange();
        }}>
          <SelectTrigger id="auto-refresh">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Disabled</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="30">30 seconds</SelectItem>
            <SelectItem value="60">1 minute</SelectItem>
            <SelectItem value="300">5 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Separator />
      
      {/* Search Content */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="search-content" className="text-base font-medium">
            Search File Contents
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Include file contents in search (slower)
          </p>
        </div>
        <Switch
          id="search-content"
          checked={searchIncludeContent}
          onCheckedChange={(checked) => {
            setSearchIncludeContent(checked);
            onSettingChange();
          }}
        />
      </div>
    </div>
  );
}

// Advanced Settings Component
function AdvancedSettings({
  onSettingChange
}: { onSettingChange: () => void }) {
  const maxConcurrentUploads = useUIStateStore(state => state.maxConcurrentUploads);
  const uploadChunkSize = useUIStateStore(state => state.uploadChunkSize);
  const enableServiceWorker = useUIStateStore(state => state.enableServiceWorker);
  const cacheEnabled = useUIStateStore(state => state.cacheEnabled);
  const cacheDuration = useUIStateStore(state => state.cacheDuration);
  const setMaxConcurrentUploads = useUIStateStore(state => state.setMaxConcurrentUploads);
  const setUploadChunkSize = useUIStateStore(state => state.setUploadChunkSize);
  const setEnableServiceWorker = useUIStateStore(state => state.setEnableServiceWorker);
  const setCacheEnabled = useUIStateStore(state => state.setCacheEnabled);
  const setCacheDuration = useUIStateStore(state => state.setCacheDuration);
  return (
    <div className="space-y-6">
      {/* Upload Settings */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Upload Settings</h3>
        
        <div className="space-y-3">
          <Label htmlFor="concurrent-uploads" className="text-sm">
            Max Concurrent Uploads: {maxConcurrentUploads}
          </Label>
          <Slider
            id="concurrent-uploads"
            min={1}
            max={10}
            step={1}
            value={[maxConcurrentUploads]}
            onValueChange={([value]) => {
              setMaxConcurrentUploads(value);
              onSettingChange();
            }}
            className="w-full"
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="chunk-size" className="text-sm">
            Upload Chunk Size: {uploadChunkSize} MB
          </Label>
          <Slider
            id="chunk-size"
            min={1}
            max={100}
            step={1}
            value={[uploadChunkSize]}
            onValueChange={([value]) => {
              setUploadChunkSize(value);
              onSettingChange();
            }}
            className="w-full"
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Service Worker */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="service-worker" className="text-base font-medium">
            Enable Service Worker
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Background uploads and offline support
          </p>
        </div>
        <Switch
          id="service-worker"
          checked={enableServiceWorker}
          onCheckedChange={(checked) => {
            setEnableServiceWorker(checked);
            onSettingChange();
          }}
        />
      </div>
      
      <Separator />
      
      {/* Cache Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cache-enabled" className="text-base font-medium">
              Enable Cache
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Cache file listings for better performance
            </p>
          </div>
          <Switch
            id="cache-enabled"
            checked={cacheEnabled}
            onCheckedChange={(checked) => {
              setCacheEnabled(checked);
              onSettingChange();
            }}
          />
        </div>
        
        {cacheEnabled && (
          <div className="space-y-3">
            <Label htmlFor="cache-duration" className="text-sm">
              Cache Duration: {cacheDuration} minutes
            </Label>
            <Slider
              id="cache-duration"
              min={5}
              max={60}
              step={5}
              value={[cacheDuration]}
              onValueChange={([value]) => {
                setCacheDuration(value);
                onSettingChange();
              }}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}