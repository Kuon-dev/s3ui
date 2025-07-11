'use client';

import { useEffect, useRef } from 'react';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';

interface AutoScrollProps {
  containerRef: React.RefObject<HTMLElement>;
  scrollSpeed?: number;
  edgeSize?: number;
  enabled?: boolean;
}

export function useAutoScroll({ 
  containerRef, 
  scrollSpeed = 10,
  edgeSize = 50,
  enabled = true 
}: AutoScrollProps) {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { draggingItem } = useFileBrowserStore();
  
  useEffect(() => {
    if (!enabled || !draggingItem || !containerRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate relative position
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Clear previous interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      let scrollX = 0;
      let scrollY = 0;
      
      // Check horizontal edges
      if (x < edgeSize) {
        scrollX = -scrollSpeed;
      } else if (x > rect.width - edgeSize) {
        scrollX = scrollSpeed;
      }
      
      // Check vertical edges
      if (y < edgeSize) {
        scrollY = -scrollSpeed;
      } else if (y > rect.height - edgeSize) {
        scrollY = scrollSpeed;
      }
      
      // Start scrolling if needed
      if (scrollX !== 0 || scrollY !== 0) {
        scrollIntervalRef.current = setInterval(() => {
          if (!container) return;
          
          // For vertical scroll
          if (scrollY !== 0) {
            const maxScroll = container.scrollHeight - container.clientHeight;
            const newScrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + scrollY));
            container.scrollTop = newScrollTop;
          }
          
          // For horizontal scroll
          if (scrollX !== 0) {
            const maxScroll = container.scrollWidth - container.clientWidth;
            const newScrollLeft = Math.max(0, Math.min(maxScroll, container.scrollLeft + scrollX));
            container.scrollLeft = newScrollLeft;
          }
        }, 16); // ~60fps
      }
    };
    
    // Add event listeners
    document.addEventListener('dragover', handleMouseMove);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('dragover', handleMouseMove);
      document.removeEventListener('mousemove', handleMouseMove);
      
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [enabled, draggingItem, containerRef, scrollSpeed, edgeSize]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);
}