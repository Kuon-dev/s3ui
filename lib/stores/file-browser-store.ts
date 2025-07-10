import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { R2Object, FolderTreeNode } from '@/lib/r2/operations';
import { toast } from 'sonner';
import { ensureFolderPath, stripTrailingSlash, getParentPath } from '@/lib/utils/path';

interface ClipboardItem {
  path: string;
  name: string;
  isFolder: boolean;
  timestamp: number;
}

interface DragItem {
  key: string;
  name: string;
  isFolder: boolean;
}

interface FileBrowserState {
  // File Management State  
  objects: Map<string, R2Object[]>;
  folderTree: FolderTreeNode[];
  currentPath: string;
  selectedObjects: Set<string>;
  loading: Record<string, boolean>;
  
  // UI State
  expandedFolders: Set<string>;
  loadedFolders: Set<string>;
  searchQuery: string;
  globalSearchQuery: string;
  dropTargetPath: string | null;
  viewMode: 'list' | 'grid';
  
  // Clipboard State
  clipboardItem: ClipboardItem | null;
  
  // Drag State
  draggingItem: DragItem | null;
  currentDropTarget: string | null;
  validDropTargets: Set<string>;
  
  // Dialog States
  showUploadDialog: boolean;
  showCreateFolderDialog: boolean;
  showRenameDialog: boolean;
  showDeleteDialog: boolean;
  showPreviewDialog: boolean;
  showGlobalSearch: boolean;
  selectedObject: R2Object | null;
  
