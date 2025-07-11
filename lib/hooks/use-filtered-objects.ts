import { useMemo } from 'react';
import { R2Object } from '@/lib/r2/operations';
import { useFileSystemStore } from '@/lib/stores/file-system-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useUIStateStore } from '@/lib/stores/ui-state-store';

/**
 * Sort comparator type
 */
type SortComparator = (a: R2Object, b: R2Object) => number;

/**
 * Hook for getting filtered and sorted objects
 * Combines data from multiple stores and applies filters/sorting
 */
export function useFilteredObjects() {
  // Get data from stores
  const currentPath = useNavigationStore(state => state.currentPath);
  const objects = useFileSystemStore(state => state.getObjects(currentPath));
  const {
    searchQuery,
    sortBy,
    sortOrder,
    showHiddenFiles
  } = useUIStateStore();
  
  return useMemo(() => {
    let filtered = [...objects];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(obj => {
        const name = extractObjectName(obj.key, currentPath);
        return name.toLowerCase().includes(query);
      });
    }
    
    // Filter hidden files (starting with .)
    if (!showHiddenFiles) {
      filtered = filtered.filter(obj => {
        const name = extractObjectName(obj.key, currentPath);
        return !name.startsWith('.');
      });
    }
    
    // Filter out objects that shouldn't be visible in current path
    filtered = filtered.filter(obj => {
      // This ensures we only show direct children of the current path
      const relativePath = obj.key.startsWith(currentPath) 
        ? obj.key.slice(currentPath.length).replace(/^\//, '')
        : obj.key;
      
      // For folders, check without trailing slash
      const cleanPath = obj.key.endsWith('/') 
        ? relativePath.slice(0, -1) 
        : relativePath;
      
      // Should not contain any slashes (meaning it's a direct child)
      return !cleanPath.includes('/');
    });
    
    // Sort objects
    const comparator = getSortComparator(sortBy);
    filtered.sort((a, b) => {
      // Always put folders first
      const aIsFolder = a.key.endsWith('/');
      const bIsFolder = b.key.endsWith('/');
      
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      
      // Apply sort comparator
      const result = comparator(a, b);
      
      // Apply sort order
      return sortOrder === 'desc' ? -result : result;
    });
    
    return filtered;
  }, [objects, currentPath, searchQuery, sortBy, sortOrder, showHiddenFiles]);
}

/**
 * Hook for getting filtered folder-only objects
 */
export function useFilteredFolders() {
  const filteredObjects = useFilteredObjects();
  
  return useMemo(() => {
    return filteredObjects.filter(obj => obj.key.endsWith('/'));
  }, [filteredObjects]);
}

/**
 * Hook for getting object counts and stats
 */
export function useObjectStats() {
  const currentPath = useNavigationStore(state => state.currentPath);
  const objects = useFileSystemStore(state => state.getObjects(currentPath));
  const filteredObjects = useFilteredObjects();
  
  return useMemo(() => {
    const totalCount = objects.length;
    const filteredCount = filteredObjects.length;
    
    const folders = filteredObjects.filter(obj => obj.key.endsWith('/'));
    const files = filteredObjects.filter(obj => !obj.key.endsWith('/'));
    
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    return {
      totalCount,
      filteredCount,
      folderCount: folders.length,
      fileCount: files.length,
      totalSize,
      isFiltered: filteredCount < totalCount
    };
  }, [objects, filteredObjects]);
}

/**
 * Extract object name from key
 */
function extractObjectName(key: string, currentPath: string): string {
  // Remove current path prefix
  let name = key;
  if (currentPath && key.startsWith(currentPath)) {
    name = key.slice(currentPath.length);
  }
  
  // Remove leading slash
  name = name.replace(/^\//, '');
  
  // For folders, remove trailing slash
  if (name.endsWith('/')) {
    name = name.slice(0, -1);
  }
  
  // If still has slashes, get just the last part
  if (name.includes('/')) {
    name = name.split('/').pop() || name;
  }
  
  return name;
}

/**
 * Get sort comparator based on sort field
 */
function getSortComparator(sortBy: string): SortComparator {
  switch (sortBy) {
    case 'size':
      return (a, b) => (a.size || 0) - (b.size || 0);
      
    case 'modified':
      return (a, b) => {
        const aTime = a.lastModified?.getTime() || 0;
        const bTime = b.lastModified?.getTime() || 0;
        return aTime - bTime;
      };
      
    case 'name':
    default:
      return (a, b) => {
        const aName = extractObjectName(a.key, '').toLowerCase();
        const bName = extractObjectName(b.key, '').toLowerCase();
        return aName.localeCompare(bName);
      };
  }
}

/**
 * Hook for getting a specific object by key
 */
export function useObject(key: string) {
  const currentPath = useNavigationStore(state => state.currentPath);
  return useFileSystemStore(state => state.getObject(key, currentPath));
}

/**
 * Hook for checking if current view has any objects
 */
export function useHasObjects() {
  const filteredObjects = useFilteredObjects();
  return filteredObjects.length > 0;
}