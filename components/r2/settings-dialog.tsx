'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Palette, 
  Eye, 
  MousePointer, 
  RotateCcw, 
  Search,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Settings2,
  Check,
  Globe
} from 'lucide-react';
import { 
  useUIStateStore,
  type UIDensity
} from '@/lib/stores/ui-state-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useTypography } from '@/lib/hooks/use-typography';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { densityConfig, type UIDensityConfig } from '@/lib/spacing';
import { springPresets } from '@/lib/animations';
import { ThemeSelector } from './theme-selector';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations, useSettingsTranslations } from '@/hooks/use-translations';

type SettingsSection = 'theme' | 'appearance' | 'file-display' | 'behavior';

const sectionIcons: Record<SettingsSection, React.ReactNode> = {
  theme: <Palette className="h-4 w-4" />,
  appearance: <Settings2 className="h-4 w-4" />,
  'file-display': <Eye className="h-4 w-4" />,
  behavior: <MousePointer className="h-4 w-4" />,
};

export function SettingsDialog() {
  const typography = useTypography();
  const t = useSettingsTranslations();
  const tSuccess = useTranslations('success');
  
  const sectionLabels: Record<SettingsSection, string> = {
    theme: t('theme'),
    appearance: t('appearance'),
    'file-display': t('fileDisplay'),
    behavior: t('behavior'),
  };
  const showSettings = useUIStateStore(state => state.showSettings);
  const setShowSettings = useUIStateStore(state => state.setShowSettings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('theme');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['density']));
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  const resetSettings = useUIStateStore(state => state.resetSettings);
  
  const handleReset = () => {
    resetSettings();
    toast.success(tSuccess('settingsReset'), {
      description: tSuccess('settingsResetDescription'),
      duration: 3000,
    });
    setHasChanges(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Apply density styles
  const density = densityConfig[uiDensity];
  
  return (
    <TooltipProvider>
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <motion.aside 
              className="w-72 border-r bg-muted/30 flex flex-col"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={springPresets.gentle}
            >
              <div className="p-6 pb-4 space-y-4">
                <h2 className={typography.h2()}>{t('title')}</h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    className="h-10 bg-background/50"
                    style={{ paddingLeft: '36px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <nav className="flex-1 px-3 py-2">
                <div className="space-y-1">
                  {(Object.keys(sectionIcons) as SettingsSection[]).map((section) => (
                    <motion.button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all', typography.body(),
                        "hover:bg-muted/50",
                        activeSection === section && "bg-accent text-accent-foreground shadow-sm"
                      )}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center justify-center w-5">
                        {sectionIcons[section]}
                      </span>
                      <span className="flex-1 text-left">{sectionLabels[section]}</span>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: activeSection === section ? 1 : 0 }}
                        className="w-5 flex items-center justify-center"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
              </nav>
              
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="w-full justify-start gap-3 px-4 py-3 h-auto font-normal text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{t('resetAll')}</span>
                </Button>
              </div>
            </motion.aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <DialogHeader className="px-8 py-6 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        {sectionIcons[activeSection]}
                      </div>
                      <DialogTitle className={typography.h2()}>
                        {sectionLabels[activeSection]}
                      </DialogTitle>
                    </div>
                    <p className={cn('ml-11', typography.caption())}>
                      {t('customizeExperience')}
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-5 w-5 text-accent" />
                  </motion.div>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1">
                <div className="px-8 py-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        paddingBottom: density.spacing['3xl'],
                      }}
                    >
                      {activeSection === 'theme' && (
                        <ThemeSettings 
                          onSettingChange={() => setHasChanges(true)}
                          expandedSections={expandedSections}
                          toggleSection={toggleSection}
                          density={density}
                        />
                      )}
                      {activeSection === 'appearance' && (
                        <AppearanceSettings 
                          onSettingChange={() => setHasChanges(true)}
                          expandedSections={expandedSections}
                          toggleSection={toggleSection}
                          density={density}
                        />
                      )}
                      {activeSection === 'file-display' && (
                        <FileDisplaySettings 
                          onSettingChange={() => setHasChanges(true)}
                          density={density}
                        />
                      )}
                      {activeSection === 'behavior' && (
                        <BehaviorSettings 
                          onSettingChange={() => setHasChanges(true)}
                          density={density}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ScrollArea>
              
              {/* Footer */}
              <motion.div 
                className="px-8 py-4 border-t flex items-center justify-between bg-muted/10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, ...springPresets.gentle }}
              >
                <div className={cn('flex items-center gap-3', typography.caption())}>
                  <div className="p-1.5 rounded-md bg-muted">
                    <Settings2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Press</span>
                  <kbd className={cn('px-2 py-1 font-mono bg-muted/50 rounded border border-border/50', typography.tiny())}>
                    ⌘ ,
                  </kbd>
                  <span>{t('shortcutHint').split('⌘')[1]}</span>
                </div>
                
                {hasChanges && (
                  <div
                    className={cn('flex items-center gap-2 transition-opacity duration-200', typography.body())}
                    style={{ opacity: hasChanges ? 1 : 0 }}
                  >
                    <div className="animate-spin-slow">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-muted-foreground">{t('autoSave')}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  description,
  expanded,
  onToggle,
  children,
  density,
  icon,
}: {
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  density: UIDensityConfig['default'];
  icon?: React.ReactNode;
}) {
  const typography = useTypography();
  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-colors duration-200",
        expanded ? "bg-[oklch(0.95_0.01_0_/_0.03)]" : "bg-transparent"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/40 transition-colors duration-150 hover:translate-x-0.5"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted/50">
            {icon}
          </div>
          <div className="text-left">
            <h3 className={typography.h4()}>
              {title}
            </h3>
            {description && (
              <p className={cn('mt-0.5', typography.caption())}>
                {description}
              </p>
            )}
          </div>
        </div>
        <div
          className={cn(
            "p-1 transition-transform duration-200",
            expanded ? "rotate-180" : "rotate-0"
          )}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>
      
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ paddingInline: density.spacing.lg }}
          >
            <div style={{ paddingBottom: density.spacing.lg }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Theme Settings - dedicated section for theme customization
function ThemeSettings({
  density,
}: { 
  onSettingChange: () => void;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  density: UIDensityConfig['default'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Theme Selection */}
      <ThemeSelector />
    </div>
  );
}

// Enhanced Appearance Settings
function AppearanceSettings({
  onSettingChange,
  expandedSections,
  toggleSection,
  density,
}: { 
  onSettingChange: () => void;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
  const t = useSettingsTranslations();
  const uiDensity = useUIStateStore(state => state.uiDensity);
  const setUIDensity = useUIStateStore(state => state.setUIDensity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* UI Density with Visual Preview */}
      <CollapsibleSection
        title={t('interfaceDensity')}
        description={t('densityDescription')}
        expanded={expandedSections.has('density')}
        onToggle={() => toggleSection('density')}
        density={density}
        icon={<Settings2 className="h-5 w-5" />}
      >
        <div className="space-y-4 mt-4">
          <RadioGroup 
            value={uiDensity} 
            onValueChange={(value) => {
              setUIDensity(value as UIDensity);
              onSettingChange();
            }}
          >
            {(['compact', 'default', 'spacious'] as const).map((densityOption) => (
              <motion.label
                key={densityOption}
                htmlFor={densityOption}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  uiDensity === densityOption 
                    ? "border-accent bg-accent/10" 
                    : "border-muted hover:border-muted-foreground/50"
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={densityOption} id={densityOption} />
                  <div>
                    <p className="font-medium capitalize">{t(densityOption)}</p>
                    <p className={typography.caption()}>
                      {densityOption === 'compact' && t('compactDescription')}
                      {densityOption === 'default' && t('defaultDescription')}
                      {densityOption === 'spacious' && t('spaciousDescription')}
                    </p>
                  </div>
                </div>
                
                {/* Visual Preview */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="bg-muted rounded-md"
                      style={{
                        width: densityOption === 'compact' ? '20px' : densityOption === 'default' ? '26px' : '32px',
                        height: densityOption === 'compact' ? '20px' : densityOption === 'default' ? '26px' : '32px',
                      }}
                      animate={{
                        scale: uiDensity === densityOption ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </motion.label>
            ))}
          </RadioGroup>
        </div>
      </CollapsibleSection>
      
      {/* Language Selection */}
      <CollapsibleSection
        title={t('language')}
        description={t('languageDescription')}
        expanded={expandedSections.has('language')}
        onToggle={() => toggleSection('language')}
        density={density}
        icon={<Globe className="h-5 w-5" />}
      >
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </CollapsibleSection>
      
    </div>
  );
}

// File Display Settings - only functional settings
function FileDisplaySettings({
  onSettingChange,
  density,
}: { 
  onSettingChange: () => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
  const t = useSettingsTranslations();
  const showHiddenFiles = useUIStateStore(state => state.showHiddenFiles);
  const showThumbnails = useUIStateStore(state => state.showThumbnails);
  const thumbnailSize = useUIStateStore(state => state.thumbnailSize);
  const setShowHiddenFiles = useUIStateStore(state => state.setShowHiddenFiles);
  const setShowThumbnails = useUIStateStore(state => state.setShowThumbnails);
  const setThumbnailSize = useUIStateStore(state => state.setThumbnailSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Working Toggle Settings */}
      <div className="space-y-2">
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="hidden-files" className={cn('cursor-pointer', typography.label())}>
              {t('showHiddenFiles')}
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
              {t('hiddenFilesDescription')}
            </p>
          </div>
          <Switch
            id="hidden-files"
            checked={showHiddenFiles}
            onCheckedChange={(checked) => {
              setShowHiddenFiles(checked);
              onSettingChange();
            }}
          />
        </motion.div>

        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="show-thumbnails" className={cn('cursor-pointer', typography.label())}>
              {t('showThumbnails')}
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
              {t('thumbnailsDescription')}
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
        </motion.div>
      </div>

      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springPresets.smooth}
            className="space-y-3 px-4"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="thumbnail-size" className={typography.label()}>
                {t('thumbnailSize')}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={40}
                  max={160}
                  step={20}
                  value={thumbnailSize}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 40 && value <= 160) {
                      setThumbnailSize(value);
                      onSettingChange();
                    }
                  }}
                  className="w-20 h-8 text-center"
                />
                <span className={typography.caption()}>px</span>
              </div>
            </div>
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
            
            {/* Preview */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="bg-muted rounded-md"
                    style={{
                      width: `${thumbnailSize / 2}px`,
                      height: `${thumbnailSize / 2}px`,
                    }}
                    animate={{
                      scale: [1, 0.95, 1],
                    }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  />
                ))}
              </div>
              <span className={typography.caption()}>Preview</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Behavior Settings - placeholder until features are implemented
function BehaviorSettings({
  density,
}: { 
  onSettingChange: () => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
  const t = useSettingsTranslations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      <div className="text-center py-12">
        <div className="p-4 bg-muted/30 rounded-lg inline-block mb-4">
          <MousePointer className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className={cn('mb-2', typography.h3())}>{t('behaviorSettings')}</h3>
        <p className={cn(typography.body(), 'text-muted-foreground')}>
          {t('behaviorComingSoon')}
        </p>
      </div>
    </div>
  );
}

