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
        ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1'
        : uiDensity === 'spacious'
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
    ),
    
    // Grid item padding
    gridItemPadding: cn(
      uiDensity === 'compact' ? 'p-0.5' : uiDensity === 'spacious' ? 'p-5' : 'p-2'
    ),
    
    // List item padding
    listItemPadding: cn(
      uiDensity === 'compact' ? 'px-1.5 py-0.5' : uiDensity === 'spacious' ? 'px-5 py-3' : 'px-3 py-1.5'
    ),
    
    // Button sizes
    buttonSize: cn(
      uiDensity === 'compact' ? 'h-6 px-1.5 text-[10px]' : uiDensity === 'spacious' ? 'h-11 px-5 text-base' : 'h-8 px-3 text-sm'
    ),
    
    // Icon sizes
    iconSize: cn(
      uiDensity === 'compact' ? 'h-3 w-3' : uiDensity === 'spacious' ? 'h-6 w-6' : 'h-4 w-4'
    ),
    
    // Large icon sizes (for file icons)
    largeIconSize: cn(
      uiDensity === 'compact' ? 'h-6 w-6' : uiDensity === 'spacious' ? 'h-14 w-14' : 'h-9 w-9'
    ),
    
    // Text sizes
    textSize: cn(
      uiDensity === 'compact' ? 'text-[10px]' : uiDensity === 'spacious' ? 'text-base' : 'text-xs'
    ),
    
    // Section spacing
    sectionSpacing: cn(
      uiDensity === 'compact' ? 'space-y-1' : uiDensity === 'spacious' ? 'space-y-8' : 'space-y-3'
    ),
    
    // Modal/Dialog padding
    dialogPadding: cn(
      uiDensity === 'compact' ? 'p-3' : uiDensity === 'spacious' ? 'p-10' : 'p-5'
    ),
    
    // Border radius
    borderRadius: cn(
      uiDensity === 'compact' ? 'rounded' : uiDensity === 'spacious' ? 'rounded-xl' : 'rounded-lg'
    ),
    
    // Get specific spacing value
    getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
      const spacingMap = {
        compact: { xs: '0.125rem', sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem' },
        default: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
        spacious: { xs: '0.75rem', sm: '1rem', md: '1.25rem', lg: '1.5rem', xl: '2rem' },
      };
      return spacingMap[uiDensity][size];
    },
    
    // Animation duration
    animationDuration: uiDensity === 'compact' ? 100 : uiDensity === 'spacious' ? 300 : 150,
  };
}