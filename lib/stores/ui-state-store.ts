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
 * UI Density options
 */
export type UIDensity = 'compact' | 'default' | 'spacious';

/**
 * Date format options
 */
export type DateFormat = 'relative' | 'short' | 'long';

/**
 * Size format options
 */
export type SizeFormat = 'auto' | 'bytes' | 'decimal';

/**
 * Theme options
 */
export type Theme = 'dark' | 'light' | 'system';

/**
 * Accent color options
 */
export type AccentColor = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan';

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
  
  // Appearance settings
  theme: Theme;
  accentColor: AccentColor;
  uiDensity: UIDensity;
  showAnimations: boolean;
  reduceMotion: boolean;
  
  // File display settings
  showFileExtensions: boolean;
  dateFormat: DateFormat;
  sizeFormat: SizeFormat;
  groupFoldersFirst: boolean;
  showThumbnails: boolean;
  thumbnailSize: number;
  
  // Behavior settings
  confirmDelete: boolean;
  confirmBulkOperations: boolean;
  doubleClickAction: 'open' | 'preview';
  autoRefreshInterval: number; // 0 = disabled
  searchIncludeContent: boolean;
  
  // Advanced settings
  maxConcurrentUploads: number;
  uploadChunkSize: number; // in MB
  enableServiceWorker: boolean;
  cacheEnabled: boolean;
  cacheDuration: number; // in minutes
  
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
  
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  
  // Drop zone state
  dropTargetPath: string | null;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  setShowHiddenFiles: (show: boolean) => void;
  
  // Settings actions
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setUIDensity: (density: UIDensity) => void;
  setShowAnimations: (show: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  
  setShowFileExtensions: (show: boolean) => void;
  setDateFormat: (format: DateFormat) => void;
  setSizeFormat: (format: SizeFormat) => void;
  setGroupFoldersFirst: (group: boolean) => void;
  setShowThumbnails: (show: boolean) => void;
  setThumbnailSize: (size: number) => void;
  
  setConfirmDelete: (confirm: boolean) => void;
  setConfirmBulkOperations: (confirm: boolean) => void;
  setDoubleClickAction: (action: 'open' | 'preview') => void;
  setAutoRefreshInterval: (interval: number) => void;
  setSearchIncludeContent: (include: boolean) => void;
  
  setMaxConcurrentUploads: (max: number) => void;
  setUploadChunkSize: (size: number) => void;
  setEnableServiceWorker: (enable: boolean) => void;
  setCacheEnabled: (enable: boolean) => void;
  setCacheDuration: (duration: number) => void;
  
  resetSettings: () => void;
  
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
// Global search doesn't follow the Dialog naming pattern

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
        
        // View preferences
        viewMode: 'list',
        sortBy: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        
        // Appearance settings
        theme: 'dark',
        accentColor: 'blue',
        uiDensity: 'default',
        showAnimations: true,
        reduceMotion: false,
        
        // File display settings
        showFileExtensions: true,
        dateFormat: 'relative',
        sizeFormat: 'auto',
        groupFoldersFirst: true,
        showThumbnails: true,
        thumbnailSize: 80,
        
        // Behavior settings
        confirmDelete: true,
        confirmBulkOperations: true,
        doubleClickAction: 'open',
        autoRefreshInterval: 0,
        searchIncludeContent: false,
        
        // Advanced settings
        maxConcurrentUploads: 3,
        uploadChunkSize: 5,
        enableServiceWorker: true,
        cacheEnabled: true,
        cacheDuration: 15,
        
        // Search state
        searchQuery: '',
        globalSearchQuery: '',
        searchDebounceMs: 300,
        
        // Drop zone state
        dropTargetPath: null,
        
        // Dialog states
        showGlobalSearch: false,
        setShowGlobalSearch: (show: boolean) => {
          set({ showGlobalSearch: show });
        },
        
        showSettings: false,
        setShowSettings: (show: boolean) => {
          set({ showSettings: show });
        },
        
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
        
        // Settings actions - Appearance
        setTheme: (theme: Theme) => {
          set({ theme });
        },
        
        setAccentColor: (color: AccentColor) => {
          set({ accentColor: color });
        },
        
        setUIDensity: (density: UIDensity) => {
          set({ uiDensity: density });
        },
        
        setShowAnimations: (show: boolean) => {
          set({ showAnimations: show });
        },
        
        setReduceMotion: (reduce: boolean) => {
          set({ reduceMotion: reduce });
        },
        
        // Settings actions - File Display
        setShowFileExtensions: (show: boolean) => {
          set({ showFileExtensions: show });
        },
        
        setDateFormat: (format: DateFormat) => {
          set({ dateFormat: format });
        },
        
        setSizeFormat: (format: SizeFormat) => {
          set({ sizeFormat: format });
        },
        
        setGroupFoldersFirst: (group: boolean) => {
          set({ groupFoldersFirst: group });
        },
        
        setShowThumbnails: (show: boolean) => {
          set({ showThumbnails: show });
        },
        
        setThumbnailSize: (size: number) => {
          set({ thumbnailSize: size });
        },
        
        // Settings actions - Behavior
        setConfirmDelete: (confirm: boolean) => {
          set({ confirmDelete: confirm });
        },
        
        setConfirmBulkOperations: (confirm: boolean) => {
          set({ confirmBulkOperations: confirm });
        },
        
        setDoubleClickAction: (action: 'open' | 'preview') => {
          set({ doubleClickAction: action });
        },
        
        setAutoRefreshInterval: (interval: number) => {
          set({ autoRefreshInterval: interval });
        },
        
        setSearchIncludeContent: (include: boolean) => {
          set({ searchIncludeContent: include });
        },
        
        // Settings actions - Advanced
        setMaxConcurrentUploads: (max: number) => {
          set({ maxConcurrentUploads: max });
        },
        
        setUploadChunkSize: (size: number) => {
          set({ uploadChunkSize: size });
        },
        
        setEnableServiceWorker: (enable: boolean) => {
          set({ enableServiceWorker: enable });
        },
        
        setCacheEnabled: (enable: boolean) => {
          set({ cacheEnabled: enable });
        },
        
        setCacheDuration: (duration: number) => {
          set({ cacheDuration: duration });
        },
        
        // Reset settings to defaults
        resetSettings: () => {
          set({
            // Appearance
            theme: 'dark',
            accentColor: 'blue',
            uiDensity: 'default',
            showAnimations: true,
            reduceMotion: false,
            // File display
            showFileExtensions: true,
            dateFormat: 'relative',
            sizeFormat: 'auto',
            groupFoldersFirst: true,
            showThumbnails: true,
            thumbnailSize: 80,
            // Behavior
            confirmDelete: true,
            confirmBulkOperations: true,
            doubleClickAction: 'open',
            autoRefreshInterval: 0,
            searchIncludeContent: false,
            // Advanced
            maxConcurrentUploads: 3,
            uploadChunkSize: 5,
            enableServiceWorker: true,
            cacheEnabled: true,
            cacheDuration: 15
          });
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
            showGlobalSearch: false,
            showSettings: false
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
            state.showGlobalSearch ||
            state.showSettings
          );
        }
      };
    },
    {
      name: 'ui-state-store',
      // Only persist user preferences, not temporary UI state
      partialize: (state) => ({
        // View preferences
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        showHiddenFiles: state.showHiddenFiles,
        searchDebounceMs: state.searchDebounceMs,
        
        // Appearance settings
        theme: state.theme,
        accentColor: state.accentColor,
        uiDensity: state.uiDensity,
        showAnimations: state.showAnimations,
        reduceMotion: state.reduceMotion,
        
        // File display settings
        showFileExtensions: state.showFileExtensions,
        dateFormat: state.dateFormat,
        sizeFormat: state.sizeFormat,
        groupFoldersFirst: state.groupFoldersFirst,
        showThumbnails: state.showThumbnails,
        thumbnailSize: state.thumbnailSize,
        
        // Behavior settings
        confirmDelete: state.confirmDelete,
        confirmBulkOperations: state.confirmBulkOperations,
        doubleClickAction: state.doubleClickAction,
        autoRefreshInterval: state.autoRefreshInterval,
        searchIncludeContent: state.searchIncludeContent,
        
        // Advanced settings
        maxConcurrentUploads: state.maxConcurrentUploads,
        uploadChunkSize: state.uploadChunkSize,
        enableServiceWorker: state.enableServiceWorker,
        cacheEnabled: state.cacheEnabled,
        cacheDuration: state.cacheDuration
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

// Individual selectors for settings to avoid infinite loops

export const useShowSettings = () => useUIStateStore(state => state.showSettings);
export const useSetShowSettings = () => useUIStateStore(state => state.setShowSettings);