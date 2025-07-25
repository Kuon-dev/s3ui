import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { R2Object, FolderTreeNode } from '@/lib/r2/operations';
import { toast } from 'sonner';
import { ensureFolderPath, stripTrailingSlash, getParentPath } from '@/lib/utils/path';
import { validatePath, normalizePath, canMoveOrRename } from '@/lib/utils/path-validation';
import { fileOperationQueue, hasConflictingOperation } from '@/lib/utils/operation-queue';
import { emitFileDeleted, emitFolderCreated, emitFolderDeleted, emitFileRenamed, emitFolderRenamed } from '@/lib/utils/file-event-bus';
import { fetchWithRetry, r2OperationWithRetry } from '@/lib/utils/retry-utils';
import { dragDropGuard } from '@/lib/utils/drag-drop-guards';

interface ClipboardItem {
  path: string;
  name: string;
  isFolder: boolean;
  timestamp: number;
}

export interface DragItem {
  key: string;
  name: string;
  isFolder: boolean;
  selectedKeys?: string[];
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
  
  // Cache management
  lastFetched: Map<string, number>;
  cacheTimeout: number; // in milliseconds
  selectedObject: R2Object | null;
  
  // Force re-render when data changes
  dataVersion: number;
  folderTreeVersion: number;
  
  // Restore state after refresh
  pendingRestore: boolean;
  restorePath: string | null;
  restoreSelection: string[];
  
  // Track ongoing rename operations with rollback data
  renamingFolders: Map<string, {
    newPath: string;
    previousTree: FolderTreeNode[];
    previousExpanded: Set<string>;
    previousObjects: Map<string, R2Object[]>;
  }>;
  
