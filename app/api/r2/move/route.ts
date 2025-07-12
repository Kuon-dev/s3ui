import { NextRequest, NextResponse } from 'next/server';
import { renameObject } from '@/lib/r2/operations';

export async function POST(request: NextRequest) {
  try {
    const { sourcePath, destinationPath, isFolder } = await request.json();

    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { error: 'Both sourcePath and destinationPath are required' },
        { status: 400 }
      );
    }

    // Construct the full destination key
    const sourceKey = isFolder && !sourcePath.endsWith('/') 
      ? sourcePath + '/' 
      : sourcePath;
    
    const sourceName = sourcePath.split('/').filter(Boolean).pop() || '';
    const destKey = destinationPath 
      ? `${destinationPath}/${sourceName}` 
      : sourceName;
    
    const finalDestKey = isFolder && !destKey.endsWith('/') 
      ? destKey + '/' 
      : destKey;

    // Use rename operation which handles both files and folders
    await renameObject(sourceKey, finalDestKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error moving object:', error);
    return NextResponse.json(
      { error: 'Failed to move object' },
      { status: 500 }
    );
  }
}