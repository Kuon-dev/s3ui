import { type UIDensity } from '@/lib/stores/ui-state-store';
import { cn } from '@/lib/utils';

/**
 * Typography scale based on UI density
 */
const typographyScale = {
  compact: {
    // Headers
    h1: 'text-xl',      // 20px → Main page headers
    h2: 'text-lg',      // 18px → Section headers, dialog titles
    h3: 'text-base',    // 16px → Subsection headers
    h4: 'text-sm',      // 14px → Card headers
    
    // Body text
    body: 'text-xs',    // 12px → Default body text
    small: 'text-[11px]', // 11px → Secondary text, metadata
    tiny: 'text-[10px]',  // 10px → Smallest text, badges
    
    // UI elements
    label: 'text-xs',   // 12px → Form labels
    button: 'text-xs',  // 12px → Button text
    caption: 'text-[11px]', // 11px → Help text, descriptions
  },
  default: {
    // Headers
    h1: 'text-xl',      // 20px → Main page headers
    h2: 'text-lg',      // 18px → Section headers, dialog titles
    h3: 'text-base',    // 16px → Subsection headers
    h4: 'text-sm',      // 14px → Card headers
    
    // Body text
    body: 'text-sm',    // 14px → Default body text
    small: 'text-xs',   // 12px → Secondary text, metadata
    tiny: 'text-[11px]', // 11px → Smallest text, badges
    
    // UI elements
    label: 'text-sm',   // 14px → Form labels
    button: 'text-sm',  // 14px → Button text
    caption: 'text-xs', // 12px → Help text, descriptions
  },
  spacious: {
    // Headers
    h1: 'text-2xl',     // 24px → Main page headers
    h2: 'text-xl',      // 20px → Section headers, dialog titles
    h3: 'text-lg',      // 18px → Subsection headers
    h4: 'text-base',    // 16px → Card headers
    
    // Body text
    body: 'text-base',  // 16px → Default body text
    small: 'text-sm',   // 14px → Secondary text, metadata
    tiny: 'text-xs',    // 12px → Smallest text, badges
    
    // UI elements
    label: 'text-base', // 16px → Form labels
    button: 'text-base', // 16px → Button text
    caption: 'text-sm', // 14px → Help text, descriptions
  },
};

/**
 * Get typography class based on variant and density
 */
export function getTypographyClass(
  variant: keyof typeof typographyScale.default,
  density: UIDensity = 'default'
): string {
  return typographyScale[density][variant];
}

/**
 * Typography helper functions for common patterns
 */
export const typography = {
  // Headers
  h1: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h1', density), 'font-semibold', className),
  
  h2: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h2', density), 'font-semibold', className),
  
  h3: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h3', density), 'font-medium', className),
  
  h4: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h4', density), 'font-medium', className),
  
  // Body text
  body: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('body', density), className),
  
  small: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('small', density), className),
  
  tiny: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('tiny', density), className),
  
  // UI elements
  label: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('label', density), 'font-medium', className),
  
  button: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('button', density), className),
  
  caption: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('caption', density), 'text-muted-foreground', className),
  
  // Common patterns
  dialogTitle: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h2', density), 'font-semibold', className),
  
  sectionTitle: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('h3', density), 'font-medium', className),
  
  formLabel: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('label', density), 'font-medium', className),
  
  formDescription: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('caption', density), 'text-muted-foreground', className),
  
  metadata: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('small', density), 'text-muted-foreground', className),
  
  badge: (density: UIDensity = 'default', className?: string) => 
    cn(getTypographyClass('tiny', density), className),
};

/**
 * Hook to get typography utilities with current density
 * Usage: const { h1, body, label } = useTypography();
 */
export function createTypographyUtils(density: UIDensity) {
  return Object.fromEntries(
    Object.entries(typography).map(([key, fn]) => [
      key,
      (className?: string) => fn(density, className),
    ])
  ) as Record<keyof typeof typography, (className?: string) => string>;
}