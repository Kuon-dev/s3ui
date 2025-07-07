import { NextRequest, NextResponse } from 'next/server';
import { Upload } from '@aws-sdk/lib-storage';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create the key by combining path and filename
    const key = path ? `${path}/${file.name}` : file.name;

    // Convert File to Buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // Use Upload class for better handling of large files
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
        ContentLength: file.size,
      },
    });

    // Start the upload
    const result = await upload.done();

    return NextResponse.json({
      success: true,
      key,
      size: file.size,
      contentType: file.type,
      etag: result.ETag,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    let errorMessage = 'Failed to upload file';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('NoSuchBucket')) {
        errorMessage = 'Bucket not found. Please check your R2 configuration.';
        statusCode = 404;
      } else if (error.message.includes('AccessDenied')) {
        errorMessage = 'Access denied. Please check your R2 credentials.';
        statusCode = 403;
      } else if (error.message.includes('InvalidRequest')) {
        errorMessage = 'Invalid request. Please check the file and try again.';
        statusCode = 400;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}