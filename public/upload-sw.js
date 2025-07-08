// Service Worker for handling file uploads
const SW_VERSION = '2.0';
let uploadQueue = [];
let activeUploads = new Map();

console.log('Upload Service Worker v' + SW_VERSION + ' loaded');

self.addEventListener('install', (event) => {
  console.log('Upload Service Worker v' + SW_VERSION + ' installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Upload Service Worker v' + SW_VERSION + ' activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'UPLOAD_FILE':
      handleUpload(data, event.ports[0]);
      break;
    case 'CANCEL_UPLOAD':
      cancelUpload(data.uploadId);
      break;
    case 'GET_UPLOAD_STATUS':
      event.ports[0].postMessage({
        type: 'UPLOAD_STATUS',
        uploads: Array.from(activeUploads.entries()).map(([id, upload]) => ({
          id,
          filename: upload.filename,
          progress: upload.progress,
          status: upload.status,
        })),
      });
      break;
  }
});

async function handleUpload(data, port) {
  const { file, uploadId, path } = data;
  
  // Validate inputs
  if (!file || !file.name) {
    port.postMessage({
      type: 'UPLOAD_FAILED',
      uploadId,
      error: 'Invalid file object or missing filename',
    });
    return;
  }

  activeUploads.set(uploadId, {
    filename: file.name || 'unnamed_file',
    progress: 0,
    status: 'uploading',
    xhr: null,
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    // Store xhr for cancellation
    activeUploads.set(uploadId, {
      ...activeUploads.get(uploadId),
      xhr: xhr,
    });

    // Set up progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        
        // Update active upload progress
        const upload = activeUploads.get(uploadId);
        if (upload) {
          activeUploads.set(uploadId, {
            ...upload,
            progress: progress,
          });
        }
        
        // Send progress update
        port.postMessage({
          type: 'UPLOAD_PROGRESS',
          uploadId,
          progress,
        });
      }
    });

    // Set up completion handler
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          
          activeUploads.set(uploadId, {
            ...activeUploads.get(uploadId),
            progress: 100,
            status: 'completed',
          });

          port.postMessage({
            type: 'UPLOAD_COMPLETE',
            uploadId,
            result,
          });
        } catch (error) {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error(`Upload failed: ${xhr.statusText}`);
      }
    });

    // Set up error handler
    xhr.addEventListener('error', () => {
      throw new Error('Upload failed: Network error');
    });

    // Set up abort handler
    xhr.addEventListener('abort', () => {
      const upload = activeUploads.get(uploadId);
      if (upload) {
        activeUploads.set(uploadId, {
          ...upload,
          status: 'cancelled',
        });
      }
      
      port.postMessage({
        type: 'UPLOAD_FAILED',
        uploadId,
        error: 'Upload cancelled',
      });
    });

    // Start the upload
    xhr.open('POST', '/api/r2/upload');
    xhr.send(formData);

  } catch (error) {
    const upload = activeUploads.get(uploadId);
    if (upload) {
      activeUploads.set(uploadId, {
        ...upload,
        status: 'failed',
        error: error.message,
      });
    }

    port.postMessage({
      type: 'UPLOAD_FAILED',
      uploadId,
      error: error.message,
    });
  } finally {
    // Clean up after a delay
    setTimeout(() => {
      activeUploads.delete(uploadId);
    }, 5000);
  }
}

function cancelUpload(uploadId) {
  const upload = activeUploads.get(uploadId);
  if (upload && upload.xhr) {
    upload.xhr.abort();
    activeUploads.delete(uploadId);
  }
}

// Handle fetch events for upload progress tracking
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/api/r2/upload' && event.request.method === 'POST') {
    event.respondWith(handleTrackedUpload(event.request));
  }
});

async function handleTrackedUpload(request) {
  const response = await fetch(request);
  
  // Note: In a real implementation, we'd track upload progress here
  // For R2/S3, we'd need to implement multipart upload with progress tracking
  
  return response;
}