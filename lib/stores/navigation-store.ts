import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FolderTreeNode } from '@/lib/r2/operations';
import { fileEventBus } from '@/lib/utils/file-event-bus';
import { broadcastFolderExpansion } from '@/lib/utils/cross-tab-sync';

/**
 * Navigation Store
 * Responsible for managing current path and folder expansion state
 */
export interface NavigationState {
  // Current navigation state
  currentPath: string;
  breadcrumbs: Array<{ name: string; path: string }>;
  
  // Folder expansion state
  expandedFolders: Set<string>;
  loadedFolders: Set<string>;
  
  // Navigation history
  history: string[];
  historyIndex: number;
  
  // Actions
  navigateToPath: (path: string, addToHistory?: boolean) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  canNavigateBack: () => boolean;
  canNavigateForward: () => boolean;
  
  // Folder expansion
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  toggleFolder: (path: string) => void;
  expandPathToFolder: (targetPath: string) => void;
  collapseAll: () => void;
  expandAllFrom: (basePath: string) => Promise<void>;
  collapseAllFrom: (basePath: string) => void;
  isExpanded: (path: string) => boolean;
  
  // Loaded folders tracking
  markFolderAsLoaded: (path: string) => void;
  isFolderLoaded: (path: string) => boolean;
  
  // Breadcrumb management
  updateBreadcrumbs: () => void;
  getBreadcrumbPath: (index: number) => string;
}

// Set up event listeners
let eventListenersSetup = false;

