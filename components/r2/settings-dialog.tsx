'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Palette, 
  Eye, 
  MousePointer, 
  Cog, 
  RotateCcw, 
  Check,
  Search,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Settings2
} from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { densityConfig, type UIDensityConfig } from '@/lib/spacing';
import { springPresets } from '@/lib/animations';

type SettingsSection = 'theme' | 'appearance' | 'file-display' | 'behavior' | 'advanced';

const sectionIcons: Record<SettingsSection, React.ReactNode> = {
  theme: <Palette className="h-4 w-4" />,
  appearance: <Settings2 className="h-4 w-4" />,
  'file-display': <Eye className="h-4 w-4" />,
  behavior: <MousePointer className="h-4 w-4" />,
  advanced: <Cog className="h-4 w-4" />,
};

const sectionLabels: Record<SettingsSection, string> = {
  theme: 'Theme',
  appearance: 'Appearance',
  'file-display': 'File Display',
  behavior: 'Behavior',
  advanced: 'Advanced',
};

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: 'blue', label: 'Ocean Blue', color: 'oklch(0.75 0.15 240)' },
  { value: 'purple', label: 'Royal Purple', color: 'oklch(0.75 0.15 280)' },
  { value: 'pink', label: 'Sakura Pink', color: 'oklch(0.75 0.15 340)' },
  { value: 'red', label: 'Ruby Red', color: 'oklch(0.75 0.15 25)' },
  { value: 'orange', label: 'Sunset Orange', color: 'oklch(0.75 0.15 60)' },
  { value: 'yellow', label: 'Golden Yellow', color: 'oklch(0.75 0.15 90)' },
  { value: 'green', label: 'Forest Green', color: 'oklch(0.75 0.15 150)' },
  { value: 'teal', label: 'Teal Mist', color: 'oklch(0.75 0.15 180)' },
  { value: 'cyan', label: 'Arctic Cyan', color: 'oklch(0.75 0.15 200)' }
];

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-5 w-5" />,
  dark: <Moon className="h-5 w-5" />,
  system: <Monitor className="h-5 w-5" />,
};

