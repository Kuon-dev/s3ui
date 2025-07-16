/**
 * 4-point grid spacing system for consistent UI
 * Based on macOS design principles
 */

export type SpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48;

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
} as const;

export type UIDensityConfig = {
  compact: {
    spacing: Record<string, string>;
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
    borderRadius: Record<string, string>;
  };
  default: {
    spacing: Record<string, string>;
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
    borderRadius: Record<string, string>;
  };
  spacious: {
    spacing: Record<string, string>;
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
    borderRadius: Record<string, string>;
  };
};

export const densityConfig: UIDensityConfig = {
  compact: {
    spacing: {
      xs: spacing[0.5],  // 2px
      sm: spacing[1],    // 4px
      md: spacing[1.5],  // 6px
      lg: spacing[2],    // 8px
      xl: spacing[3],    // 12px
      '2xl': spacing[4], // 16px
      '3xl': spacing[5], // 20px
    },
    fontSize: {
      xs: '0.625rem',   // 10px
      sm: '0.6875rem',  // 11px
      base: '0.75rem',  // 12px
      lg: '0.8125rem',  // 13px
      xl: '0.875rem',   // 14px
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.3',
      relaxed: '1.4',
    },
    borderRadius: {
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
    },
  },
  default: {
    spacing: {
      xs: spacing[1],    // 4px
      sm: spacing[2],    // 8px
      md: spacing[3],    // 12px
      lg: spacing[4],    // 16px
      xl: spacing[5],    // 20px
      '2xl': spacing[6], // 24px
      '3xl': spacing[8], // 32px
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.8125rem',  // 13px
      base: '0.875rem', // 14px
      lg: '0.9375rem',  // 15px
      xl: '1rem',       // 16px
    },
    lineHeight: {
      tight: '1.3',
      normal: '1.45',
      relaxed: '1.6',
    },
    borderRadius: {
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '10px',
    },
  },
  spacious: {
    spacing: {
      xs: spacing[2],    // 8px
      sm: spacing[3],    // 12px
      md: spacing[4],    // 16px
      lg: spacing[6],    // 24px
      xl: spacing[8],    // 32px
      '2xl': spacing[10], // 40px
      '3xl': spacing[12], // 48px
    },
    fontSize: {
      xs: '0.875rem',   // 14px
      sm: '1rem',       // 16px
      base: '1.125rem', // 18px
      lg: '1.25rem',    // 20px
      xl: '1.5rem',     // 24px
    },
    lineHeight: {
      tight: '1.5',
      normal: '1.7',
      relaxed: '1.9',
    },
    borderRadius: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
    },
  },
};

/**
 * Get spacing value based on UI density
 */
export function getSpacing(
  key: keyof UIDensityConfig['default']['spacing'],
  density: keyof UIDensityConfig = 'default'
): string {
  return densityConfig[density].spacing[key];
}

/**
 * Get font size based on UI density
 */
export function getFontSize(
  key: keyof UIDensityConfig['default']['fontSize'],
  density: keyof UIDensityConfig = 'default'
): string {
  return densityConfig[density].fontSize[key];
}

/**
 * Get line height based on UI density
 */
export function getLineHeight(
  key: keyof UIDensityConfig['default']['lineHeight'],
  density: keyof UIDensityConfig = 'default'
): string {
  return densityConfig[density].lineHeight[key];
}

/**
 * Get border radius based on UI density
 */
export function getBorderRadius(
  key: keyof UIDensityConfig['default']['borderRadius'],
  density: keyof UIDensityConfig = 'default'
): string {
  return densityConfig[density].borderRadius[key];
}

/**
 * Generate CSS variables for current density
 */
export function generateDensityVariables(density: keyof UIDensityConfig = 'default'): Record<string, string> {
  const config = densityConfig[density];
  
  return {
    // Spacing
    '--spacing-xs': config.spacing.xs,
    '--spacing-sm': config.spacing.sm,
    '--spacing-md': config.spacing.md,
    '--spacing-lg': config.spacing.lg,
    '--spacing-xl': config.spacing.xl,
    '--spacing-2xl': config.spacing['2xl'],
    '--spacing-3xl': config.spacing['3xl'],
    
    // Font sizes
    '--font-size-xs': config.fontSize.xs,
    '--font-size-sm': config.fontSize.sm,
    '--font-size-base': config.fontSize.base,
    '--font-size-lg': config.fontSize.lg,
    '--font-size-xl': config.fontSize.xl,
    
    // Line heights
    '--line-height-tight': config.lineHeight.tight,
    '--line-height-normal': config.lineHeight.normal,
    '--line-height-relaxed': config.lineHeight.relaxed,
    
    // Border radius
    '--radius-sm': config.borderRadius.sm,
    '--radius-md': config.borderRadius.md,
    '--radius-lg': config.borderRadius.lg,
    '--radius-xl': config.borderRadius.xl,
  };
}