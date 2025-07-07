import { NextRequest, NextResponse } from 'next/server';
import { renameObject } from '@/lib/r2/operations';

export async function POST(request: NextRequest) {
  try {
    const { oldKey, newKey } = await request.json();

    if (!oldKey || !newKey) {
      return NextResponse.json(
        { error: 'Both oldKey and newKey are required' },
        { status: 400 }
      );
    }

    await renameObject(oldKey, newKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming object:', error);
    return NextResponse.json(
      { error: 'Failed to rename object' },
      { status: 500 }
    );
  }
}