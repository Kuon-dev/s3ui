# API Reference Documentation

## Overview

This document provides comprehensive documentation for all API endpoints and data structures used in the Cloudflare R2 File Manager application.

## Table of Contents

1. [Authentication](#authentication)
2. [Common Response Format](#common-response-format)
3. [Error Codes](#error-codes)
4. [Data Types](#data-types)
5. [API Endpoints](#api-endpoints)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Usage Examples](#usage-examples)

## Authentication

The application uses server-side environment variables for R2 authentication. No client-side authentication is required.

**Required Environment Variables:**
```bash
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

## Common Response Format

All API endpoints return responses in the following format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

## Error Codes

| HTTP Code | Description | Common Causes |
|-----------|-------------|---------------|
| 200 | Success | Operation completed successfully |
| 400 | Bad Request | Invalid parameters, malformed request |
| 404 | Not Found | Object or endpoint doesn't exist |
| 500 | Internal Server Error | R2 API error, configuration issue |

## Data Types

### R2Object

Represents a file or folder in R2 storage:

```typescript
interface R2Object {
  /** The full path/key of the object in R2 storage */
  key: string;
  /** Size of the object in bytes (0 for folders) */
  size: number;
  /** Last modification timestamp */
  lastModified: Date;
  /** Whether this object represents a folder */
  isFolder: boolean;
  /** Optional ETag for object versioning */
  etag?: string;
  /** Storage class (if applicable) */
  storageClass?: string;
}
```

### FolderTreeNode

Represents a node in the folder tree structure:

```typescript
interface FolderTreeNode {
  /** Display name of the folder/file */
  name: string;
  /** Full path/key in R2 storage */
  path: string;
  /** Child nodes (for folders) */
  children: FolderTreeNode[];
  /** Whether this node is currently expanded in the UI */
  isExpanded?: boolean;
  /** Whether this node represents a folder */
  isFolder: boolean;
  /** File size in bytes (undefined for folders) */
  size?: number;
  /** Last modification date (undefined for folders) */
  lastModified?: Date;
}
```

### SearchResult

Represents a search result:

```typescript
interface SearchResult {
  /** Full R2 object key/path */
  key: string;
  /** Display name (filename or folder name) */
  name: string;
  /** Parent folder path */
  path: string;
  /** File size in bytes (0 for folders) */
  size: number;
  /** ISO string of last modification date */
  lastModified: string;
  /** Whether this result is a folder */
  isFolder: boolean;
}
```

## API Endpoints

### List Objects

Lists objects (files and folders) with optional prefix filtering.

**Endpoint:** `GET /api/r2/list`

**Parameters:**
- `prefix` (optional): Filter objects by prefix

**Response:**
```typescript
{
  success: true,
  objects: R2Object[]
}
```

**Example:**
```bash
GET /api/r2/list?prefix=documents/
```

### Upload Files

Uploads one or more files to R2 storage.

**Endpoint:** `POST /api/r2/upload`

**Parameters:**
- `files`: FormData with file objects
- `path` (optional): Target folder path

**Response:**
```typescript
{
  success: true,
  data: {
    uploaded: string[]; // Array of uploaded file keys
  }
}
```

**Example:**
```javascript
const formData = new FormData();
formData.append('files', file);
formData.append('path', 'documents/');

fetch('/api/r2/upload', {
  method: 'POST',
  body: formData
});
```

### Download File

Downloads a file from R2 storage.

**Endpoint:** `GET /api/r2/download`

**Parameters:**
- `key`: Object key to download

**Response:** Binary file content with appropriate headers

**Example:**
```bash
GET /api/r2/download?key=documents/file.pdf
```

### Create Folder

Creates a new folder in R2 storage.

**Endpoint:** `POST /api/r2/create-folder`

**Request Body:**
```typescript
{
  path: string; // Folder path to create
}
```

**Response:**
```typescript
{
  success: true
}
```

**Example:**
```javascript
fetch('/api/r2/create-folder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: 'new-folder' })
});
```

### Delete Object

Deletes a file or folder (with all contents) from R2 storage.

**Endpoint:** `DELETE /api/r2/delete`

**Parameters:**
- `key`: Object key to delete

**Response:**
```typescript
{
  success: true
}
```

**Example:**
```bash
DELETE /api/r2/delete?key=documents/file.pdf
```

### Rename Object

Renames a file or folder in R2 storage.

**Endpoint:** `PUT /api/r2/rename`

**Request Body:**
```typescript
{
  oldKey: string; // Current object key
  newKey: string; // New object key
}
```

**Response:**
```typescript
{
  success: true
}
```

**Example:**
```javascript
fetch('/api/r2/rename', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    oldKey: 'old-name.pdf',
    newKey: 'new-name.pdf'
  })
});
```

### Get Folder Tree

Retrieves the folder tree structure for a given prefix.

**Endpoint:** `GET /api/r2/folder-tree`

**Parameters:**
- `prefix` (optional): Folder prefix to get tree for

**Response:**
```typescript
{
  success: true,
  folderTree: FolderTreeNode[]
}
```

**Example:**
```bash
GET /api/r2/folder-tree?prefix=documents/
```

### Search Files

Searches for files and folders across the entire bucket.

**Endpoint:** `GET /api/r2/search`

**Parameters:**
- `q`: Search query string

**Response:**
```typescript
{
  success: true,
  results: SearchResult[],
  totalCount: number
}
```

**Example:**
```bash
GET /api/r2/search?q=document
```

### Copy Object

Copies a file or folder to a new location.

**Endpoint:** `POST /api/r2/copy`

**Request Body:**
```typescript
{
  sourceKey: string; // Source object key
  destKey: string;   // Destination object key
}
```

**Response:**
```typescript
{
  success: true
}
```

**Example:**
```javascript
fetch('/api/r2/copy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceKey: 'documents/original.pdf',
    destKey: 'backup/copy.pdf'
  })
});
```

### File Preview

Generates a preview for supported file types.

**Endpoint:** `GET /api/r2/preview`

**Parameters:**
- `key`: Object key to preview

**Response:** Preview data or redirect to preview URL

**Example:**
```bash
GET /api/r2/preview?key=documents/image.jpg
```

### Storage Statistics

Gets storage usage statistics for the bucket.

**Endpoint:** `GET /api/r2/stats`

**Response:**
```typescript
{
  success: true,
  stats: {
    totalSize: number;      // Total size in bytes
    totalObjects: number;   // Total number of objects
    folderCount: number;    // Number of folders
    fileCount: number;      // Number of files
  }
}
```

**Example:**
```bash
GET /api/r2/stats
```

## TypeScript Interfaces

### Component Props

#### FileBrowserProps
```typescript
interface FileBrowserProps {
  /** Initial path to display (defaults to root) */
  initialPath?: string;
}
```

#### GlobalSearchProps
```typescript
interface GlobalSearchProps {
  /** Whether the search modal is currently open */
  isOpen: boolean;
  /** Callback to close the search modal */
  onClose: () => void;
  /** Callback to navigate to a specific path */
  onNavigate: (path: string) => void;
}
```

#### R2FileTreeProps
```typescript
interface R2FileTreeProps {
  /** Current selected path */
  currentPath: string;
  /** Callback when user navigates to a path */
  onNavigate: (path: string) => void;
  /** Additional CSS classes */
  className?: string;
}
```

### Service Worker Types

#### UploadProgress
```typescript
interface UploadProgress {
  /** File being uploaded */
  file: File;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current upload status */
  status: 'pending' | 'uploading' | 'completed' | 'error';
  /** Error message if status is 'error' */
  error?: string;
  /** Upload ID for tracking */
  uploadId?: string;
  /** Bytes uploaded so far */
  loaded?: number;
  /** Total bytes to upload */
  total?: number;
}
```

### Store Types

#### FileBrowserStore
```typescript
interface FileBrowserStore {
  // State
  objects: R2Object[]
  currentPath: string
  selectedObjects: Set<string>
  isLoading: boolean
  folderTree: FolderTreeNode[]
  
