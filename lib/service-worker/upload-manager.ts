export interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export class UploadManager {
  private worker: ServiceWorker | null = null;
  private messageChannel: MessageChannel | null = null;
  private uploadCallbacks: Map<string, (event: MessageEvent['data']) => void> = new Map();

  async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('Initializing service worker...');
        
        // Clear any existing registrations first
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of existingRegistrations) {
          console.log('Unregistering existing service worker:', registration.scope);
          await registration.unregister();
        }
        
        // Register fresh service worker
        const registration = await navigator.serviceWorker.register('/upload-sw.js', {
          updateViaCache: 'none'
        });
        console.log('Service worker registered:', registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('Service worker is ready');
        
        // Get the active service worker
        const activeWorker = registration.active || registration.installing || registration.waiting;
        
        if (activeWorker && activeWorker.state === 'activated') {
          this.worker = activeWorker;
          console.log('Service worker active and ready:', this.worker);
          navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
          
          // Test service worker communication
          await this.testServiceWorkerCommunication();
        } else {
          console.warn('Service worker not in activated state, will use direct upload fallback');
          this.worker = null;
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        this.worker = null;
      }
    } else {
      console.error('Service workers are not supported in this browser');
    }
  }

  private async testServiceWorkerCommunication(): Promise<void> {
    return new Promise((resolve) => {
      const testId = 'test-communication';
      const timeout = setTimeout(() => {
        console.warn('UploadManager: Service worker communication test failed - timeout');
        this.worker = null; // Disable service worker for uploads
        resolve();
      }, 3000);

      const testCallback = (event: MessageEvent['data']) => {
        if (event.type === 'UPLOAD_STATUS') {
          clearTimeout(timeout);
          console.log('UploadManager: Service worker communication test successful');
          resolve();
        }
      };

      this.uploadCallbacks.set(testId, testCallback);
      
      const channel = new MessageChannel();
      channel.port1.onmessage = testCallback;
      
      try {
        this.worker?.postMessage({ type: 'GET_UPLOAD_STATUS' }, [channel.port2]);
      } catch (error) {
        clearTimeout(timeout);
        console.error('UploadManager: Service worker communication test failed:', error);
        this.worker = null;
        resolve();
      }
    });
  }

  private handleMessage(event: MessageEvent) {
    const { type, uploadId } = event.data;
    const callback = this.uploadCallbacks.get(uploadId);
    
    if (callback) {
      callback(event.data);
      
      if (type === 'UPLOAD_COMPLETE' || type === 'UPLOAD_FAILED') {
        this.uploadCallbacks.delete(uploadId);
      }
    }
  }

  async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    console.log('UploadManager: Starting upload for file:', file.name);
    console.log('UploadManager: Service worker status:', {
      workerExists: !!this.worker,
      workerState: this.worker?.state,
      navigatorSWReady: 'serviceWorker' in navigator
    });
    
    if (!this.worker) {
      console.warn('UploadManager: Service Worker not available, using direct upload fallback');
      // Fallback to direct upload without service worker
      return this.directUpload(file, path, onProgress);
    }
    
    console.log('UploadManager: Using service worker for upload');

    // Validate file input
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object provided');
    }

    if (!file.name || typeof file.name !== 'string') {
      throw new Error('File must have a valid name');
    }

    // Validate path
    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      // Set up timeout to fallback to direct upload if service worker doesn't respond
      const timeout = setTimeout(() => {
        console.warn('UploadManager: Service worker timeout, falling back to direct upload for file:', file.name);
        this.uploadCallbacks.delete(uploadId);
        // Fallback to direct upload
        this.directUpload(file, path, onProgress).then(resolve).catch(reject);
      }, 5000); // 5 second timeout
      
      this.uploadCallbacks.set(uploadId, (event) => {
        clearTimeout(timeout);
        console.log('UploadManager: Received service worker event:', event.type, 'for file:', file.name);
        switch (event.type) {
          case 'UPLOAD_PROGRESS':
            console.log('UploadManager: Service worker progress:', event.progress + '%', 'for file:', file.name);
            if (onProgress) {
              onProgress({
                id: uploadId,
                filename: file.name,
                progress: event.progress,
                status: 'uploading',
              });
            }
            break;
          case 'UPLOAD_COMPLETE':
            console.log('UploadManager: Service worker upload completed for file:', file.name);
            if (onProgress) {
              onProgress({
                id: uploadId,
                filename: file.name,
                progress: 100,
                status: 'completed',
              });
            }
            this.uploadCallbacks.delete(uploadId);
            resolve(event.result);
            break;
          case 'UPLOAD_FAILED':
            console.error('UploadManager: Service worker upload failed for file:', file.name, 'Error:', event.error);
            if (onProgress) {
              onProgress({
                id: uploadId,
                filename: file.name,
                progress: 0,
                status: 'failed',
                error: event.error,
              });
            }
            this.uploadCallbacks.delete(uploadId);
            reject(new Error(event.error));
            break;
        }
      });

      channel.port1.onmessage = this.uploadCallbacks.get(uploadId)!;

      try {
        this.worker?.postMessage(
          {
            type: 'UPLOAD_FILE',
            data: { file, uploadId, path },
          },
          [channel.port2]
        );
        console.log('UploadManager: Message sent to service worker for file:', file.name);
      } catch (error) {
        clearTimeout(timeout);
        console.error('UploadManager: Failed to send message to service worker, falling back to direct upload:', error);
        this.uploadCallbacks.delete(uploadId);
        this.directUpload(file, path, onProgress).then(resolve).catch(reject);
      }
    });
  }

  async cancelUpload(uploadId: string) {
    if (!this.worker) return;
    
    this.worker?.postMessage({
      type: 'CANCEL_UPLOAD',
      data: { uploadId },
    });
    
    this.uploadCallbacks.delete(uploadId);
  }

  async getUploadStatus(): Promise<UploadProgress[]> {
    if (!this.worker) return [];
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'UPLOAD_STATUS') {
          resolve(event.data.uploads);
        }
      };
      
      this.worker?.postMessage(
        { type: 'GET_UPLOAD_STATUS' },
        [channel.port2]
      );
    });
  }

  // Direct upload fallback when service worker is not available
  private async directUpload(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('UploadManager: DirectUpload starting for file:', file.name, 'with ID:', uploadId);
    
    return new Promise((resolve, reject) => {
      try {
        if (onProgress) {
          onProgress({
            id: uploadId,
            filename: file.name,
            progress: 0,
            status: 'uploading',
          });
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log('UploadManager: DirectUpload progress:', progress + '%', 'for file:', file.name);
            onProgress({
              id: uploadId,
              filename: file.name,
              progress: progress,
              status: 'uploading',
            });
          }
        });

        // Set up completion handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('UploadManager: DirectUpload completed successfully for file:', file.name);
              
              if (onProgress) {
                onProgress({
                  id: uploadId,
                  filename: file.name,
                  progress: 100,
                  status: 'completed',
                });
              }

              resolve(result);
            } catch {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        // Set up error handler
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed: Network error'));
        });

        // Start the upload
        xhr.open('POST', '/api/r2/upload');
        xhr.send(formData);
      } catch (error) {
        if (onProgress) {
          onProgress({
            id: uploadId,
            filename: file.name,
            progress: 0,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed',
          });
        }
        reject(error);
      }
    });
  }
}

export const uploadManager = new UploadManager();