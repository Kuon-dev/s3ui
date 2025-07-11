import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  createLoadingSlice, 
  LoadingSlice,
  createDialogSlice,
  createDebouncedSetter
} from './utils/store-helpers';

/**
 * View mode options
 */
export type ViewMode = 'list' | 'grid';

/**
 * Sort options
 */
export type SortBy = 'name' | 'size' | 'modified';
export type SortOrder = 'asc' | 'desc';

/**
 * UI State Store
 * Manages UI preferences, dialogs, search, and loading states
 */
export interface UIState extends LoadingSlice {
  // View preferences
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  showHiddenFiles: boolean;
  
  // Search state
  searchQuery: string;
  globalSearchQuery: string;
  searchDebounceMs: number;
  
  // Dialog states (using generic dialog slice)
  showUploadDialog: boolean;
  setShowUploadDialog: (show: boolean) => void;
  
  showCreateFolderDialog: boolean;
  setShowCreateFolderDialog: (show: boolean) => void;
  
  showRenameDialog: boolean;
  setShowRenameDialog: (show: boolean) => void;
  
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  
  showPreviewDialog: boolean;
  setShowPreviewDialog: (show: boolean) => void;
  
  showGlobalSearch: boolean;
  setShowGlobalSearch: (show: boolean) => void;
  
  // Drop zone state
  dropTargetPath: string | null;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  setShowHiddenFiles: (show: boolean) => void;
  
  setSearchQuery: (query: string) => void;
  setGlobalSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  setDropTargetPath: (path: string | null) => void;
  
  // Dialog management helpers
  closeAllDialogs: () => void;
  isAnyDialogOpen: () => boolean;
  
  // Debounced search setters
  debouncedSetSearchQuery?: (query: string) => void;
  debouncedSetGlobalSearchQuery?: (query: string) => void;
}

// Create individual dialog slices
const uploadDialogSlice = createDialogSlice('Upload');
const createFolderDialogSlice = createDialogSlice('CreateFolder');
const renameDialogSlice = createDialogSlice('Rename');
const deleteDialogSlice = createDialogSlice('Delete');
const previewDialogSlice = createDialogSlice('Preview');
const globalSearchSlice = createDialogSlice('GlobalSearch');

export const useUIStateStore = create<UIState>()(
  persist(
    (set, get, api) => {
      // Create debounced setters
      const debouncedSetSearchQuery = createDebouncedSetter<string>(
        (query) => set({ searchQuery: query }),
        300
      );
      
      const debouncedSetGlobalSearchQuery = createDebouncedSetter<string>(
        (query) => set({ globalSearchQuery: query }),
        300
      );
      
      return {
        // Combine all slices
        ...createLoadingSlice(set, get, api),
        ...uploadDialogSlice(set, get, api),
        ...createFolderDialogSlice(set, get, api),
        ...renameDialogSlice(set, get, api),
        ...deleteDialogSlice(set, get, api),
        ...previewDialogSlice(set, get, api),
        ...globalSearchSlice(set, get, api),
        
        // View preferences
        viewMode: 'list',
        sortBy: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        
        // Search state
        searchQuery: '',
        globalSearchQuery: '',
        searchDebounceMs: 300,
        
        // Drop zone state
        dropTargetPath: null,
        
        // Debounced setters
        debouncedSetSearchQuery,
        debouncedSetGlobalSearchQuery,
        
        // View actions
        setViewMode: (mode: ViewMode) => {
          set({ viewMode: mode });
        },
        
        setSortBy: (sortBy: SortBy) => {
          set({ sortBy });
        },
        
        setSortOrder: (order: SortOrder) => {
          set({ sortOrder: order });
        },
        
        toggleSortOrder: () => {
          set((state) => ({
            sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
          }));
        },
        
        setShowHiddenFiles: (show: boolean) => {
          set({ showHiddenFiles: show });
        },
        
        // Search actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },
        
        setGlobalSearchQuery: (query: string) => {
          set({ globalSearchQuery: query });
        },
        
        clearSearch: () => {
          set({ searchQuery: '', globalSearchQuery: '' });
        },
        
        // Drop zone
        setDropTargetPath: (path: string | null) => {
          set({ dropTargetPath: path });
        },
        
        // Dialog helpers
        closeAllDialogs: () => {
          set({
            showUploadDialog: false,
            showCreateFolderDialog: false,
            showRenameDialog: false,
            showDeleteDialog: false,
            showPreviewDialog: false,
            showGlobalSearch: false
          });
        },
        
        isAnyDialogOpen: () => {
          const state = get();
          return (
            state.showUploadDialog ||
            state.showCreateFolderDialog ||
            state.showRenameDialog ||
            state.showDeleteDialog ||
            state.showPreviewDialog ||
            state.showGlobalSearch
          );
        }
      };
    },
    {
      name: 'ui-state-store',
      // Only persist user preferences, not temporary UI state
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        showHiddenFiles: state.showHiddenFiles,
        searchDebounceMs: state.searchDebounceMs
      })
    }
  )
);

// Selectors
export const useViewMode = () =>
  useUIStateStore(state => state.viewMode);

export const useSortSettings = () =>
  useUIStateStore(state => ({
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    setSortBy: state.setSortBy,
    toggleSortOrder: state.toggleSortOrder
  }));

export const useSearchQuery = () =>
  useUIStateStore(state => state.searchQuery);

export const useGlobalSearchQuery = () =>
  useUIStateStore(state => state.globalSearchQuery);

export const useDialogState = (dialogName: keyof Pick<UIState, 
  'showUploadDialog' | 'showCreateFolderDialog' | 'showRenameDialog' | 
  'showDeleteDialog' | 'showPreviewDialog' | 'showGlobalSearch'
>) => {
  return useUIStateStore(state => state[dialogName]);
};

export const useUIActions = () =>
  useUIStateStore(state => ({
    setViewMode: state.setViewMode,
    setSearchQuery: state.debouncedSetSearchQuery || state.setSearchQuery,
    setGlobalSearchQuery: state.debouncedSetGlobalSearchQuery || state.setGlobalSearchQuery,
    clearSearch: state.clearSearch,
    closeAllDialogs: state.closeAllDialogs
  }));