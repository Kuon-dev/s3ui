import { NextRequest, NextResponse } from 'next/server';
import { listObjects } from '@/lib/r2/operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';

    const objects = await listObjects(prefix);

    return NextResponse.json({ objects });
  } catch (error) {
    console.error('Error listing objects:', error);
    return NextResponse.json(
      { error: 'Failed to list objects' },
      { status: 500 }
    );
  }
}