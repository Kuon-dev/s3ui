import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { R2Object } from '@/lib/r2/operations';
import { toast } from 'sonner';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  lastModified?: Date;
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

// Query keys
export const r2QueryKeys = {
  all: ['r2'] as const,
  objects: (prefix: string) => [...r2QueryKeys.all, 'objects', prefix] as const,
  folderTree: (prefix: string) => [...r2QueryKeys.all, 'folder-tree', prefix] as const,
  search: (query: string) => [...r2QueryKeys.all, 'search', query] as const,
};

// Fetch objects in a folder
export function useR2Objects(prefix: string) {
  return useQuery({
    queryKey: r2QueryKeys.objects(prefix),
    queryFn: async () => {
      const apiPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
      const response = await fetch(`/api/r2/list?prefix=${encodeURIComponent(apiPrefix)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      return data.objects as R2Object[];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

// Fetch folder tree
export function useR2FolderTree(prefix: string = '') {
  return useQuery({
    queryKey: r2QueryKeys.folderTree(prefix),
    queryFn: async () => {
      const response = await fetch(`/api/r2/folder-tree?prefix=${encodeURIComponent(prefix)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load folder tree');
      }
      
      const data = await response.json();
      return data.folderTree as TreeNode[] || [];
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Search across all files
export function useR2Search(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: r2QueryKeys.search(query),
    queryFn: async () => {
      const response = await fetch(`/api/r2/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search files');
      }
      
      const data = await response.json();
      return data.results as R2Object[];
    },
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Create folder mutation
export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ path, name }: { path: string; name: string }) => {
      const fullPath = path ? `${path}/${name}` : name;
      const response = await fetch('/api/r2/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create folder');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success('Folder created successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.objects(variables.path) });
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.folderTree(variables.path) });
    },
    onError: () => {
      toast.error('Failed to create folder');
    },
  });
}

// Delete object mutation
export function useDeleteObject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (object: R2Object) => {
      const response = await fetch('/api/r2/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: object.key }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete object');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Deleted successfully');
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.all });
    },
    onError: () => {
      toast.error('Failed to delete');
    },
  });
}

// Rename object mutation
export function useRenameObject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ object, newName }: { object: R2Object; newName: string }) => {
      const response = await fetch('/api/r2/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldKey: object.key, 
          newName 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Renamed successfully');
      queryClient.invalidateQueries({ queryKey: r2QueryKeys.all });
    },
    onError: () => {
      toast.error('Failed to rename');
    },
  });
}

// Prefetch folder contents
export function usePrefetchFolder() {
  const queryClient = useQueryClient();
  
  return (prefix: string) => {
    queryClient.prefetchQuery({
      queryKey: r2QueryKeys.objects(prefix),
      queryFn: async () => {
        const apiPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
        const response = await fetch(`/api/r2/list?prefix=${encodeURIComponent(apiPrefix)}`);
        
        if (!response.ok) {
          throw new Error('Failed to load files');
        }
        
        const data = await response.json();
        return data.objects as R2Object[];
      },
      staleTime: 30 * 1000,
    });
  };
}