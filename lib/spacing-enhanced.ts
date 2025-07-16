import { type UIDensity } from '@/lib/stores/ui-state-store';

/**
 * Enhanced 4-point grid spacing system with Mac-OS inspired values
 * All values are multiples of 4px for consistency
 */
export const spacingScale = {
  // Base unit: 4px
  '0': '0px',
  'px': '1px',
  '0.5': '2px',    // 0.5 * 4px
  '1': '4px',      // 1 * 4px
  '1.5': '6px',    // 1.5 * 4px
  '2': '8px',      // 2 * 4px
  '2.5': '10px',   // 2.5 * 4px
  '3': '12px',     // 3 * 4px
  '3.5': '14px',   // 3.5 * 4px
  '4': '16px',     // 4 * 4px
  '5': '20px',     // 5 * 4px
  '6': '24px',     // 6 * 4px
  '7': '28px',     // 7 * 4px
  '8': '32px',     // 8 * 4px
  '9': '36px',     // 9 * 4px
  '10': '40px',    // 10 * 4px
  '11': '44px',    // 11 * 4px
  '12': '48px',    // 12 * 4px
  '14': '56px',    // 14 * 4px
  '16': '64px',    // 16 * 4px
  '20': '80px',    // 20 * 4px
  '24': '96px',    // 24 * 4px
} as const;

export type SpacingKey = keyof typeof spacingScale;

/**
 * Density-aware spacing configurations
 * Inspired by Mac-OS spacing principles
 */
export const densitySpacing = {
  compact: {
    // Component padding
    'button-px': spacingScale['2'],      // 8px
    'button-py': spacingScale['1.5'],    // 6px
    'card-p': spacingScale['3'],         // 12px
    'dialog-p': spacingScale['4'],       // 16px
    'section-gap': spacingScale['3'],    // 12px
    'list-gap': spacingScale['1'],       // 4px
    'icon-gap': spacingScale['2'],       // 8px
    
    // Layout spacing
    'container-px': spacingScale['4'],   // 16px
    'container-py': spacingScale['3'],   // 12px
    'section-mb': spacingScale['4'],     // 16px
    'element-gap': spacingScale['2'],    // 8px
    
    // Border radius (follows 4px grid)
    'radius-sm': spacingScale['1'],      // 4px
    'radius-md': spacingScale['2'],      // 8px
    'radius-lg': spacingScale['3'],      // 12px
    'radius-xl': spacingScale['4'],      // 16px
  },
  default: {
    // Component padding
    'button-px': spacingScale['4'],      // 16px
    'button-py': spacingScale['2'],      // 8px
    'card-p': spacingScale['5'],         // 20px
    'dialog-p': spacingScale['6'],       // 24px
    'section-gap': spacingScale['5'],    // 20px
    'list-gap': spacingScale['2'],       // 8px
    'icon-gap': spacingScale['3'],       // 12px
    
    // Layout spacing
    'container-px': spacingScale['6'],   // 24px
    'container-py': spacingScale['5'],   // 20px
    'section-mb': spacingScale['6'],     // 24px
    'element-gap': spacingScale['3'],    // 12px
    
    // Border radius
    'radius-sm': spacingScale['2'],      // 8px
    'radius-md': spacingScale['3'],      // 12px
    'radius-lg': spacingScale['4'],      // 16px
    'radius-xl': spacingScale['5'],      // 20px
  },
  spacious: {
    // Component padding
    'button-px': spacingScale['6'],      // 24px
    'button-py': spacingScale['3'],      // 12px
    'card-p': spacingScale['8'],         // 32px
    'dialog-p': spacingScale['8'],       // 32px
    'section-gap': spacingScale['8'],    // 32px
    'list-gap': spacingScale['3'],       // 12px
    'icon-gap': spacingScale['4'],       // 16px
    
    // Layout spacing
    'container-px': spacingScale['8'],   // 32px
    'container-py': spacingScale['6'],   // 24px
    'section-mb': spacingScale['8'],     // 32px
    'element-gap': spacingScale['4'],    // 16px
    
    // Border radius
    'radius-sm': spacingScale['3'],      // 12px
    'radius-md': spacingScale['4'],      // 16px
    'radius-lg': spacingScale['5'],      // 20px
    'radius-xl': spacingScale['6'],      // 24px
  },
} as const;

