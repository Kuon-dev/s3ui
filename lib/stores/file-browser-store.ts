import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { R2Object } from '@/lib/r2/operations';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

interface FileBrowserState {
  // Navigation state
  currentPath: string;
  expandedPaths: Set<string>;
  
  // UI state
  viewMode: 'list' | 'grid';
  searchQuery: string;
  globalSearchQuery: string;
  isDragging: boolean;
  
  // Data state
  objects: R2Object[];
  selectedObject: R2Object | null;
  treeData: TreeNode[];
  
  // Dialog states
  showUploadDialog: boolean;
  showCreateFolderDialog: boolean;
  showRenameDialog: boolean;
  showDeleteDialog: boolean;
  showPreviewDialog: boolean;
  showGlobalSearch: boolean;
  
  // Actions
  setCurrentPath: (path: string) => void;
  toggleFolder: (path: string) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSearchQuery: (query: string) => void;
  setGlobalSearchQuery: (query: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  setObjects: (objects: R2Object[]) => void;
  setSelectedObject: (object: R2Object | null) => void;
  setTreeData: (treeData: TreeNode[]) => void;
  updateTreeNode: (path: string, update: Partial<TreeNode>) => void;
  
  // Dialog actions
  setShowUploadDialog: (show: boolean) => void;
  setShowCreateFolderDialog: (show: boolean) => void;
  setShowRenameDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowPreviewDialog: (show: boolean) => void;
  setShowGlobalSearch: (show: boolean) => void;
  
  // Helper actions
  expandPath: (path: string) => void;
  collapsePath: (path: string) => void;
  clearExpandedPaths: () => void;
  expandPathToFolder: (targetPath: string) => void;
  isPathExpanded: (path: string) => boolean;
}

export const useFileBrowserStore = create<FileBrowserState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPath: '',
      expandedPaths: new Set<string>(),
      viewMode: 'list',
      searchQuery: '',
      globalSearchQuery: '',
      isDragging: false,
      objects: [],
      selectedObject: null,
      treeData: [],
      showUploadDialog: false,
      showCreateFolderDialog: false,
      showRenameDialog: false,
      showDeleteDialog: false,
      showPreviewDialog: false,
      showGlobalSearch: false,
      
      // Actions
      setCurrentPath: (path) => {
        set({ currentPath: path });
        // Auto-expand path to current folder
        get().expandPathToFolder(path);
      },
      
      toggleFolder: (path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        const expandedPaths = new Set(get().expandedPaths);
        
        if (expandedPaths.has(normalizedPath)) {
          expandedPaths.delete(normalizedPath);
        } else {
          expandedPaths.add(normalizedPath);
        }
        
        set({ expandedPaths });
      },
      
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setObjects: (objects) => set({ objects }),
      setSelectedObject: (object) => set({ selectedObject: object }),
      setTreeData: (treeData) => set({ treeData }),
      
      updateTreeNode: (path, update) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.path === path) {
              return { ...node, ...update };
            }
            if (node.children) {
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        };
        
        set({ treeData: updateNode(get().treeData) });
      },
      
      // Dialog actions
      setShowUploadDialog: (show) => set({ showUploadDialog: show }),
      setShowCreateFolderDialog: (show) => set({ showCreateFolderDialog: show }),
      setShowRenameDialog: (show) => set({ showRenameDialog: show }),
      setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
      setShowPreviewDialog: (show) => set({ showPreviewDialog: show }),
      setShowGlobalSearch: (show) => set({ showGlobalSearch: show }),
      
      // Helper actions
      expandPath: (path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        const expandedPaths = new Set(get().expandedPaths);
        expandedPaths.add(normalizedPath);
        set({ expandedPaths });
      },
      
      collapsePath: (path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        const expandedPaths = new Set(get().expandedPaths);
        expandedPaths.delete(normalizedPath);
        set({ expandedPaths });
      },
      
      clearExpandedPaths: () => set({ expandedPaths: new Set() }),
      
      expandPathToFolder: (targetPath) => {
        if (!targetPath) return;
        
        const parts = targetPath.split('/').filter(Boolean);
        const expandedPaths = new Set(get().expandedPaths);
        
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          expandedPaths.add(currentPath + '/');
        }
        
        set({ expandedPaths });
      },
      
      isPathExpanded: (path) => {
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        return get().expandedPaths.has(normalizedPath);
      },
    }),
    {
      name: 'file-browser-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        expandedPaths: Array.from(state.expandedPaths), // Convert Set to Array for persistence
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.expandedPaths) {
          // Convert Array back to Set after rehydration
          state.expandedPaths = new Set(state.expandedPaths as unknown as string[]);
        }
      },
    }
  )
);