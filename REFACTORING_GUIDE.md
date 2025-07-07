# File Browser Refactoring Guide

## Overview

The file browser has been refactored to use Zustand for global state management and React Query (TanStack Query) for data fetching. This solves the navigation refresh issues and provides better performance through caching.

## Key Changes

### 1. State Management (Zustand)

Created `/lib/stores/file-browser-store.ts` which manages:
- Navigation state (currentPath, expandedPaths)
- UI state (viewMode, searchQuery, dialogs)
- Data state (objects, selectedObject, treeData)
- Persistent storage for user preferences

### 2. Data Fetching (React Query)

Created `/lib/hooks/use-r2-queries.ts` which provides:
- `useR2Objects` - Fetches objects in a folder with caching
- `useR2FolderTree` - Fetches folder tree structure
- `useR2Search` - Handles global search functionality
- Mutations for create, delete, rename operations
- Automatic cache invalidation on data changes

### 3. Component Updates

#### R2FileTreeRefactored (`/components/r2/r2-file-tree-refactored.tsx`)
- Uses Zustand store for navigation state
- Leverages React Query for lazy-loading folder contents
- Prevents page refreshes on navigation
- Prefetches folder contents on hover for better UX
- Maintains expanded/collapsed state persistently

#### FileBrowserRefactored (`/components/r2/file-browser-refactored.tsx`)
- Centralized state management through Zustand
- React Query for data fetching with automatic refetch
- Maintains all existing functionality
- Better separation of concerns

### 4. Performance Improvements

- **No Page Refreshes**: Navigation now updates state without reloading
- **Data Caching**: React Query caches API responses for 30-60 seconds
- **Prefetching**: Hovering on folders prefetches their contents
- **Persistent State**: View mode and expanded folders persist across sessions
- **Optimistic Updates**: UI updates immediately while data loads

## Migration Path

To use the refactored components:

1. Import from refactored versions:
   ```typescript
   import { FileBrowserRefactored } from '@/components/r2/file-browser-refactored';
   import { R2FileTreeRefactored } from '@/components/r2/r2-file-tree-refactored';
   ```

2. The API remains the same, so no changes needed in parent components

3. All existing features work identically, just with better performance

## Benefits

1. **Better UX**: No more full page refreshes when navigating folders
2. **Performance**: Caching reduces API calls and improves response times
3. **State Persistence**: User preferences are saved across sessions
4. **Developer Experience**: Cleaner code with separation of concerns
5. **Scalability**: Easier to add new features with centralized state

## Next Steps

The refactoring is complete and tested. The application now handles navigation smoothly without refreshes, and the sidebar properly maintains state when navigating nested folders like `root > audio > city`.