export function SettingsDialog() {
  const typography = useTypography();
  const showSettings = useUIStateStore(state => state.showSettings);
  const setShowSettings = useUIStateStore(state => state.setShowSettings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('theme');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['color-scheme', 'accent', 'density']));
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  const resetSettings = useUIStateStore(state => state.resetSettings);
  
  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults', {
      description: 'All preferences have been restored to their original values.',
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
                <h2 className={typography.h2()}>Settings</h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search settings..."
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
                  <span>Reset All Settings</span>
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
                      Customize your experience
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
                  <LayoutGroup>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={springPresets.smooth}
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
                      {activeSection === 'advanced' && (
                        <AdvancedSettings 
                          onSettingChange={() => setHasChanges(true)}
                          density={density}
                        />
                      )}
                      </motion.div>
                    </AnimatePresence>
                  </LayoutGroup>
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
                  <span>to open settings</span>
                </div>
                
                <AnimatePresence>
                  {hasChanges && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn('flex items-center gap-2', typography.body())}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </motion.div>
                      <span className="text-muted-foreground">Settings saved automatically</span>
                    </motion.div>
                  )}
                </AnimatePresence>
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
    <motion.div
      className="border rounded-lg overflow-hidden"
      initial={false}
      animate={{ backgroundColor: expanded ? 'oklch(0.95 0.01 0 / 0.03)' : 'transparent' }}
    >
      <motion.button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/40 transition-colors"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.99 }}
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
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={springPresets.snappy}
          className="p-1"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </motion.button>
      
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springPresets.smooth}
            style={{ paddingInline: density.spacing.lg }}
          >
            <div style={{ paddingBottom: density.spacing.lg }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Theme Settings - dedicated section for theme customization
function ThemeSettings({
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
  const theme = useUIStateStore(state => state.theme);
  const accentColor = useUIStateStore(state => state.accentColor);
  const setTheme = useUIStateStore(state => state.setTheme);
  const setAccentColor = useUIStateStore(state => state.setAccentColor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Theme Selection */}
      <CollapsibleSection
        title="Color Scheme"
        description="Choose between light, dark, or system theme"
        expanded={expandedSections.has('color-scheme')}
        onToggle={() => toggleSection('color-scheme')}
        density={density}
        icon={themeIcons[theme]}
      >
        <div className="p-4 bg-muted/30 rounded-lg">
          <RadioGroup 
            value={theme} 
            onValueChange={(value) => {
              setTheme(value as Theme);
              onSettingChange();
            }}
            className="grid grid-cols-3 gap-4"
          >
            {(Object.keys(themeIcons) as Theme[]).map((themeOption) => (
              <motion.label
                key={themeOption}
                htmlFor={themeOption}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all",
                  theme === themeOption 
                    ? "border-accent bg-accent/10 shadow-sm" 
                    : "border-border hover:border-muted-foreground/50 bg-background/50"
                )}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <RadioGroupItem value={themeOption} id={themeOption} className="sr-only" />
                <div className={cn(
                  "p-3 rounded-full transition-colors",
                  theme === themeOption ? "bg-accent text-accent-foreground" : "bg-muted"
                )}>
                  {themeIcons[themeOption]}
                </div>
                <span className={cn('font-medium capitalize', typography.body())}>{themeOption}</span>
              </motion.label>
            ))}
          </RadioGroup>
        </div>
      </CollapsibleSection>
      
      {/* Accent Color */}
      <CollapsibleSection
        title="Accent Color"
        description="Personalize your interface with a splash of color"
        expanded={expandedSections.has('accent')}
        onToggle={() => toggleSection('accent')}
        density={density}
        icon={<Palette className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-9 gap-3">
              {accentColors.map((color) => (
                <Tooltip key={color.value}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => {
                        setAccentColor(color.value);
                        onSettingChange();
                      }}
                      className={cn(
                        "h-12 w-12 rounded-xl ring-2 ring-offset-2 ring-offset-background transition-all relative",
                        accentColor === color.value
                          ? "ring-accent shadow-lg"
                          : "ring-transparent hover:ring-muted-foreground/30"
                      )}
                      style={{ backgroundColor: color.color }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={springPresets.bouncy}
                    >
                      {accentColor === color.value && (
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={springPresets.bouncy}
                        >
                          <Check className="h-5 w-5 text-white drop-shadow-md" />
                        </motion.div>
                      )}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{color.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          
          {/* Color Preview */}
          <motion.div
            className="p-4 rounded-lg border bg-accent/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-12 rounded-lg"
                style={{ backgroundColor: accentColors.find(c => c.value === accentColor)?.color }}
              />
              <div>
                <p className="font-medium">
                  {accentColors.find(c => c.value === accentColor)?.label}
                </p>
                <p className={typography.caption()}>
                  Your current accent color
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </CollapsibleSection>
      
      {/* Theme Customization Preview */}
      <CollapsibleSection
        title="Preview"
        description="See how your theme looks with sample UI elements"
        expanded={expandedSections.has('preview')}
        onToggle={() => toggleSection('preview')}
        density={density}
        icon={<Eye className="h-5 w-5" />}
      >
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          {/* Sample buttons */}
          <div className="space-y-2">
            <p className={cn('font-medium mb-3', typography.label())}>Buttons</p>
            <div className="flex gap-3">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="ghost">Ghost</Button>
            </div>
          </div>
          
          {/* Sample cards */}
          <div className="space-y-2">
            <p className={cn('font-medium mb-3', typography.label())}>Cards</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border bg-background">
                <h4 className={typography.h4()}>Card Title</h4>
                <p className={typography.caption()}>This is a sample card with your theme.</p>
              </div>
              <div className="p-4 rounded-lg border bg-accent/10">
                <h4 className={typography.h4()}>Accent Card</h4>
                <p className={typography.caption()}>This uses your accent color.</p>
              </div>
            </div>
          </div>
          
          {/* Sample form elements */}
          <div className="space-y-2">
            <p className={cn('font-medium mb-3', typography.label())}>Form Elements</p>
            <div className="space-y-3">
              <Input placeholder="Sample input field" className="max-w-sm" />
              <div className="flex items-center gap-2">
                <Switch id="sample-switch" />
                <Label htmlFor="sample-switch" className={typography.label()}>Toggle switch</Label>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
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
  const uiDensity = useUIStateStore(state => state.uiDensity);
  const showAnimations = useUIStateStore(state => state.showAnimations);
  const reduceMotion = useUIStateStore(state => state.reduceMotion);
  const setUIDensity = useUIStateStore(state => state.setUIDensity);
  const setShowAnimations = useUIStateStore(state => state.setShowAnimations);
  const setReduceMotion = useUIStateStore(state => state.setReduceMotion);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* UI Density with Visual Preview */}
      <CollapsibleSection
        title="Interface Density"
        description="Adjust spacing to match your preference"
        expanded={expandedSections.has('density')}
        onToggle={() => toggleSection('density')}
        density={density}
        icon={<Settings2 className="h-5 w-5" />}
      >
        <div className="space-y-4">
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
                    <p className="font-medium capitalize">{densityOption}</p>
                    <p className={typography.caption()}>
                      {densityOption === 'compact' && 'More content visible'}
                      {densityOption === 'default' && 'Balanced spacing'}
                      {densityOption === 'spacious' && 'More breathing room'}
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
      
      {/* Animations */}
      <div className="space-y-4">
        <motion.div
          className="flex items-center justify-between p-5 rounded-lg border bg-background/50 hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-muted/50">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Label htmlFor="animations" className={cn('cursor-pointer', typography.label())}>
                Enable Animations
              </Label>
              <p className={cn('mt-0.5', typography.caption())}>
                Smooth transitions and visual feedback
              </p>
            </div>
          </div>
          <Switch
            id="animations"
            checked={showAnimations}
            onCheckedChange={(checked) => {
              setShowAnimations(checked);
              onSettingChange();
            }}
          />
        </motion.div>
        
        <motion.div
          className="flex items-center justify-between p-5 rounded-lg border bg-background/50 hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-muted/50">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Label htmlFor="reduce-motion" className={cn('cursor-pointer', typography.label())}>
                Reduce Motion
              </Label>
              <p className={cn('mt-0.5', typography.caption())}>
                Minimize animations for accessibility
              </p>
            </div>
          </div>
          <Switch
            id="reduce-motion"
            checked={reduceMotion}
            onCheckedChange={(checked) => {
              setReduceMotion(checked);
              onSettingChange();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// File Display Settings remain similar but with enhanced spacing
function FileDisplaySettings({
  onSettingChange,
  density,
}: { 
  onSettingChange: () => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Toggle Settings */}
      <div className="space-y-2">
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="file-extensions" className={cn('cursor-pointer', typography.label())}>
              Show File Extensions
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>

        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="group-folders" className={cn('cursor-pointer', typography.label())}>
              Group Folders First
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>
      </div>

      <Separator />

      {/* Format Settings */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="date-format" className={cn('mb-2 block', typography.label())}>
            Date Format
          </Label>
          <Select value={dateFormat} onValueChange={(value) => {
            setDateFormat(value as DateFormat);
            onSettingChange();
          }}>
            <SelectTrigger id="date-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relative">
                <div className="flex items-center gap-2">
                  <span>Relative</span>
                  <span className={typography.caption()}>(2 hours ago)</span>
                </div>
              </SelectItem>
              <SelectItem value="short">
                <div className="flex items-center gap-2">
                  <span>Short</span>
                  <span className={typography.caption()}>(Jan 15, 2025)</span>
                </div>
              </SelectItem>
              <SelectItem value="long">
                <div className="flex items-center gap-2">
                  <span>Long</span>
                  <span className={typography.caption()}>(January 15, 2025 at 3:30 PM)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="size-format" className={cn('mb-2 block', typography.label())}>
            File Size Format
          </Label>
          <Select value={sizeFormat} onValueChange={(value) => {
            setSizeFormat(value as SizeFormat);
            onSettingChange();
          }}>
            <SelectTrigger id="size-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <span>Auto</span>
                  <span className={typography.caption()}>(KB, MB, GB)</span>
                </div>
              </SelectItem>
              <SelectItem value="bytes">
                <div className="flex items-center gap-2">
                  <span>Bytes</span>
                  <span className={typography.caption()}>(1,234,567)</span>
                </div>
              </SelectItem>
              <SelectItem value="decimal">
                <div className="flex items-center gap-2">
                  <span>Decimal</span>
                  <span className={typography.caption()}>(1.23 MB)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Thumbnail Settings */}
      <div className="space-y-4">
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="show-thumbnails" className={cn('cursor-pointer', typography.label())}>
              Show Thumbnails
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>

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
                  Thumbnail Size
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
    </div>
  );
}

// Behavior Settings with enhanced interactions
function BehaviorSettings({
  onSettingChange,
  density,
}: { 
  onSettingChange: () => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Confirmation Settings */}
      <div className="space-y-2">
        <h3 className={cn('mb-3', typography.h3())}>Confirmations</h3>
        
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="confirm-delete" className={cn('cursor-pointer', typography.label())}>
              Confirm Before Delete
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>

        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="confirm-bulk" className={cn('cursor-pointer', typography.label())}>
              Confirm Bulk Operations
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>
      </div>

      <Separator />

      {/* Mouse Actions */}
      <div>
        <h3 className={cn('mb-3', typography.h3())}>Mouse Actions</h3>
        <div className="space-y-2">
          <Label className={typography.label()}>Double Click Action</Label>
          <RadioGroup 
            value={doubleClickAction} 
            onValueChange={(value) => {
              setDoubleClickAction(value as 'open' | 'preview');
              onSettingChange();
            }}
            className="space-y-2"
          >
            <motion.label
              htmlFor="open"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                doubleClickAction === 'open' 
                  ? "border-accent bg-accent/10" 
                  : "border-muted hover:border-muted-foreground/50"
              )}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
            >
              <RadioGroupItem value="open" id="open" />
              <span>Open/Navigate to folder</span>
            </motion.label>
            
            <motion.label
              htmlFor="preview"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                doubleClickAction === 'preview' 
                  ? "border-accent bg-accent/10" 
                  : "border-muted hover:border-muted-foreground/50"
              )}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
            >
              <RadioGroupItem value="preview" id="preview" />
              <span>Preview file</span>
            </motion.label>
          </RadioGroup>
        </div>
      </div>

      <Separator />

      {/* Auto Refresh */}
      <div>
        <Label htmlFor="auto-refresh" className={cn('mb-2 block', typography.label())}>
          Auto Refresh Interval
        </Label>
        <Select value={String(autoRefreshInterval)} onValueChange={(value) => {
          setAutoRefreshInterval(Number(value));
          onSettingChange();
        }}>
          <SelectTrigger id="auto-refresh" className="w-full">
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

      {/* Search Settings */}
      <motion.div
        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
        whileHover={{ x: 2 }}
      >
        <div>
          <Label htmlFor="search-content" className={cn('cursor-pointer', typography.label())}>
            Search File Contents
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
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
      </motion.div>
    </div>
  );
}

// Advanced Settings with input enhancements
function AdvancedSettings({
  onSettingChange,
  density,
}: { 
  onSettingChange: () => void;
  density: UIDensityConfig['default'];
}) {
  const typography = useTypography();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: density.spacing.xl }}>
      {/* Upload Settings */}
      <div className="space-y-4">
        <h3 className={cn('mb-3', typography.h3())}>Upload Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="concurrent-uploads" className={typography.label()}>
              Max Concurrent Uploads
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={10}
                value={maxConcurrentUploads}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= 10) {
                    setMaxConcurrentUploads(value);
                    onSettingChange();
                  }
                }}
                className="w-16 h-8 text-center"
              />
            </div>
          </div>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="chunk-size" className={typography.label()}>
              Upload Chunk Size
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={uploadChunkSize}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= 100) {
                    setUploadChunkSize(value);
                    onSettingChange();
                  }
                }}
                className="w-16 h-8 text-center"
              />
              <span className={typography.caption()}>MB</span>
            </div>
          </div>
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
      <motion.div
        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
        whileHover={{ x: 2 }}
      >
        <div>
          <Label htmlFor="service-worker" className={cn('cursor-pointer', typography.label())}>
            Enable Service Worker
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
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
      </motion.div>

      <Separator />

      {/* Cache Settings */}
      <div className="space-y-4">
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="cache-enabled" className={cn('cursor-pointer', typography.label())}>
              Enable Cache
            </Label>
            <p className={cn('mt-0.5', typography.caption())}>
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
        </motion.div>

        <AnimatePresence>
          {cacheEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springPresets.smooth}
              className="space-y-3 px-4"
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="cache-duration" className={typography.label()}>
                  Cache Duration
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    step={5}
                    value={cacheDuration}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 5 && value <= 60) {
                        setCacheDuration(value);
                        onSettingChange();
                      }
                    }}
                    className="w-16 h-8 text-center"
                  />
                  <span className={typography.caption()}>minutes</span>
                </div>
              </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}