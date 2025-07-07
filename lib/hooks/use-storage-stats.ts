import { useQuery } from '@tanstack/react-query';
import { r2QueryKeys } from './use-r2-queries';

interface StorageStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  largestFile: { name: string; size: number } | null;
  fileTypes: Record<string, { count: number; size: number }>;
}

export function useStorageStats() {
  return useQuery({
    queryKey: [...r2QueryKeys.all, 'storage-stats'],
    queryFn: async (): Promise<StorageStats> => {
      const response = await fetch('/api/r2/stats');
      
      if (!response.ok) {
        throw new Error('Failed to load storage stats');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}