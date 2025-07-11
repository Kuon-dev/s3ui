import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { R2Object, FolderTreeNode } from '@/lib/r2/operations';
import { createCacheSlice, CacheSlice } from './utils/store-helpers';

/**
 * File System Store
 * Responsible for managing R2 objects and folder structure
 * Uses caching to minimize API calls
 */
export interface FileSystemState extends CacheSlice<string, R2Object[]> {
  // Core data
  objects: Map<string, R2Object[]>;
  folderTree: FolderTreeNode[];
  
  // Actions
  setObjects: (objects: R2Object[], path: string) => void;
  addObjects: (objects: R2Object[], path: string) => void;
  removeObject: (key: string, path: string) => void;
  updateObject: (oldKey: string, newObject: R2Object, path: string) => void;
  
  setFolderTree: (tree: FolderTreeNode[]) => void;
  updateFolderTree: (updater: (tree: FolderTreeNode[]) => FolderTreeNode[]) => void;
  addFolderToTree: (path: string, folderName: string) => void;
  removeFolderFromTree: (path: string) => void;
  
  // Getters
  getObjects: (path: string) => R2Object[];
  getObject: (key: string, path: string) => R2Object | undefined;
  getFolderNode: (path: string) => FolderTreeNode | null;
  
  // Cache-aware operations
  getCachedObjects: (path: string) => R2Object[] | null;
  setCachedObjects: (objects: R2Object[], path: string) => void;
  invalidatePath: (path: string) => void;
  invalidateAll: () => void;
}

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get, api) => ({
      // Initialize cache slice
      ...createCacheSlice<string, R2Object[]>(60000)(set, get, api),
      
      // Core data
      objects: new Map(),
      folderTree: [],
      
      // Object management
      setObjects: (objects: R2Object[], path: string) => {
        set((state) => {
          const newObjects = new Map(state.objects);
          newObjects.set(path, objects);
          return { objects: newObjects };
        });
        
        // Also update cache
        get().setCache(path, objects);
      },
      
      addObjects: (objects: R2Object[], path: string) => {
        set((state) => {
          const newObjects = new Map(state.objects);
          const existing = newObjects.get(path) || [];
          newObjects.set(path, [...existing, ...objects]);
          return { objects: newObjects };
        });
        
        // Invalidate cache since we're modifying
        get().invalidateCache(path);
      },
      
      removeObject: (key: string, path: string) => {
        set((state) => {
          const newObjects = new Map(state.objects);
          const pathObjects = newObjects.get(path);
          
          if (pathObjects) {
            newObjects.set(
              path,
              pathObjects.filter(obj => obj.key !== key)
            );
          }
          
          return { objects: newObjects };
        });
        
        // Invalidate cache
        get().invalidateCache(path);
      },
      
      updateObject: (oldKey: string, newObject: R2Object, path: string) => {
        set((state) => {
          const newObjects = new Map(state.objects);
          const pathObjects = newObjects.get(path);
          
          if (pathObjects) {
            const index = pathObjects.findIndex(obj => obj.key === oldKey);
            if (index !== -1) {
              const updatedObjects = [...pathObjects];
              updatedObjects[index] = newObject;
              newObjects.set(path, updatedObjects);
            }
          }
          
          return { objects: newObjects };
        });
        
        // Invalidate cache
        get().invalidateCache(path);
      },
      
      // Folder tree management
      setFolderTree: (tree: FolderTreeNode[]) => {
        set({ folderTree: tree });
      },
      
      updateFolderTree: (updater: (tree: FolderTreeNode[]) => FolderTreeNode[]) => {
        set((state) => ({
          folderTree: updater(state.folderTree)
        }));
      },
      
      addFolderToTree: (path: string, folderName: string) => {
        const { updateFolderTree } = get();
        
        updateFolderTree((tree) => {
          const addFolder = (nodes: FolderTreeNode[], targetPath: string): FolderTreeNode[] => {
            if (!targetPath) {
              // Add to root
              return [...nodes, {
                name: folderName,
                path: folderName,
                children: [],
                isFolder: true
              }];
            }
            
            return nodes.map(node => {
              if (node.path === targetPath) {
                return {
                  ...node,
                  children: [...(node.children || []), {
                    name: folderName,
                    path: `${targetPath}/${folderName}`,
                    children: [],
                    isFolder: true
                  }]
                };
              }
              
              if (node.children && targetPath.startsWith(node.path)) {
                return {
                  ...node,
                  children: addFolder(node.children, targetPath)
                };
              }
              
              return node;
            });
          };
          
          return addFolder(tree, path);
        });
      },
      
      removeFolderFromTree: (path: string) => {
        const { updateFolderTree } = get();
        
        updateFolderTree((tree) => {
          const removeFolder = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            return nodes
              .filter(node => node.path !== path)
              .map(node => ({
                ...node,
                children: node.children ? removeFolder(node.children) : []
              }));
          };
          
          return removeFolder(tree);
        });
      },
      
      // Getters
      getObjects: (path: string): R2Object[] => {
        return get().objects.get(path) || [];
      },
      
      getObject: (key: string, path: string): R2Object | undefined => {
        const objects = get().getObjects(path);
        return objects.find(obj => obj.key === key);
      },
      
      getFolderNode: (path: string): FolderTreeNode | null => {
        const findNode = (nodes: FolderTreeNode[], targetPath: string): FolderTreeNode | null => {
          for (const node of nodes) {
            if (node.path === targetPath) {
              return node;
            }
            
            if (node.children) {
              const found = findNode(node.children, targetPath);
              if (found) return found;
            }
          }
          
          return null;
        };
        
        return findNode(get().folderTree, path);
      },
      
      // Cache-aware operations
      getCachedObjects: (path: string): R2Object[] | null => {
        return get().getCache(path);
      },
      
      setCachedObjects: (objects: R2Object[], path: string) => {
        get().setObjects(objects, path);
      },
      
      invalidatePath: (path: string) => {
        get().invalidateCache(path);
        
        // Also remove from objects map
        set((state) => {
          const newObjects = new Map(state.objects);
          newObjects.delete(path);
          return { objects: newObjects };
        });
      },
      
      invalidateAll: () => {
        get().invalidateAllCache();
        set({ objects: new Map(), folderTree: [] });
      }
    }),
    {
      name: 'file-system-store',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              objects: new Map(parsed.state.objects || []),
              cache: new Map(parsed.state.cache || [])
            }
          };
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              objects: Array.from(value.state.objects.entries()),
              cache: Array.from(value.state.cache.entries())
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      },
      // Only persist the tree structure, not the objects themselves
      // @ts-expect-error - partialize returns partial state
      partialize: (state) => ({
        folderTree: state.folderTree,
        cacheTimeout: state.cacheTimeout
      })
    }
  )
);

// Selectors
export const useObjects = (path: string) => 
  useFileSystemStore(state => state.getObjects(path));

export const useCachedObjects = (path: string) =>
  useFileSystemStore(state => state.getCachedObjects(path));

export const useFolderTree = () =>
  useFileSystemStore(state => state.folderTree);

export const useFolderNode = (path: string) =>
  useFileSystemStore(state => state.getFolderNode(path));