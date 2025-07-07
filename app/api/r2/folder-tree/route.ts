import { NextRequest, NextResponse } from 'next/server';
import { getFolderTree } from '@/lib/r2/operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';
    
    const tree = await getFolderTree(prefix);
    
    return NextResponse.json({
      success: true,
      tree,
    });
  } catch (error) {
    console.error('Failed to get folder tree:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load folder tree' 
      },
      { status: 500 }
    );
  }
}