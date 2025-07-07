import { NextRequest, NextResponse } from 'next/server';
import { listObjectsRecursive } from '@/lib/r2/operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }
    
    // Get all objects recursively
    const allObjects = await listObjectsRecursive('');
    
    // Filter objects based on search query
    const results = allObjects
      .filter(obj => {
        const fileName = obj.key.split('/').pop() || '';
        const folderPath = obj.key.substring(0, obj.key.lastIndexOf('/'));
        
        // Search in file name and folder path
        return fileName.toLowerCase().includes(query.toLowerCase()) ||
               folderPath.toLowerCase().includes(query.toLowerCase());
      })
      .map(obj => ({
        key: obj.key,
        name: obj.key.split('/').pop() || obj.key,
        path: obj.key.substring(0, obj.key.lastIndexOf('/')) || '',
        size: obj.size,
        lastModified: obj.lastModified,
        isFolder: obj.key.endsWith('/'),
      }))
      .slice(0, 50); // Limit to 50 results for performance
    
    return NextResponse.json({
      success: true,
      results,
      totalCount: results.length,
    });
  } catch (error) {
    console.error('Failed to search files:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search files' 
      },
      { status: 500 }
    );
  }
}