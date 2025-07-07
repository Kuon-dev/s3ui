import { NextResponse } from 'next/server';
import { listObjectsRecursive } from '@/lib/r2/operations';

export async function GET() {
  try {
    // Get all objects in the bucket
    const allObjects = await listObjectsRecursive('');
    
    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;
    let largestFile: { name: string; size: number } | null = null;
    const fileTypes: Record<string, { count: number; size: number }> = {};
    
    for (const object of allObjects) {
      if (object.isFolder) {
        folderCount++;
      } else {
        fileCount++;
        totalSize += object.size;
        
        // Track largest file
        if (!largestFile || object.size > largestFile.size) {
          largestFile = {
            name: object.key.split('/').pop() || object.key,
            size: object.size
          };
        }
        
        // Track file types
        const extension = object.key.split('.').pop()?.toLowerCase() || 'no-extension';
        if (!fileTypes[extension]) {
          fileTypes[extension] = { count: 0, size: 0 };
        }
        fileTypes[extension].count++;
        fileTypes[extension].size += object.size;
      }
    }
    
    return NextResponse.json({
      totalSize,
      fileCount,
      folderCount,
      largestFile,
      fileTypes
    });
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return NextResponse.json(
      { error: 'Failed to load storage stats' },
      { status: 500 }
    );
  }
}