import { useUIStateStore } from '@/lib/stores/ui-state-store';
import { cn } from '@/lib/utils';

/**
 * Hook to get density-aware classes for components
 */
export function useDensityClasses() {
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  return {
    // Grid layout classes
    gridCols: cn(
      'grid',
      uiDensity === 'compact' 
        ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5'
        : uiDensity === 'spacious'
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5'
    ),
    
    // Grid item padding
    gridItemPadding: cn(
      uiDensity === 'compact' ? 'p-1.5' : uiDensity === 'spacious' ? 'p-4' : 'p-2.5'
    ),
    
    // List item padding
    listItemPadding: cn(
      uiDensity === 'compact' ? 'px-2 py-1' : uiDensity === 'spacious' ? 'px-4 py-3' : 'px-3 py-2'
    ),
    
    // Button sizes
    buttonSize: cn(
      uiDensity === 'compact' ? 'h-7 px-2 text-xs' : uiDensity === 'spacious' ? 'h-10 px-4' : 'h-9 px-3'
    ),
    
    // Icon sizes
    iconSize: cn(
      uiDensity === 'compact' ? 'h-3.5 w-3.5' : uiDensity === 'spacious' ? 'h-5 w-5' : 'h-4 w-4'
    ),
    
    // Large icon sizes (for file icons)
    largeIconSize: cn(
      uiDensity === 'compact' ? 'h-8 w-8' : uiDensity === 'spacious' ? 'h-12 w-12' : 'h-10 w-10'
    ),
    
    // Text sizes
    textSize: cn(
      uiDensity === 'compact' ? 'text-xs' : uiDensity === 'spacious' ? 'text-base' : 'text-sm'
    ),
    
    // Section spacing
    sectionSpacing: cn(
      uiDensity === 'compact' ? 'space-y-3' : uiDensity === 'spacious' ? 'space-y-6' : 'space-y-4'
    ),
    
    // Modal/Dialog padding
    dialogPadding: cn(
      uiDensity === 'compact' ? 'p-4' : uiDensity === 'spacious' ? 'p-8' : 'p-6'
    ),
    
    // Border radius
    borderRadius: cn(
      uiDensity === 'compact' ? 'rounded-md' : uiDensity === 'spacious' ? 'rounded-xl' : 'rounded-lg'
    ),
    
    // Get specific spacing value
    getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
      const spacingMap = {
        compact: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem' },
        default: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
        spacious: { xs: '0.75rem', sm: '1rem', md: '1.25rem', lg: '1.5rem', xl: '2rem' },
      };
      return spacingMap[uiDensity][size];
    },
    
    // Animation duration
    animationDuration: uiDensity === 'compact' ? 150 : uiDensity === 'spacious' ? 250 : 200,
  };
}