  // File Operations
  loadObjects: (prefix?: string) => Promise<void>;
  loadFolderTree: (prefix?: string) => Promise<void>;
  refreshCurrentFolder: () => Promise<void>;
  deleteObject: (key: string) => Promise<void>;
  renameObject: (oldKey: string, newKey: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  
  // Navigation
  setCurrentPath: (path: string) => void;
  navigateToFolder: (path: string) => Promise<void>;
  
  // Tree Operations
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  loadFolderChildren: (path: string) => Promise<void>;
  expandPathToFolder: (targetPath: string) => void;
  isPathExpanded: (path: string) => boolean;
  updateFolderTree: (updater: (tree: FolderTreeNode[]) => FolderTreeNode[]) => void;
  
  // Selection
  selectObject: (key: string) => void;
  deselectObject: (key: string) => void;
  clearSelection: () => void;
  toggleObjectSelection: (key: string) => void;
  setSelectedObject: (object: R2Object | null) => void;
  
  // Clipboard
  copyToClipboard: (path: string, name: string, isFolder: boolean) => void;
  pasteFromClipboard: (destinationPath: string) => Promise<void>;
  clearClipboard: () => void;
  canPaste: (currentPath: string) => boolean;
  
  // UI State
  setSearchQuery: (query: string) => void;
  setGlobalSearchQuery: (query: string) => void;
  setDropTarget: (path: string | null) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setLoading: (key: string, loading: boolean) => void;
  
  // Drag State Management
  startDragging: (item: DragItem) => void;
  stopDragging: () => void;
  setCurrentDropTarget: (target: string | null) => void;
  canDrop: (draggedItem: DragItem, targetPath: string) => boolean;
  handleDrop: (targetPath: string) => Promise<void>;
  
  // Dialog Actions
  setShowUploadDialog: (show: boolean) => void;
  setShowCreateFolderDialog: (show: boolean) => void;
  setShowRenameDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowPreviewDialog: (show: boolean) => void;
  setShowGlobalSearch: (show: boolean) => void;
  
  // Utility
  setObjects: (objects: R2Object[], path?: string) => void;
  setFolderTree: (tree: FolderTreeNode[]) => void;
}

export const useFileBrowserStore = create<FileBrowserState>()(
  persist(
    (set, get) => ({
      // Initial State
      objects: new Map(),
      folderTree: [],
      currentPath: '',
      selectedObjects: new Set(),
      loading: {},
      expandedFolders: new Set(),
      loadedFolders: new Set(['', '/']),
      searchQuery: '',
      globalSearchQuery: '',
      dropTargetPath: null,
      viewMode: 'list',
      clipboardItem: null,
      draggingItem: null,
      currentDropTarget: null,
      validDropTargets: new Set(),
      showUploadDialog: false,
      showCreateFolderDialog: false,
      showRenameDialog: false,
      showDeleteDialog: false,
      showPreviewDialog: false,
      showGlobalSearch: false,
      selectedObject: null,
      
      // File Operations
      loadObjects: async (prefix?: string) => {
        const path = prefix ?? get().currentPath;
        const loadingKey = `objects-${path}`;
        
        get().setLoading(loadingKey, true);
        try {
          const apiPrefix = path && !path.endsWith('/') ? `${path}/` : path;
          const response = await fetch(`/api/r2/list?prefix=${encodeURIComponent(apiPrefix)}`);
          const data = await response.json();
          
          if (response.ok) {
            set(state => ({
              objects: new Map(state.objects).set(path, data.objects)
            }));
          } else {
            toast.error('Failed to load files');
          }
        } catch {
          toast.error('Error loading files');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      loadFolderTree: async (prefix = '') => {
        const loadingKey = `tree-${prefix}`;
        
        get().setLoading(loadingKey, true);
        try {
          const response = await fetch(`/api/r2/folder-tree?prefix=${encodeURIComponent(prefix)}`);
          const data = await response.json();
          
          if (response.ok) {
            const { loadedFolders, updateFolderTree } = get();
            
            if (prefix === '') {
              set({ folderTree: data.folderTree });
            } else {
              // Update the tree by adding children to the expanded folder
              updateFolderTree((tree) => {
                const updateNode = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
                  return nodes.map(node => {
                    if (node.path === prefix.replace(/\/$/, '')) {
                      return { ...node, children: data.folderTree };
                    } else if (node.children && node.children.length > 0) {
                      return { ...node, children: updateNode(node.children) };
                    }
                    return node;
                  });
                };
                return updateNode(tree);
              });
            }
            
            // Mark folder as loaded
            const newLoadedFolders = new Set(loadedFolders);
            newLoadedFolders.add(prefix);
            set({ loadedFolders: newLoadedFolders });
          } else {
            toast.error('Failed to load folder tree');
          }
        } catch {
          toast.error('Error loading folder tree');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      refreshCurrentFolder: async () => {
        const { currentPath, loadObjects, loadFolderTree } = get();
        await Promise.all([
          loadObjects(currentPath),
          loadFolderTree(currentPath ? `${currentPath}/` : '')
        ]);
      },
      
      deleteObject: async (key: string) => {
        const loadingKey = `delete-${key}`;
        get().setLoading(loadingKey, true);
        
        try {
          const response = await fetch('/api/r2/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
          });
          
          if (response.ok) {
            toast.success('Deleted successfully');
            await get().refreshCurrentFolder();
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to delete');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      renameObject: async (oldKey: string, newKey: string) => {
        const loadingKey = `rename-${oldKey}`;
        get().setLoading(loadingKey, true);
        
        try {
          const response = await fetch('/api/r2/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldKey, newKey })
          });
          
          if (response.ok) {
            toast.success('Renamed successfully');
            await get().refreshCurrentFolder();
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to rename');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to rename');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      createFolder: async (name: string) => {
        const { currentPath, refreshCurrentFolder } = get();
        const loadingKey = `create-folder-${name}`;
        get().setLoading(loadingKey, true);
        
        try {
          const folderPath = currentPath ? `${currentPath}/${name}` : name;
          const response = await fetch('/api/r2/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath })
          });
          
          if (response.ok) {
            toast.success('Folder created successfully');
            await refreshCurrentFolder();
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create folder');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to create folder');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      // Navigation
      setCurrentPath: (path: string) => {
        const displayPath = path.endsWith('/') ? path.slice(0, -1) : path;
        set({ currentPath: displayPath });
        get().expandPathToFolder(displayPath);
        get().loadObjects(displayPath);
      },
      
      navigateToFolder: async (path: string) => {
        const { loadFolderChildren, expandFolder, setCurrentPath } = get();
        
        // Set the current path
        setCurrentPath(path);
        
        // Load the folder's children in the tree
        await loadFolderChildren(path);
        
        // Expand the folder to show its children
        expandFolder(path);
      },
      
      // Tree Operations
      toggleFolder: (path: string) => {
        const { isPathExpanded } = get();
        if (isPathExpanded(path)) {
          get().collapseFolder(path);
        } else {
          get().expandFolder(path);
        }
      },
      
      expandFolder: (path: string) => {
        const expandedFolders = new Set(get().expandedFolders);
        expandedFolders.add(path);
        set({ expandedFolders });
      },
      
      collapseFolder: (path: string) => {
        const expandedFolders = new Set(get().expandedFolders);
        expandedFolders.delete(path);
        set({ expandedFolders });
      },
      
      loadFolderChildren: async (path: string) => {
        const folderPath = path ? `${path}/` : '';
        const { loadedFolders } = get();
        
        if (!loadedFolders.has(folderPath)) {
          await get().loadFolderTree(folderPath);
        }
      },
      
      expandPathToFolder: (targetPath: string) => {
        if (!targetPath) return;
        
        const parts = targetPath.split('/').filter(Boolean);
        const expandedFolders = new Set(get().expandedFolders);
        
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          expandedFolders.add(currentPath);
        }
        
        set({ expandedFolders });
      },
      
      isPathExpanded: (path: string) => {
        return get().expandedFolders.has(path);
      },
      
      updateFolderTree: (updater) => {
        set({ folderTree: updater(get().folderTree) });
      },
      
      // Selection
      selectObject: (key: string) => {
        const selectedObjects = new Set(get().selectedObjects);
        selectedObjects.add(key);
        set({ selectedObjects });
      },
      
      deselectObject: (key: string) => {
        const selectedObjects = new Set(get().selectedObjects);
        selectedObjects.delete(key);
        set({ selectedObjects });
      },
      
      clearSelection: () => {
        set({ selectedObjects: new Set() });
      },
      
      toggleObjectSelection: (key: string) => {
        const { selectedObjects } = get();
        if (selectedObjects.has(key)) {
          get().deselectObject(key);
        } else {
          get().selectObject(key);
        }
      },
      
      setSelectedObject: (object) => {
        set({ selectedObject: object });
      },
      
      // Clipboard
      copyToClipboard: (path: string, name: string, isFolder: boolean) => {
        set({
          clipboardItem: {
            path,
            name,
            isFolder,
            timestamp: Date.now(),
          }
        });
        toast.success(`Copied "${name}" to clipboard`);
      },
      
      pasteFromClipboard: async (destinationPath: string) => {
        const { clipboardItem, refreshCurrentFolder } = get();
        if (!clipboardItem) return;
        
        const loadingKey = `paste-${clipboardItem.path}`;
        get().setLoading(loadingKey, true);
        
        try {
          const response = await fetch('/api/r2/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourcePath: clipboardItem.path,
              destinationPath: destinationPath,
              isFolder: clipboardItem.isFolder,
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to paste');
          }
          
          toast.success(`Pasted "${clipboardItem.name}" successfully`);
          await refreshCurrentFolder();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to paste');
          throw error;
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      clearClipboard: () => {
        set({ clipboardItem: null });
      },
      
      canPaste: (currentPath: string) => {
        const { clipboardItem } = get();
        if (!clipboardItem) return false;
        
        // Prevent pasting a folder into itself or its subdirectories
        if (clipboardItem.isFolder) {
          const sourcePath = ensureFolderPath(clipboardItem.path);
          const destPath = ensureFolderPath(currentPath);
          
          if (destPath.startsWith(sourcePath)) {
            return false;
          }
        }
        
        // Prevent pasting into the same directory
        const sourceDir = getParentPath(clipboardItem.path);
        const currentDir = stripTrailingSlash(currentPath);
        
        return sourceDir !== currentDir;
      },
      
      // UI State
      setSearchQuery: (query) => set({ searchQuery: query }),
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      setDropTarget: (path) => set({ dropTargetPath: path }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (key, loading) => {
        const loadingStates = { ...get().loading };
        if (loading) {
          loadingStates[key] = true;
        } else {
          delete loadingStates[key];
        }
        set({ loading: loadingStates });
      },
      
      // Drag State Management
      startDragging: (item) => {
        const { objects, currentPath } = get();
        const currentObjects = objects.get(currentPath) || [];
        
        // Find all folders that can be drop targets
        const validTargets = new Set<string>();
        
        // Add folders in current view
        currentObjects.forEach(obj => {
          if (obj.isFolder && obj.key !== item.key) {
            // Can't drop a folder into its child
            if (!(item.isFolder && obj.key.startsWith(item.key))) {
              validTargets.add(obj.key);
            }
          }
        });
        
        // Add parent folder if not root and not the item itself
        if (currentPath && currentPath !== item.key) {
          // Can't drop a folder into its child
          if (!(item.isFolder && currentPath.startsWith(item.key))) {
            validTargets.add(currentPath);
          }
        }
        
        console.log('[Store] Starting drag:', {
          item: item.key,
          currentPath,
          validTargets: Array.from(validTargets),
          currentObjects: currentObjects.map(obj => ({ key: obj.key, isFolder: obj.isFolder }))
        });
        
        set({ 
          draggingItem: item,
          validDropTargets: validTargets,
          currentDropTarget: null
        });
      },
      
      stopDragging: async () => {
        const { currentDropTarget, handleDrop, draggingItem } = get();
        
        // Immediately clear the drag state to prevent multiple calls
        set({ 
          draggingItem: null,
          currentDropTarget: null,
          validDropTargets: new Set()
        });
        
        // If there was a current drop target and dragging item, handle the drop
        if (currentDropTarget && draggingItem) {
          await handleDrop(currentDropTarget);
        }
      },
      
      setCurrentDropTarget: (target) => {
        set({ currentDropTarget: target });
      },
      
      canDrop: (draggedItem, targetPath) => {
        const { validDropTargets } = get();
        return validDropTargets.has(targetPath);
      },
      
      handleDrop: async (targetPath) => {
        const { draggingItem, renameObject } = get();
        if (!draggingItem) return;
        
        // Ensure target path ends with / for folder destinations
        const normalizedTargetPath = ensureFolderPath(targetPath);
        const destinationPath = normalizedTargetPath + draggingItem.name;
        
        // Check if we're trying to move to the same location
        if (draggingItem.key === destinationPath) {
          toast.info(`"${draggingItem.name}" is already in this location`);
          return;
        }
        
        console.log('[Store] Handling drop:', {
          draggingItem: draggingItem.key,
          targetPath: normalizedTargetPath,
          destinationPath
        });
        
        // Perform move operation
        const loadingToast = toast.loading(`Moving "${draggingItem.name}"...`);
        
        try {
          await renameObject(draggingItem.key, destinationPath);
          toast.dismiss(loadingToast);
          toast.success(`Successfully moved "${draggingItem.name}"`);
        } catch (error) {
          toast.dismiss(loadingToast);
          toast.error(error instanceof Error ? error.message : 'Failed to move file');
        }
      },
      
      // Dialog Actions
      setShowUploadDialog: (show) => set({ showUploadDialog: show }),
      setShowCreateFolderDialog: (show) => set({ showCreateFolderDialog: show }),
      setShowRenameDialog: (show) => set({ showRenameDialog: show }),
      setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
      setShowPreviewDialog: (show) => set({ showPreviewDialog: show }),
      setShowGlobalSearch: (show) => set({ showGlobalSearch: show }),
      
      // Utility
      setObjects: (objects, path) => {
        const currentPath = path ?? get().currentPath;
        set(state => ({
          objects: new Map(state.objects).set(currentPath, objects)
        }));
      },
      setFolderTree: (tree) => set({ folderTree: tree }),
    }),
    {
      name: 'file-browser-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        expandedFolders: Array.from(state.expandedFolders),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.expandedFolders) {
          state.expandedFolders = new Set(state.expandedFolders as unknown as string[]);
        }
      },
    }
  )
);

// Selectors for common use cases
export const useIsLoading = (key: string) => 
  useFileBrowserStore((state) => state.loading[key] || false);

export const useIsAnyLoading = () => 
  useFileBrowserStore((state) => Object.keys(state.loading).length > 0);

export const useFilteredObjects = () => {
  const objects = useFileBrowserStore((state) => state.objects);
  const currentPath = useFileBrowserStore((state) => state.currentPath);
  const searchQuery = useFileBrowserStore((state) => state.searchQuery);
  
  const currentObjects = objects.get(currentPath) || [];
  
  return currentObjects.filter(object => {
    if (!searchQuery) return true;
    const name = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || ''
      : object.key.split('/').pop() || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
};