  // File Operations
  loadObjects: (prefix?: string, forceRefresh?: boolean) => Promise<void>;
  loadFolderTree: (prefix?: string) => Promise<void>;
  refreshCurrentFolder: (skipTreeRefresh?: boolean) => Promise<void>;
  deleteObject: (key: string) => Promise<void>;
  renameObject: (oldKey: string, newKey: string, isMove?: boolean) => Promise<void>;
  moveObject: (oldKey: string, newKey: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  
  // Navigation
  setCurrentPath: (path: string) => void;
  navigateToFolder: (path: string) => Promise<void>;
  
  // Tree Operations
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  loadFolderChildren: (path: string, forceReload?: boolean) => Promise<void>;
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
  checkAndRestore: () => Promise<void>;
  renameFolderInTree: (oldPath: string, newPath: string, newName: string) => void;
  removeFolderFromTree: (folderPath: string) => void;
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
      lastFetched: new Map(),
      cacheTimeout: 60000, // 60 seconds
      dataVersion: 0,
      folderTreeVersion: 0,
      pendingRestore: false,
      restorePath: null,
      restoreSelection: [],
      renamingFolders: new Map(),
      
      // File Operations
      loadObjects: async (prefix?: string, forceRefresh = false) => {
        const path = prefix ?? get().currentPath;
        const loadingKey = `objects-${path}`;
        const { objects, lastFetched, cacheTimeout } = get();
        
        // Check cache
        if (!forceRefresh) {
          const cachedObjects = objects.get(path);
          const lastFetchTime = lastFetched.get(path);
          
          if (cachedObjects && lastFetchTime) {
            const now = Date.now();
            if (now - lastFetchTime < cacheTimeout) {
              // Cache is still valid
              return;
            }
          }
        }
        
        get().setLoading(loadingKey, true);
        try {
          const apiPrefix = path && !path.endsWith('/') ? `${path}/` : path;
          // Add timestamp to prevent caching
          const timestamp = Date.now();
          const response = await fetchWithRetry(
            `/api/r2/list?prefix=${encodeURIComponent(apiPrefix)}&t=${timestamp}`,
            undefined,
            { maxAttempts: 3 }
          );
          const data = await response.json();
          
          if (response.ok) {
            console.log('[loadObjects] Loading objects for path:', path, 'count:', data.objects.length);
            
            // Log the first few objects to see what's being loaded
            if (data.objects.length > 0) {
              console.log('[loadObjects] Sample objects:', data.objects.slice(0, 3).map((obj: R2Object) => ({
                key: obj.key,
                isFolder: obj.isFolder,
                size: obj.size
              })));
            }
            
            set(state => {
              // Create new Map instances to ensure React detects the change
              const newObjects = new Map(state.objects);
              // Ensure the array is a new reference by spreading
              newObjects.set(path, [...data.objects]);
              
              const newLastFetched = new Map(state.lastFetched);
              newLastFetched.set(path, Date.now());
              
              const newDataVersion = state.dataVersion + 1;
              console.log('[loadObjects] State update - path:', path, 'dataVersion:', state.dataVersion, '->', newDataVersion);
              
              return {
                objects: newObjects,
                lastFetched: newLastFetched,
                dataVersion: newDataVersion
              };
            });
            
            // Log the state after update
            setTimeout(() => {
              const updatedState = get();
              console.log('[loadObjects] After update - objects for path:', path, 'count:', updatedState.objects.get(path)?.length);
              console.log('[loadObjects] After update - dataVersion:', updatedState.dataVersion);
            }, 0);
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
        
        // Check if already loading to prevent duplicate concurrent calls
        if (get().loading[loadingKey]) {
          return;
        }
        
        get().setLoading(loadingKey, true);
        try {
          const response = await fetchWithRetry(
            `/api/r2/folder-tree?prefix=${encodeURIComponent(prefix)}`,
            undefined,
            { maxAttempts: 2 }
          );
          const data = await response.json();
          
          if (response.ok) {
            // Use a single atomic state update to prevent race conditions
            set(state => {
              const newState: Partial<FileBrowserState> = {};
              
              if (prefix === '') {
                // Root folder update - merge with existing tree to preserve loaded children
                const mergeTree = (newNodes: FolderTreeNode[], oldNodes: FolderTreeNode[]): FolderTreeNode[] => {
                  // Check if any folders are being renamed
                  const renamingFolders = state.renamingFolders;
                  const renamedPaths = new Map<string, string>();
                  
                  // Build a map of old path -> new path for active renames
                  renamingFolders.forEach((data, oldPath) => {
                    if (data) {
                      renamedPaths.set(oldPath, data.newPath);
                    }
                  });
                  
                  // Filter out nodes that have been renamed (they'll appear with new name from server)
                  const validOldNodes = oldNodes.filter(node => !renamedPaths.has(node.path));
                  
                  return newNodes.map(newNode => {
                    const oldNode = validOldNodes.find(n => n.path === newNode.path);
                    if (oldNode && oldNode.children && oldNode.children.length > 0) {
                      // Preserve the loaded children from the old tree
                      return { ...newNode, children: oldNode.children };
                    }
                    return newNode;
                  });
                };
                
                newState.folderTree = mergeTree(data.folderTree, state.folderTree);
                newState.folderTreeVersion = state.folderTreeVersion + 1;
                // Preserve expandedFolders to maintain user's navigation state
              } else {
                // Update nested folder - create a new tree to ensure immutability
                const updateNode = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
                  // Check for active renames
                  const renamingFolders = state.renamingFolders;
                  const renamedPaths = new Map<string, string>();
                  
                  renamingFolders.forEach((data, oldPath) => {
                    if (data) {
                      renamedPaths.set(oldPath, data.newPath);
                    }
                  });
                  
                  return nodes.map(node => {
                    // Skip nodes that are being renamed
                    if (renamedPaths.has(node.path)) {
                      return node;
                    }
                    
                    if (node.path === prefix.replace(/\/$/, '')) {
                      // Filter out renamed folders from children
                      const filteredChildren = data.folderTree.filter(
                        (child: FolderTreeNode) => !Array.from(renamedPaths.keys()).some(
                          oldPath => child.path === oldPath
                        )
                      );
                      return { ...node, children: filteredChildren };
                    } else if (node.children && node.children.length > 0) {
                      return { ...node, children: updateNode(node.children) };
                    }
                    return node;
                  });
                };
                
                newState.folderTree = updateNode(state.folderTree);
                newState.folderTreeVersion = state.folderTreeVersion + 1;
                
                // Mark folder as loaded (only for non-root updates)
                const newLoadedFolders = new Set(state.loadedFolders);
                newLoadedFolders.add(prefix);
                newState.loadedFolders = newLoadedFolders;
              }
              
              return newState;
            });
          } else {
            toast.error('Failed to load folder tree');
          }
        } catch {
          toast.error('Error loading folder tree');
        } finally {
          get().setLoading(loadingKey, false);
        }
      },
      
      refreshCurrentFolder: async (skipTreeRefresh = false) => {
        const { currentPath, loadObjects, loadFolderTree, loadedFolders, expandPathToFolder } = get();
        
        console.log('[refreshCurrentFolder] Starting refresh for path:', currentPath, 'skipTreeRefresh:', skipTreeRefresh);
        
        // First, load the current path objects
        const loadObjectsPromise = loadObjects(currentPath, true);
        
        // Then, reload all previously loaded folders to preserve tree structure
        const reloadPromises: Promise<void>[] = [loadObjectsPromise];
        
        if (!skipTreeRefresh) {
          // Always load root
          reloadPromises.push(loadFolderTree(''));
          
          // Ensure all parent folders of the current path are loaded
          if (currentPath) {
            const parts = currentPath.split('/').filter(Boolean);
            let pathSoFar = '';
            for (const part of parts) {
              pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
              const folderPath = pathSoFar + '/';
              if (!loadedFolders.has(folderPath) && folderPath !== '/') {
                reloadPromises.push(loadFolderTree(folderPath));
              }
            }
          }
          
          // Reload all other previously loaded folders
          for (const loadedPath of loadedFolders) {
            // Skip root (already loaded) and avoid duplicates
            if (loadedPath !== '' && loadedPath !== '/' && !reloadPromises.some(p => p === loadFolderTree(loadedPath))) {
              reloadPromises.push(loadFolderTree(loadedPath));
            }
          }
        }
        
        await Promise.all(reloadPromises);
        
        // After refreshing the tree, reload children for all expanded folders
        if (!skipTreeRefresh) {
          const expandedFolders = get().expandedFolders;
          const childrenLoadPromises: Promise<void>[] = [];
          
          // Load children for each expanded folder
          for (const expandedPath of expandedFolders) {
            if (expandedPath) {
              const folderPath = expandedPath + '/';
              childrenLoadPromises.push(loadFolderTree(folderPath));
            }
          }
          
          // Wait for all children to load
          if (childrenLoadPromises.length > 0) {
            await Promise.all(childrenLoadPromises);
          }
          
          // Ensure the current path is expanded
          if (currentPath) {
            expandPathToFolder(currentPath);
          }
        }
        
        console.log('[refreshCurrentFolder] Refresh completed for path:', currentPath);
      },
      
      deleteObject: async (key: string) => {
        // Check for conflicting operations
        if (hasConflictingOperation(key, 'delete')) {
          toast.error('Another operation is in progress for this item');
          return;
        }

        const loadingKey = `delete-${key}`;
        
        // Queue the operation
        await fileOperationQueue.enqueue({
          type: 'delete',
          description: `Deleting ${key}`,
          execute: async () => {
            get().setLoading(loadingKey, true);
            
            try {
          const response = await r2OperationWithRetry(
            () => fetch('/api/r2/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key })
            }),
            'Delete operation',
            { maxAttempts: 2 }
          );
          
          if (response.ok) {
            toast.success('Deleted successfully');
            
            // If deleting a folder, remove it and its children from loadedFolders
            if (key.endsWith('/')) {
              const deletedFolderPath = key.slice(0, -1);
              const loadedFolders = get().loadedFolders;
              const newLoadedFolders = new Set<string>();
              
              loadedFolders.forEach(loadedPath => {
                const pathWithoutSlash = loadedPath.endsWith('/') ? loadedPath.slice(0, -1) : loadedPath;
                
                // Skip the deleted folder and any of its children
                if (pathWithoutSlash !== deletedFolderPath && !pathWithoutSlash.startsWith(deletedFolderPath + '/')) {
                  newLoadedFolders.add(loadedPath);
                }
              });
              
              set({ loadedFolders: newLoadedFolders });
            }
            
            await get().refreshCurrentFolder();
            
            // Emit event for deletion
            if (key.endsWith('/')) {
              await emitFolderDeleted(key);
            } else {
              await emitFileDeleted(key);
            }
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete');
          }
            } catch (error) {
              throw error;
            } finally {
              get().setLoading(loadingKey, false);
            }
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to delete');
          }
        });
      },
      
      renameObject: async (oldKey: string, newKey: string, isMove = false) => {
        // Validate the new path
        const isFolder = oldKey.endsWith('/');
        const validation = validatePath(newKey, { isFolder });
        
        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error));
          return;
        }
        
        // Check if move/rename is allowed
        const moveCheck = canMoveOrRename(oldKey, newKey, isFolder);
        if (!moveCheck.canMove) {
          toast.error(moveCheck.reason || 'Cannot perform this operation');
          return;
        }
        
        // Normalize paths
        const normalizedOldKey = normalizePath(oldKey, isFolder);
        const normalizedNewKey = validation.normalizedPath || newKey;
        
        // Check for conflicting operations
        if (hasConflictingOperation(normalizedOldKey, isMove ? 'move' : 'rename')) {
          toast.error('Another operation is in progress for this item');
          return;
        }

        const loadingKey = `rename-${oldKey}`;
        
        // Optimistic update for folders
        if (isFolder) {
          const oldPath = normalizedOldKey.endsWith('/') ? normalizedOldKey.slice(0, -1) : normalizedOldKey;
          const newPath = normalizedNewKey.endsWith('/') ? normalizedNewKey.slice(0, -1) : normalizedNewKey;
          const newName = newPath.split('/').pop() || newPath;
          
          // Store the current tree state for potential rollback
          const previousFolderTree = get().folderTree;
          const previousExpandedFolders = get().expandedFolders;
          const previousObjects = get().objects;
          
          // Immediately update the tree (optimistic update)
          get().renameFolderInTree(oldPath, newPath, newName);
          
          // Track the rename operation with rollback data
          set(state => ({
            renamingFolders: new Map(state.renamingFolders).set(oldPath, {
              newPath,
              previousTree: previousFolderTree,
              previousExpanded: previousExpandedFolders,
              previousObjects: previousObjects
            })
          }));
          
          console.log('[renameObject] Optimistic rename:', oldPath, '->', newPath);
        }
        
        // Queue the operation to prevent race conditions
        await fileOperationQueue.enqueue({
          type: isMove ? 'move' : 'rename',
          description: `${isMove ? 'Moving' : 'Renaming'} ${normalizedOldKey} to ${normalizedNewKey}`,
          execute: async () => {
            get().setLoading(loadingKey, true);
            
            try {
          console.log('[renameObject] Sending rename request:', { oldKey: normalizedOldKey, newKey: normalizedNewKey });
          
          const response = await r2OperationWithRetry(
            () => fetch('/api/r2/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldKey: normalizedOldKey, newKey: normalizedNewKey })
            }),
            isMove ? 'Move operation' : 'Rename operation',
            { maxAttempts: 2 }
          );
          
          console.log('[renameObject] Rename response status:', response.ok);
          
          if (response.ok) {
            toast.success(isMove ? 'Moved successfully' : 'Renamed successfully');
            
            // Store current state for restoration after refresh
            const currentPath = get().currentPath;
            let restorePath = currentPath;
            
            // If renaming a folder, update the restore path if necessary
            if (normalizedOldKey.endsWith('/')) {
              const oldFolderPath = normalizedOldKey.slice(0, -1);
              const newFolderPath = normalizedNewKey.slice(0, -1);
              
              // Check if current path is affected by the rename
              if (currentPath === oldFolderPath || currentPath.startsWith(oldFolderPath + '/')) {
                // Update the restore path
                restorePath = currentPath === oldFolderPath 
                  ? newFolderPath 
                  : newFolderPath + currentPath.substring(oldFolderPath.length);
                console.log('[renameObject] Updated restore path:', currentPath, '->', restorePath);
              }
            }
            
            // Don't set restore state since we'll handle navigation directly
            // This avoids issues with checkAndRestore not being called without page reload
            
            // Emit rename event for proper UI updates
            if (normalizedOldKey.endsWith('/')) {
              await emitFolderRenamed(normalizedOldKey, normalizedNewKey);
            } else {
              await emitFileRenamed(normalizedOldKey, normalizedNewKey);
            }
            
            // Handle folder rename success
            if (isFolder) {
              const oldPath = normalizedOldKey.endsWith('/') ? normalizedOldKey.slice(0, -1) : normalizedOldKey;
              
              // Clear rename tracking
              set(state => {
                const newRenamingFolders = new Map(state.renamingFolders);
                newRenamingFolders.delete(oldPath);
                return { renamingFolders: newRenamingFolders };
              });
              
              // If current path was affected by rename, navigate to new path
              if (restorePath !== currentPath) {
                await get().navigateToFolder(restorePath);
              } else {
                // Just refresh the current folder's objects
                await get().loadObjects(currentPath, true);
              }
              
              console.log('[renameObject] Rename confirmed by server');
            } else {
              // For files, refresh the current folder's objects
              await get().loadObjects(currentPath, true);
            }
            
            console.log('[renameObject] Rename completed successfully');
          } else {
            const error = await response.json();
            throw new Error(error.message || (isMove ? 'Failed to move' : 'Failed to rename'));
          }
            } catch (error) {
              // Rollback optimistic update on error
              if (isFolder) {
                const oldPath = normalizedOldKey.endsWith('/') ? normalizedOldKey.slice(0, -1) : normalizedOldKey;
                const rollbackData = get().renamingFolders.get(oldPath);
                
                if (rollbackData) {
                  // Rollback to previous state
                  set(state => {
                    const newRenamingFolders = new Map(state.renamingFolders);
                    newRenamingFolders.delete(oldPath);
                    return {
                      folderTree: rollbackData.previousTree,
                      expandedFolders: rollbackData.previousExpanded,
                      objects: rollbackData.previousObjects,
                      renamingFolders: newRenamingFolders
                    };
                  });
                  
                  console.log('[renameObject] Rolled back optimistic update due to error');
                }
              }
              throw error;
            } finally {
              get().setLoading(loadingKey, false);
            }
          },
          onError: (error) => {
            toast.error(error.message || (isMove ? 'Failed to move' : 'Failed to rename'));
          }
        });
      },
      
      moveObject: async (oldKey: string, newKey: string) => {
        await get().renameObject(oldKey, newKey, true);
      },
      
      createFolder: async (name: string) => {
        const { currentPath, refreshCurrentFolder } = get();
        
        // Validate folder name
        const validation = validatePath(name, { isFolder: true, checkReserved: true });
        if (!validation.isValid) {
          validation.errors.forEach(error => toast.error(error));
          return;
        }
        
        // Normalize the folder name
        // Remove trailing slash before getting the folder name
        const normalizedPath = validation.normalizedPath?.replace(/\/$/, '') || name;
        const normalizedName = normalizedPath.split('/').pop() || name;
        
        // Ensure the folder name is not empty
        if (!normalizedName.trim()) {
          toast.error('Folder name cannot be empty');
          return;
        }
        
        const folderPath = currentPath ? `${currentPath}/${normalizedName}` : normalizedName;
        
        // Check for conflicting operations
        if (hasConflictingOperation(folderPath, 'create')) {
          toast.error('Another operation is in progress');
          return;
        }

        const loadingKey = `create-folder-${name}`;
        
        // Queue the operation
        await fileOperationQueue.enqueue({
          type: 'create',
          description: `Creating folder ${name}`,
          execute: async () => {
            get().setLoading(loadingKey, true);
            
            try {
          const folderPath = currentPath ? `${currentPath}/${name}` : name;
          const response = await r2OperationWithRetry(
            () => fetch('/api/r2/create-folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderPath })
            }),
            'Create folder operation',
            { maxAttempts: 2 }
          );
          
          if (response.ok) {
            toast.success('Folder created successfully');
            await refreshCurrentFolder();
            
            // Emit event for folder creation
            await emitFolderCreated(folderPath + '/');
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create folder');
          }
            } catch (error) {
              throw error;
            } finally {
              get().setLoading(loadingKey, false);
            }
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to create folder');
          }
        });
      },
      
      // Navigation
      setCurrentPath: (path: string) => {
        const displayPath = path.endsWith('/') ? path.slice(0, -1) : path;
        set({ currentPath: displayPath });
        get().expandPathToFolder(displayPath);
        get().loadObjects(displayPath);
      },
      
      navigateToFolder: async (path: string) => {
        const { loadFolderChildren, expandFolder, setCurrentPath, expandPathToFolder, loadedFolders } = get();
        
        // Set the current path (which also calls expandPathToFolder)
        setCurrentPath(path);
        
        // Ensure all parent folders are loaded
        if (path) {
          const parts = path.split('/').filter(Boolean);
          const loadPromises: Promise<void>[] = [];
          let pathSoFar = '';
          
          for (const part of parts) {
            pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
            const folderPath = pathSoFar + '/';
            
            // Only load if not already loaded
            if (!loadedFolders.has(folderPath)) {
              loadPromises.push(loadFolderChildren(pathSoFar));
            }
          }
          
          // Wait for any unloaded parent folders to be loaded
          if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
          }
        }
        
        // Load the folder's children in the tree if not already loaded
        const targetFolderPath = path ? path + '/' : '';
        if (!loadedFolders.has(targetFolderPath)) {
          await loadFolderChildren(path);
        }
        
        // Expand the folder to show its children
        expandFolder(path);
        
        // Ensure all parent folders are expanded
        expandPathToFolder(path);
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
      
      loadFolderChildren: async (path: string, forceReload: boolean = false) => {
        const folderPath = path ? `${path}/` : '';
        const { loadedFolders } = get();
        
        if (forceReload || !loadedFolders.has(folderPath)) {
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
        set(state => ({ 
          folderTree: updater(state.folderTree),
          folderTreeVersion: state.folderTreeVersion + 1
        }));
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
        const { objects, currentPath, selectedObjects } = get();
        const currentObjects = objects.get(currentPath) || [];
        
        // If the dragged item is in selection, include all selected items
        const selectedKeys = selectedObjects.has(item.key) 
          ? Array.from(selectedObjects)
          : [item.key];
        
        // Check if drag can start
        if (!dragDropGuard.startDrag(selectedKeys)) {
          return; // Guard will show appropriate message
        }
        
        // Find all folders that can be drop targets
        const validTargets = new Set<string>();
        
        // Helper to check if any selected item would be invalid for a target
        const isValidDropTarget = (targetKey: string) => {
          const itemsToCheck = selectedKeys || [item.key];
          
          return itemsToCheck.every(key => {
            // Can't drop into same location
            if (key === targetKey) return false;
            
            // Find the object
            const obj = currentObjects.find(o => o.key === key);
            if (!obj) return true;
            
            // Can't drop a folder into its child
            if (obj.isFolder && targetKey.startsWith(key)) return false;
            
            return true;
          });
        };
        
        // Add folders in current view
        currentObjects.forEach(obj => {
          if (obj.isFolder && isValidDropTarget(obj.key)) {
            validTargets.add(obj.key);
          }
        });
        
        // Add parent folder if not root
        if (currentPath) {
          const parentPath = getParentPath(currentPath);
          // Parent path is valid if it's root (empty string) or a valid drop target
          if (parentPath === '' || isValidDropTarget(parentPath)) {
            validTargets.add(parentPath);
          }
        }
        
        // Add all folders from the tree that are valid
        const addFoldersFromTree = (tree: FolderTreeNode[]) => {
          tree.forEach(node => {
            if (isValidDropTarget(node.path)) {
              validTargets.add(node.path);
            }
            if (node.children) {
              addFoldersFromTree(node.children);
            }
          });
        };
        
        const { folderTree } = get();
        addFoldersFromTree(folderTree);
        
        // Also add root folder as a valid target
        if (isValidDropTarget('')) {
          validTargets.add('');
        }
        
        console.log('[Store] Starting drag:', {
          item: item.key,
          selectedKeys,
          currentPath,
          validTargets: Array.from(validTargets),
        });
        
        set({ 
          draggingItem: { ...item, selectedKeys: selectedObjects.has(item.key) ? Array.from(selectedObjects) : undefined },
          validDropTargets: validTargets,
          currentDropTarget: null
        });
      },
      
      stopDragging: () => {
        // Clear drag state and notify guard
        dragDropGuard.endDrag();
        set({ 
          draggingItem: null,
          currentDropTarget: null,
          validDropTargets: new Set()
        });
      },
      
      setCurrentDropTarget: (target) => {
        set({ currentDropTarget: target });
      },
      
      canDrop: (draggedItem, targetPath) => {
        const { draggingItem } = get();
        
        // No item being dragged
        if (!draggingItem) return false;
        
        // Can't drop into the same location
        const draggedItemPath = draggedItem.key.endsWith('/') 
          ? draggedItem.key.slice(0, -1) 
          : draggedItem.key;
        const draggedItemParent = getParentPath(draggedItemPath);
        
        if (draggedItemParent === targetPath) return false;
        
        // Can't drop a folder into itself
        if (draggedItem.isFolder && targetPath.startsWith(draggedItemPath)) {
          return false;
        }
        
        // If multiple items selected, check all of them
        if (draggedItem.selectedKeys) {
          return draggedItem.selectedKeys.every(key => {
            const itemPath = key.endsWith('/') ? key.slice(0, -1) : key;
            const itemParent = getParentPath(itemPath);
            
            // Can't drop into same location
            if (itemParent === targetPath) return false;
            
            // Can't drop folder into its child
            if (key.endsWith('/') && targetPath.startsWith(itemPath)) {
              return false;
            }
            
            return true;
          });
        }
        
        return true;
      },
      
      handleDrop: async (targetPath) => {
        const { draggingItem, moveObject, objects, currentPath, validDropTargets, canDrop } = get();
        if (!draggingItem) return;
        
        // Get items to move
        const itemsToMove = draggingItem.selectedKeys || [draggingItem.key];
        
        // Use drag drop guard for validation
        const guardCheck = dragDropGuard.canDrop(targetPath, itemsToMove);
        if (!guardCheck.canDrop) {
          toast.error(guardCheck.reason || 'Cannot move items to this location');
          return;
        }
        
        // Additional check with store's canDrop logic
        if (!canDrop(draggingItem, targetPath)) {
          toast.error('Cannot move items to this location');
          return;
        }
        
        // Check if this is a known valid target
        const isKnownValid = validDropTargets.has(targetPath) || targetPath === '';
        
        // If not known, verify it's a valid folder by checking if it exists
        if (!isKnownValid) {
          try {
            // Try to list objects in the target folder to verify it exists
            const response = await fetch(`/api/r2/list?prefix=${encodeURIComponent(targetPath + '/')}`);
            if (!response.ok) {
              toast.error(`Folder "${targetPath}" does not exist`);
              return;
            }
          } catch {
            toast.error('Failed to verify target folder');
            return;
          }
        }
        
        // Ensure target path ends with / for folder destinations
        const normalizedTargetPath = ensureFolderPath(targetPath);
        
        // Filter out items that are already in the target location
        const validItemsToMove = itemsToMove.filter(key => {
          const itemName = key.split('/').pop() || key;
          const destinationPath = normalizedTargetPath + itemName;
          return key !== destinationPath;
        });
        
        if (validItemsToMove.length === 0) {
          toast.info('All items are already in this location');
          return;
        }
        
        console.log('[Store] Handling drop:', {
          draggingItem: draggingItem.key,
          targetPath: normalizedTargetPath,
          itemsToMove: validItemsToMove
        });
        
        // Clear drag state immediately to prevent double handling
        set({ 
          draggingItem: null,
          currentDropTarget: null,
          validDropTargets: new Set()
        });
        
        // Perform move operations
        const itemCount = validItemsToMove.length;
        const loadingToast = toast.loading(
          itemCount > 1 
            ? `Moving ${itemCount} items...`
            : `Moving "${draggingItem.name}"...`
        );
        
        try {
          // Move all items
          const currentObjects = objects.get(currentPath) || [];
          const movePromises = validItemsToMove.map(async (key) => {
            const obj = currentObjects.find(o => o.key === key);
            const itemName = key.split('/').pop() || key;
            const destinationPath = normalizedTargetPath + itemName;
            
            if (obj?.isFolder) {
              // For folders, ensure the key ends with /
              const folderKey = ensureFolderPath(key);
              const folderDestPath = ensureFolderPath(destinationPath);
              await moveObject(folderKey, folderDestPath);
            } else {
              await moveObject(key, destinationPath);
            }
          });
          
          await Promise.all(movePromises);
          
          toast.dismiss(loadingToast);
          // Success toast is already shown by moveObject
        } catch {
          toast.dismiss(loadingToast);
          // Error toast is already shown by moveObject
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
          objects: new Map(state.objects).set(currentPath, objects),
          dataVersion: state.dataVersion + 1
        }));
      },
      setFolderTree: (tree) => set({ folderTree: tree }),
      
      // Rename a folder in the tree without full refresh
      renameFolderInTree: (oldPath, newPath, newName) => {
        set(state => {
          const updateNodeInTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            return nodes.map(node => {
              if (node.path === oldPath) {
                // Found the node to rename
                return { ...node, path: newPath, name: newName };
              } else if (node.children && node.children.length > 0) {
                // Recursively update children
                return { ...node, children: updateNodeInTree(node.children) };
              }
              return node;
            });
          };
          
          // Also update the expanded folders set if the renamed folder was expanded
          const newExpandedFolders = new Set(state.expandedFolders);
          if (newExpandedFolders.has(oldPath)) {
            newExpandedFolders.delete(oldPath);
            newExpandedFolders.add(newPath);
          }
          
          // Update any child paths in expanded folders
          const updatedExpandedFolders = new Set<string>();
          newExpandedFolders.forEach(path => {
            if (path.startsWith(oldPath + '/')) {
              // This is a child of the renamed folder
              const newChildPath = newPath + path.substring(oldPath.length);
              updatedExpandedFolders.add(newChildPath);
            } else {
              updatedExpandedFolders.add(path);
            }
          });
          
          // Also update objects cache for any affected paths
          const newObjects = new Map(state.objects);
          const updatedObjects = new Map<string, R2Object[]>();
          
          newObjects.forEach((objects, path) => {
            if (path === oldPath) {
              // This is the renamed folder itself
              updatedObjects.set(newPath, objects);
            } else if (path.startsWith(oldPath + '/')) {
              // This is a child of the renamed folder
              const newChildPath = newPath + path.substring(oldPath.length);
              updatedObjects.set(newChildPath, objects);
            } else {
              // Not affected by rename
              updatedObjects.set(path, objects);
            }
          });
          
          return {
            folderTree: updateNodeInTree(state.folderTree),
            folderTreeVersion: state.folderTreeVersion + 1,
            expandedFolders: updatedExpandedFolders,
            objects: updatedObjects
          };
        });
      },
      
      // Remove a folder from the tree
      removeFolderFromTree: (folderPath) => {
        set(state => {
          const removeFromTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            return nodes.filter(node => node.path !== folderPath).map(node => {
              if (node.children && node.children.length > 0) {
                return { ...node, children: removeFromTree(node.children) };
              }
              return node;
            });
          };
          
          // Also remove from expanded folders
          const newExpandedFolders = new Set(state.expandedFolders);
          newExpandedFolders.delete(folderPath);
          
          // Remove any child paths from expanded folders
          const filteredExpandedFolders = new Set<string>();
          newExpandedFolders.forEach(path => {
            if (!path.startsWith(folderPath + '/')) {
              filteredExpandedFolders.add(path);
            }
          });
          
          // Remove from loaded folders
          const newLoadedFolders = new Set(state.loadedFolders);
          newLoadedFolders.delete(folderPath + '/');
          
          // Remove any child paths from loaded folders
          const filteredLoadedFolders = new Set<string>();
          newLoadedFolders.forEach(path => {
            const pathWithoutSlash = path.endsWith('/') ? path.slice(0, -1) : path;
            if (!pathWithoutSlash.startsWith(folderPath + '/') && pathWithoutSlash !== folderPath) {
              filteredLoadedFolders.add(path);
            }
          });
          
          // Remove from objects cache
          const newObjects = new Map(state.objects);
          const keysToRemove: string[] = [];
          newObjects.forEach((_, key) => {
            if (key === folderPath || key.startsWith(folderPath + '/')) {
              keysToRemove.push(key);
            }
          });
          keysToRemove.forEach(key => newObjects.delete(key));
          
          return {
            folderTree: removeFromTree(state.folderTree),
            folderTreeVersion: state.folderTreeVersion + 1,
            expandedFolders: filteredExpandedFolders,
            loadedFolders: filteredLoadedFolders,
            objects: newObjects
          };
        });
      },
      
      // Check and perform restore after refresh
      checkAndRestore: async () => {
        const { pendingRestore, restorePath, restoreSelection, navigateToFolder, selectObject } = get();
        
        if (pendingRestore && restorePath !== null) {
          console.log('[checkAndRestore] Restoring state - path:', restorePath, 'selection:', restoreSelection);
          
          // Clear the restore flag first
          set({ pendingRestore: false, restorePath: null, restoreSelection: [] });
          
          // Navigate to the saved path
          await navigateToFolder(restorePath);
          
          // Restore selection if any
          restoreSelection.forEach(key => {
            selectObject(key);
          });
          
          console.log('[checkAndRestore] Restore completed');
        }
      },
    }),
    {
      name: 'file-browser-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        expandedFolders: Array.from(state.expandedFolders),
        pendingRestore: state.pendingRestore,
        restorePath: state.restorePath,
        restoreSelection: state.restoreSelection,
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
  const dataVersion = useFileBrowserStore((state) => state.dataVersion); // Force re-render on data changes
  
  const currentObjects = objects.get(currentPath) || [];
  
  console.log('[useFilteredObjects] Rendering - path:', currentPath, 'objects count:', currentObjects.length, 'dataVersion:', dataVersion);
  
  return currentObjects.filter(object => {
    if (!searchQuery) return true;
    const name = object.isFolder 
      ? object.key.replace(/\/$/, '').split('/').pop() || ''
      : object.key.split('/').pop() || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
};