/**
 * Get spacing value for a specific key and density
 */
export function getSpacing(
  key: keyof typeof densitySpacing.default,
  density: UIDensity = 'default'
): string {
  return densitySpacing[density][key];
}

/**
 * Spacing utility functions
 */
export const spacing = {
  // Padding utilities
  p: (size: SpacingKey, density?: UIDensity) => 
    density ? getSpacing('card-p', density) : spacingScale[size],
  
  px: (size: SpacingKey, density?: UIDensity) => 
    density ? getSpacing('container-px', density) : spacingScale[size],
  
  py: (size: SpacingKey, density?: UIDensity) => 
    density ? getSpacing('container-py', density) : spacingScale[size],
  
  // Margin utilities
  m: (size: SpacingKey) => spacingScale[size],
  mx: (size: SpacingKey) => spacingScale[size],
  my: (size: SpacingKey) => spacingScale[size],
  mb: (size: SpacingKey, density?: UIDensity) => 
    density ? getSpacing('section-mb', density) : spacingScale[size],
  
  // Gap utilities
  gap: (size: SpacingKey, density?: UIDensity) => 
    density ? getSpacing('element-gap', density) : spacingScale[size],
  
  // Border radius utilities
  radius: (variant: 'sm' | 'md' | 'lg' | 'xl', density?: UIDensity) => 
    density ? getSpacing(`radius-${variant}`, density) : spacingScale['3'],
};

/**
 * CSS custom properties for spacing
 */
export function getSpacingCSSVars(density: UIDensity) {
  const config = densitySpacing[density];
  const vars: Record<string, string> = {};
  
  // Add spacing scale variables
  Object.entries(spacingScale).forEach(([key, value]) => {
    vars[`--spacing-${key}`] = value;
  });
  
  // Add density-specific variables
  Object.entries(config).forEach(([key, value]) => {
    vars[`--${key}`] = value;
  });
  
  return vars;
}

/**
 * Tailwind-compatible spacing classes with 4-point grid
 */
export const spacingClasses = {
  // Padding
  'p-grid-1': 'p-1',    // 4px
  'p-grid-2': 'p-2',    // 8px
  'p-grid-3': 'p-3',    // 12px
  'p-grid-4': 'p-4',    // 16px
  'p-grid-5': 'p-5',    // 20px
  'p-grid-6': 'p-6',    // 24px
  'p-grid-8': 'p-8',    // 32px
  
  // Padding X
  'px-grid-2': 'px-2',  // 8px
  'px-grid-3': 'px-3',  // 12px
  'px-grid-4': 'px-4',  // 16px
  'px-grid-5': 'px-5',  // 20px
  'px-grid-6': 'px-6',  // 24px
  'px-grid-8': 'px-8',  // 32px
  
  // Padding Y
  'py-grid-1': 'py-1',  // 4px
  'py-grid-2': 'py-2',  // 8px
  'py-grid-3': 'py-3',  // 12px
  'py-grid-4': 'py-4',  // 16px
  'py-grid-5': 'py-5',  // 20px
  'py-grid-6': 'py-6',  // 24px
  
  // Margin
  'm-grid-1': 'm-1',    // 4px
  'm-grid-2': 'm-2',    // 8px
  'm-grid-3': 'm-3',    // 12px
  'm-grid-4': 'm-4',    // 16px
  'm-grid-5': 'm-5',    // 20px
  'm-grid-6': 'm-6',    // 24px
  
  // Margin Bottom
  'mb-grid-1': 'mb-1',  // 4px
  'mb-grid-2': 'mb-2',  // 8px
  'mb-grid-3': 'mb-3',  // 12px
  'mb-grid-4': 'mb-4',  // 16px
  'mb-grid-5': 'mb-5',  // 20px
  'mb-grid-6': 'mb-6',  // 24px
  
  // Gap
  'gap-grid-1': 'gap-1', // 4px
  'gap-grid-2': 'gap-2', // 8px
  'gap-grid-3': 'gap-3', // 12px
  'gap-grid-4': 'gap-4', // 16px
  'gap-grid-5': 'gap-5', // 20px
  'gap-grid-6': 'gap-6', // 24px
} as const;