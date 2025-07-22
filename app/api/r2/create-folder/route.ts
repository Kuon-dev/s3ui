import { NextRequest, NextResponse } from 'next/server';
import { createFolder } from '@/lib/r2/operations';

export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();

    if (!folderPath) {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      );
    }

    // Additional validation
    const trimmedPath = folderPath.trim();
    if (!trimmedPath || trimmedPath === '/' || trimmedPath === '') {
      return NextResponse.json(
        { error: 'Invalid folder path' },
        { status: 400 }
      );
    }

    // Check for empty folder names (paths ending with //)
    if (trimmedPath.includes('//')) {
      return NextResponse.json(
        { error: 'Folder path cannot contain empty segments' },
        { status: 400 }
      );
    }

    await createFolder(folderPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating folder:', error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}