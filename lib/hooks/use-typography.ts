import { useUIStateStore } from '@/lib/stores/ui-state-store';
import { createTypographyUtils } from '@/lib/utils/typography';
import { useMemo } from 'react';

/**
 * Hook to get typography utilities based on current UI density
 * 
 * @example
 * const { h1, body, label } = useTypography();
 * 
 * <h1 className={h1()}>Main Title</h1>
 * <p className={body()}>Body text</p>
 * <label className={label()}>Form Label</label>
 */
export function useTypography() {
  const density = useUIStateStore((state) => state.uiDensity);
  
  return useMemo(() => createTypographyUtils(density), [density]);
}