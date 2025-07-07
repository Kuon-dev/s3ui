import { NextRequest, NextResponse } from 'next/server';
import { copyObjectOrFolder } from '@/lib/r2/operations';
import { validateFolderName } from '@/lib/utils/file-utils';

interface CopyRequest {
  sourcePath: string;
  destinationPath: string;
  isFolder: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CopyRequest;
    const { sourcePath, destinationPath, isFolder } = body;

    // Validate inputs
    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { error: 'Source and destination paths are required' },
        { status: 400 }
      );
    }

    // Extract the name from the source path
    const sourceName = isFolder 
      ? sourcePath.replace(/\/$/, '').split('/').pop() || ''
      : sourcePath.split('/').pop() || '';
    
    // Build the full destination path
    const destFolder = destinationPath.endsWith('/') ? destinationPath : destinationPath + '/';
    const fullDestPath = destFolder + sourceName + (isFolder ? '/' : '');
    
    // For folders, validate the name
    if (isFolder) {
      const validation = validateFolderName(sourceName);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.errors[0] },
          { status: 400 }
        );
      }
    }

    // Perform the copy operation
    await copyObjectOrFolder(sourcePath, fullDestPath, isFolder);

    return NextResponse.json({ 
      success: true,
      message: `Successfully copied "${sourceName}" to ${destFolder}`,
      destinationPath: fullDestPath
    });
  } catch (error) {
    console.error('Copy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to copy' },
      { status: 500 }
    );
  }
}