  // Drag & Drop
  draggedObjects: R2Object[]
  isDragging: boolean
  
  // Clipboard
  clipboard: ClipboardData | null
  
  // Actions
  loadObjects: (prefix: string) => Promise<void>
  loadFolderTree: () => Promise<void>
  setSelectedObjects: (keys: string[]) => void
  deleteObjects: (keys: string[]) => Promise<void>
  copyObjects: (sourceKeys: string[], destPath: string) => Promise<void>
  
  // Dialog Management
  uploadDialogOpen: boolean
  deleteDialogOpen: boolean
  renameDialogOpen: boolean
  // ... other dialogs
}
```

#### ThemeStore
```typescript
interface ThemeStore {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themes: Theme[]
}

type ThemeId = 'sunset' | 'ocean' | 'forest' | 'aurora' | 
               'amber' | 'rose' | 'coral' |
               'arctic' | 'twilight' | 'mint' |
               'mono' | 'neutral' | 'gray'
```

## Usage Examples

### Basic File Operations

```typescript
// List files in root
const response = await fetch('/api/r2/list');
const { objects } = await response.json();

// Create a folder
await fetch('/api/r2/create-folder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: 'documents' })
});

// Upload a file
const formData = new FormData();
formData.append('files', file);
formData.append('path', 'documents/');

