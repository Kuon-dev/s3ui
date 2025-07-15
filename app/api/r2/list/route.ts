import { NextRequest, NextResponse } from 'next/server';
import { listObjects } from '@/lib/r2/operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';

    console.log('[API /list] Fetching objects for prefix:', prefix);
    const objects = await listObjects(prefix);
    console.log('[API /list] Found objects:', objects.length);

    // Add cache control headers to prevent browser caching
    return NextResponse.json(
      { objects },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error listing objects:', error);
    return NextResponse.json(
      { error: 'Failed to list objects' },
      { status: 500 }
    );
  }
}