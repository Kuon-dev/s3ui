// Service Worker for handling file uploads
let uploadQueue = [];
let activeUploads = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
    controller: new AbortController(),
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch('/api/r2/upload', {
      method: 'POST',
      body: formData,
      signal: activeUploads.get(uploadId).controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
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
  if (upload && upload.controller) {
    upload.controller.abort();
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