function setupEventListeners() {
  if (eventListenersSetup) return;
  eventListenersSetup = true;

  // Listen for folder rename events
  fileEventBus.on('folder.renamed', (event) => {
    const { oldPath, newPath } = event.payload;
    if (!oldPath || !newPath) return;

    const store = useNavigationStore.getState();
    const { currentPath, expandedFolders, history, navigateToPath } = store;

    // Remove trailing slashes for comparison
    const oldFolderPath = oldPath.endsWith('/') ? oldPath.slice(0, -1) : oldPath;
    const newFolderPath = newPath.endsWith('/') ? newPath.slice(0, -1) : newPath;

    // Update current path if affected
    if (currentPath === oldFolderPath || currentPath.startsWith(oldFolderPath + '/')) {
      const updatedPath = currentPath === oldFolderPath
        ? newFolderPath
        : newFolderPath + currentPath.substring(oldFolderPath.length);
      navigateToPath(updatedPath, false);
    }

    // Update expanded folders
    const newExpandedFolders = new Set<string>();
    expandedFolders.forEach(expandedPath => {
      if (expandedPath === oldFolderPath || expandedPath.startsWith(oldFolderPath + '/')) {
        const updatedPath = expandedPath === oldFolderPath
          ? newFolderPath
          : newFolderPath + expandedPath.substring(oldFolderPath.length);
        newExpandedFolders.add(updatedPath);
      } else {
        newExpandedFolders.add(expandedPath);
      }
    });

    // Update history
    const newHistory = history.map(historyPath => {
      if (historyPath === oldFolderPath || historyPath.startsWith(oldFolderPath + '/')) {
        return historyPath === oldFolderPath
          ? newFolderPath
          : newFolderPath + historyPath.substring(oldFolderPath.length);
      }
      return historyPath;
    });

    useNavigationStore.setState({
      expandedFolders: newExpandedFolders,
      history: newHistory
    });
  });

  // Listen for folder deletion events
  fileEventBus.on('folder.deleted', (event) => {
    const { path } = event.payload;
    if (!path) return;

    const store = useNavigationStore.getState();
    const { currentPath, expandedFolders, navigateToPath } = store;
    const deletedFolderPath = path.endsWith('/') ? path.slice(0, -1) : path;

    // Navigate to parent if current path is deleted
    if (currentPath === deletedFolderPath || currentPath.startsWith(deletedFolderPath + '/')) {
      const parentPath = deletedFolderPath.includes('/')
        ? deletedFolderPath.substring(0, deletedFolderPath.lastIndexOf('/'))
        : '';
      navigateToPath(parentPath);
    }

    // Remove deleted folder and its children from expanded folders
    const newExpandedFolders = new Set<string>();
    expandedFolders.forEach(expandedPath => {
      if (expandedPath !== deletedFolderPath && !expandedPath.startsWith(deletedFolderPath + '/')) {
        newExpandedFolders.add(expandedPath);
      }
    });

    useNavigationStore.setState({ expandedFolders: newExpandedFolders });
  });
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPath: '',
      breadcrumbs: [{ name: 'Root', path: '' }],
      expandedFolders: new Set<string>(),
      loadedFolders: new Set<string>(['', '/']),
      history: [''],
      historyIndex: 0,
      
      // Navigation actions
      navigateToPath: (path: string, addToHistory: boolean = true) => {
        const state = get();
        
        // Don't navigate to the same path
        if (path === state.currentPath) return;
        
        set((state) => {
          let newHistory = state.history;
          let newHistoryIndex = state.historyIndex;
          
          if (addToHistory) {
            // Remove any forward history when navigating to a new path
            newHistory = [...state.history.slice(0, state.historyIndex + 1), path];
            newHistoryIndex = newHistory.length - 1;
          }
          
          return {
            currentPath: path,
            history: newHistory,
            historyIndex: newHistoryIndex
          };
        });
        
        // Update breadcrumbs
        get().updateBreadcrumbs();
      },
      
      navigateBack: () => {
        const state = get();
        if (!state.canNavigateBack()) return;
        
        const newIndex = state.historyIndex - 1;
        const newPath = state.history[newIndex];
        
        set({
          currentPath: newPath,
          historyIndex: newIndex
        });
        
        get().updateBreadcrumbs();
      },
      
      navigateForward: () => {
        const state = get();
        if (!state.canNavigateForward()) return;
        
        const newIndex = state.historyIndex + 1;
        const newPath = state.history[newIndex];
        
        set({
          currentPath: newPath,
          historyIndex: newIndex
        });
        
        get().updateBreadcrumbs();
      },
      
      canNavigateBack: () => {
        const state = get();
        return state.historyIndex > 0;
      },
      
      canNavigateForward: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },
      
      // Folder expansion
      expandFolder: (path: string) => {
        set((state) => ({
          expandedFolders: new Set(state.expandedFolders).add(path)
        }));
      },
      
      collapseFolder: (path: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          newExpanded.delete(path);
          
          // Also collapse all child folders
          newExpanded.forEach(expandedPath => {
            if (expandedPath.startsWith(path + '/')) {
              newExpanded.delete(expandedPath);
            }
          });
          
          // Broadcast collapse change to other tabs
          broadcastFolderExpansion(newExpanded);
          
          return { expandedFolders: newExpanded };
        });
      },
      
      toggleFolder: (path: string) => {
        const state = get();
        if (state.isExpanded(path)) {
          state.collapseFolder(path);
        } else {
          state.expandFolder(path);
        }
      },
      
      expandPathToFolder: (targetPath: string) => {
        // Expand all parent folders leading to the target
        const parts = targetPath.split('/').filter(Boolean);
        let currentPath = '';
        
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          
          for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            newExpanded.add(currentPath);
          }
          
          return { expandedFolders: newExpanded };
        });
      },
      
      collapseAll: () => {
        set({ expandedFolders: new Set<string>() });
      },
      
      expandAllFrom: async (basePath: string) => {
        // Get reference to file browser store to access folder tree
        const fileBrowserStore = (await import('./file-browser-store')).useFileBrowserStore.getState();
        const { markFolderAsLoaded } = get();
        
        // Helper function to recursively collect all folder paths
        const collectFolderPaths = (nodes: FolderTreeNode[]): string[] => {
          let paths: string[] = [];
          
          for (const node of nodes) {
            if (node.isFolder !== false) { // Default to folder
              const nodePath = node.path;
              paths.push(nodePath);
              
              // Mark as loaded so UI knows it's safe to expand
              markFolderAsLoaded(nodePath);
              
              if (node.children && node.children.length > 0) {
                paths = paths.concat(collectFolderPaths(node.children));
              }
            }
          }
          
          return paths;
        };
        
        // First, ensure the base folder is loaded
        await fileBrowserStore.loadFolderTree(basePath);
        
        // Get all folders starting from basePath
        const folderTree = fileBrowserStore.folderTree;
        let foldersToExpand: string[] = [basePath];
        
        if (basePath === '') {
          // Expand all folders from root
          foldersToExpand = foldersToExpand.concat(collectFolderPaths(folderTree));
        } else {
          // Find the node in the tree and expand all its children
          const findNode = (nodes: FolderTreeNode[], targetPath: string): FolderTreeNode | null => {
            for (const node of nodes) {
              if (node.path === targetPath) return node;
              if (node.children) {
                const found = findNode(node.children, targetPath);
                if (found) return found;
              }
            }
            return null;
          };
          
          const targetNode = findNode(folderTree, basePath);
          if (targetNode && targetNode.children) {
            foldersToExpand = foldersToExpand.concat(collectFolderPaths(targetNode.children));
          }
        }
        
        // Update expanded folders
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          foldersToExpand.forEach(path => newExpanded.add(path));
          return { expandedFolders: newExpanded };
        });
      },
      
      collapseAllFrom: (basePath: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          
          // Collapse the base path and all its children
          newExpanded.delete(basePath);
          
          // Collapse all child folders
          newExpanded.forEach(expandedPath => {
            if (expandedPath.startsWith(basePath + '/') || (basePath === '' && expandedPath !== '')) {
              newExpanded.delete(expandedPath);
            }
          });
          
          return { expandedFolders: newExpanded };
        });
      },
      
      isExpanded: (path: string) => {
        return get().expandedFolders.has(path);
      },
      
      // Loaded folders tracking
      markFolderAsLoaded: (path: string) => {
        set((state) => ({
          loadedFolders: new Set(state.loadedFolders).add(path)
        }));
      },
      
      isFolderLoaded: (path: string) => {
        return get().loadedFolders.has(path);
      },
      
      // Breadcrumb management
      updateBreadcrumbs: () => {
        const currentPath = get().currentPath;
        
        if (!currentPath) {
          set({ breadcrumbs: [{ name: 'Root', path: '' }] });
          return;
        }
        
        const parts = currentPath.split('/').filter(Boolean);
        const breadcrumbs = [{ name: 'Root', path: '' }];
        
        let accumulatedPath = '';
        for (const part of parts) {
          accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
          breadcrumbs.push({
            name: part,
            path: accumulatedPath
          });
        }
        
        set({ breadcrumbs });
      },
      
      getBreadcrumbPath: (index: number) => {
        const breadcrumbs = get().breadcrumbs;
        return index >= 0 && index < breadcrumbs.length 
          ? breadcrumbs[index].path 
          : '';
      }
    }),
    {
      name: 'navigation-store',
      // Custom storage to handle Set serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              expandedFolders: new Set(parsed.state.expandedFolders || []),
              loadedFolders: new Set(parsed.state.loadedFolders || [])
            }
          };
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              expandedFolders: Array.from(value.state.expandedFolders),
              loadedFolders: Array.from(value.state.loadedFolders)
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);

// Initialize event listeners when store is created
setupEventListeners();

// Selectors
export const useCurrentPath = () => 
  useNavigationStore(state => state.currentPath);

export const useBreadcrumbs = () =>
  useNavigationStore(state => state.breadcrumbs);

export const useIsExpanded = (path: string) =>
  useNavigationStore(state => state.isExpanded(path));

export const useNavigationHistory = () =>
  useNavigationStore(state => ({
    canGoBack: state.canNavigateBack(),
    canGoForward: state.canNavigateForward(),
    goBack: state.navigateBack,
    goForward: state.navigateForward
  }));