await fetch('/api/r2/upload', {
  method: 'POST',
  body: formData
});

// Delete a file
await fetch(`/api/r2/delete?key=${encodeURIComponent(fileKey)}`, {
  method: 'DELETE'
});
```

### Advanced Operations

```typescript
// Search for files with debouncing
const searchFiles = debounce(async (query: string) => {
  const response = await fetch(`/api/r2/search?q=${encodeURIComponent(query)}`);
  const { results } = await response.json();
  return results;
}, 300);

// Copy multiple files
async function copyMultipleFiles(files: string[], destPath: string) {
  const promises = files.map(file => 
    fetch('/api/r2/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceKey: file,
        destKey: `${destPath}/${file.split('/').pop()}`
      })
    })
  );
  await Promise.all(promises);
}

// Get storage statistics
const statsResponse = await fetch('/api/r2/stats');
const { stats } = await statsResponse.json();
console.log(`Total storage: ${formatBytes(stats.totalSize)}`);

// Upload with Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.controller?.postMessage({
    type: 'UPLOAD_FILE',
    file: file,
    uploadUrl: '/api/r2/upload',
    path: currentPath
  });
}
```

### Error Handling

```typescript
async function safeApiCall<T>(operation: () => Promise<Response>): Promise<T | null> {
  try {
    const response = await operation();
    const data = await response.json();
    
    if (!data.success) {
      console.error('API Error:', data.error);
      toast.error(data.error || 'Operation failed');
      return null;
    }
    
    return data.data || data;
  } catch (error) {
    console.error('Network Error:', error);
    toast.error('Network error occurred');
    return null;
  }
}

// Usage
const objects = await safeApiCall<{ objects: R2Object[] }>(() => 
  fetch('/api/r2/list')
);
```

## State Management Examples

### Using FileBrowserStore

```typescript
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';

function FileManager() {
  const {
    objects,
    isLoading,
    loadObjects,
    selectedObjects,
    setSelectedObjects,
    deleteObjects
  } = useFileBrowserStore();

  // Load objects with caching
  useEffect(() => {
    loadObjects(currentPath); // 60-second cache
  }, [currentPath]);

  // Multi-select handling
  const handleSelect = (key: string, multi: boolean) => {
    if (multi) {
      const newSelection = new Set(selectedObjects);
      if (newSelection.has(key)) {
        newSelection.delete(key);
      } else {
        newSelection.add(key);
      }
      setSelectedObjects(Array.from(newSelection));
    } else {
      setSelectedObjects([key]);
    }
  };
}
```

### Using ThemeStore

```typescript
import { useThemeStore } from '@/lib/stores/theme-store';

function ThemeSwitcher() {
  const { theme, setTheme, themes } = useThemeStore();

  return (
    <Select value={theme} onValueChange={setTheme}>
      {themes.map(t => (
        <SelectItem key={t.id} value={t.id}>
          {t.name}
        </SelectItem>
      ))}
    </Select>
  );
}
```

## Rate Limiting & Performance

### Best Practices

1. **Debounce Search Queries**: 300ms delay implemented by default
2. **Object Caching**: 60-second TTL in FileBrowserStore
3. **Lazy Loading**: Folder tree loads on-demand
4. **Virtual Scrolling**: Components ready for large lists
5. **Service Worker Uploads**: Non-blocking file transfers

### Performance Considerations

- Use pagination for large file lists
- Implement virtual scrolling for many results
- Consider implementing request cancellation for abandoned operations
- Use AbortController for fetch requests that may be cancelled

## Error Handling Patterns

### Client-Side Error Handling

```typescript
try {
  const response = await fetch('/api/r2/list');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  if (!data.success) {
    throw new Error(data.error || 'Operation failed');
  }
  
  return data;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(error.message || 'An error occurred');
  throw error;
}
```

### Server-Side Error Handling

```typescript
export async function GET(request: NextRequest) {
  try {
    // Operation logic
    const result = await performOperation();
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Operation failed'
      },
      { status: 500 }
    );
  }
}
```