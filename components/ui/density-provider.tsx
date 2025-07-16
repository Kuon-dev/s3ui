'use client';

import { useEffect } from 'react';
import { useUIStateStore } from '@/lib/stores/ui-state-store';
import { generateDensityVariables } from '@/lib/spacing';

/**
 * Provider component that applies UI density settings globally
 * Injects CSS variables into the document root based on current density preference
 */
export function DensityProvider({ children }: { children: React.ReactNode }) {
  const uiDensity = useUIStateStore(state => state.uiDensity);
  
  useEffect(() => {
    // Generate CSS variables for current density
    const variables = generateDensityVariables(uiDensity);
    
    // Apply to document root
    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Also add a data attribute for components that need conditional logic
    root.setAttribute('data-density', uiDensity);
    
    // Apply density-specific classes
    root.classList.remove('density-compact', 'density-default', 'density-spacious');
    root.classList.add(`density-${uiDensity}`);
  }, [uiDensity]);
  
  return <>{children}</>;
}