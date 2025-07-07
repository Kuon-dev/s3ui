import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/lib/r2/client';
import { getFileType } from '@/lib/utils/file-types';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

/**
 * API route for previewing files from R2 storage.
 * Serves files inline with appropriate content types for preview.
 * 
 * @param request - NextRequest with query parameter 'key'
 * @returns File content with appropriate headers for preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Get file type info to determine how to serve it
    const filename = key.split('/').pop() || 'file';
    const fileType = getFileType(filename);

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);

    // Determine content type - prefer the detected MIME type
    let contentType = fileType.mimeType;
    
    // Use R2's content type if it's more specific
    if (response.ContentType && response.ContentType !== 'binary/octet-stream') {
      contentType = response.ContentType;
    }

    // Set appropriate headers for inline preview
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', buffer.length.toString());
    
    // For text files, ensure UTF-8 encoding
    if (contentType.startsWith('text/')) {
      headers.set('Content-Type', `${contentType}; charset=utf-8`);
    }
    
    // Enable CORS for preview requests
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set cache headers for better performance
    headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    // For supported preview types, serve inline
    if (fileType.previewable) {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      // For unsupported types, still serve inline but browser will likely download
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    return new NextResponse(buffer, { headers });

  } catch (error) {
    console.error('Preview error:', error);
    
    // Return appropriate error based on error type
    if (error instanceof Error) {
      if (error.message.includes('NoSuchKey')) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      if (error.message.includes('AccessDenied')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to preview file' }, 
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests for preview API.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}