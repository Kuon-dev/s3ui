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

    // Validate file object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file object' },
        { status: 400 }
      );
    }

    // Validate file name
    if (!file.name || typeof file.name !== 'string' || file.name.trim() === '') {
      return NextResponse.json(
        { error: 'File must have a valid name' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Check max file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Enhanced filename sanitization to handle Unicode and problematic characters
    const sanitizedFileName = file.name
      // Normalize Unicode characters (convert to standard form)
      .normalize('NFD')
      // Remove non-ASCII characters including Unicode spaces, combining marks, etc.
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .replace(/[\u2000-\u206f]/g, ' ') // Replace Unicode spaces with regular space
      .replace(/[\u2070-\u209f]/g, '') // Remove superscripts/subscripts
      .replace(/[\u20a0-\u20cf]/g, '') // Remove currency symbols
      .replace(/[\u2100-\u214f]/g, '') // Remove letterlike symbols
      // Remove or replace problematic characters
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\.\./g, '')
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      // Clean up spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    if (!sanitizedFileName) {
      return NextResponse.json(
        { error: 'Invalid filename after sanitization' },
        { status: 400 }
      );
    }

    // Create the key by combining path and filename
    // Remove any trailing slashes from path to avoid double slashes
    const cleanPath = path ? path.replace(/\/+$/, '') : '';
    const key = cleanPath ? `${cleanPath}/${sanitizedFileName}` : sanitizedFileName;

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
      contentType: file.type || 'application/octet-stream',
      filename: sanitizedFileName,
      originalFilename: file.name,
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