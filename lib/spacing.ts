/**
 * 4-point grid spacing system for consistent UI
 * Based on macOS design principles
 */

export type SpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48;

export const spacing = {
  0: '0px',
  1: '4px',
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
      xs: spacing[1],
      sm: spacing[2],
      md: spacing[3],
      lg: spacing[4],
      xl: spacing[5],
      '2xl': spacing[6],
      '3xl': spacing[8],
    },
    fontSize: {
      xs: '0.6875rem',  // 11px
      sm: '0.75rem',    // 12px
      base: '0.8125rem', // 13px
      lg: '0.875rem',   // 14px
      xl: '1rem',       // 16px
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.4',
      relaxed: '1.5',
    },
    borderRadius: {
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '10px',
    },
  },
  default: {
    spacing: {
      xs: spacing[2],
      sm: spacing[3],
      md: spacing[4],
      lg: spacing[5],
      xl: spacing[6],
      '2xl': spacing[8],
      '3xl': spacing[10],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.8125rem',  // 13px
      base: '0.875rem', // 14px
      lg: '1rem',       // 16px
      xl: '1.125rem',   // 18px
    },
    lineHeight: {
      tight: '1.375',
      normal: '1.5',
      relaxed: '1.625',
    },
    borderRadius: {
      sm: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px',
    },
  },
  spacious: {
    spacing: {
      xs: spacing[3],
      sm: spacing[4],
      md: spacing[5],
      lg: spacing[6],
      xl: spacing[8],
      '2xl': spacing[10],
      '3xl': spacing[12],
    },
    fontSize: {
      xs: '0.8125rem',  // 13px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
    },
    lineHeight: {
      tight: '1.5',
      normal: '1.625',
      relaxed: '1.75',
    },
    borderRadius: {
      sm: '8px',
      md: '10px',
      lg: '12px',
      xl: '14px',
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