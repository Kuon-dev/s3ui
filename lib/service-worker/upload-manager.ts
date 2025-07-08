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
        const registration = await navigator.serviceWorker.register('/upload-sw.js');
        await navigator.serviceWorker.ready;
        
        this.worker = registration.active || registration.installing || registration.waiting;
        
        if (this.worker) {
          navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
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
    if (!this.worker) {
      throw new Error('Service Worker not initialized');
    }

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
      
      this.uploadCallbacks.set(uploadId, (event) => {
        switch (event.type) {
          case 'UPLOAD_PROGRESS':
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
            if (onProgress) {
              onProgress({
                id: uploadId,
                filename: file.name,
                progress: 100,
                status: 'completed',
              });
            }
            resolve(event.result);
            break;
          case 'UPLOAD_FAILED':
            if (onProgress) {
              onProgress({
                id: uploadId,
                filename: file.name,
                progress: 0,
                status: 'failed',
                error: event.error,
              });
            }
            reject(new Error(event.error));
            break;
        }
      });

      channel.port1.onmessage = this.uploadCallbacks.get(uploadId)!;

      this.worker?.postMessage(
        {
          type: 'UPLOAD_FILE',
          data: { file, uploadId, path },
        },
        [channel.port2]
      );
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
}

export const uploadManager = new UploadManager();