# Technical Architecture Documentation

## Overview

This document provides a comprehensive technical overview of the Cloudflare R2 File Manager application, including architecture decisions, design patterns, and implementation details.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Core Components](#core-components)
4. [API Design](#api-design)
5. [Data Flow](#data-flow)
6. [Error Handling](#error-handling)
7. [Performance Optimizations](#performance-optimizations)
8. [Security Considerations](#security-considerations)

## Architecture Overview

The application follows a modern React-based architecture with server-side API routes and client-side state management:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Cloudflare    │
│                 │    │                 │    │       R2        │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • React UI      │◄──►│ • Next.js API   │◄──►│ • Object Storage│
│ • State Mgmt    │    │ • AWS SDK v3    │    │ • S3 Compatible │
│ • Service Worker│    │ • TypeScript    │    │ • REST API      │
│ • Error Boundary│    │ • Validation    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**: Clear separation between UI, business logic, and data access
2. **Type Safety**: Comprehensive TypeScript usage with strict typing
3. **Error Resilience**: Robust error handling at all layers
4. **Performance**: Lazy loading, caching, and optimistic updates
5. **User Experience**: Real-time feedback and progressive enhancement

## Technology Stack

### Frontend
- **Next.js 15**: App Router for routing and server-side rendering
- **React 18**: Component-based UI with hooks and concurrent features
- **TypeScript**: Static typing for enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Component library with consistent design system
- **CMDK**: Command palette for search functionality
- **Sonner**: Toast notifications for user feedback
- **Date-fns**: Date formatting and manipulation

### Backend
- **Next.js API Routes**: Server-side endpoints
- **AWS SDK v3**: Cloudflare R2 integration
- **TypeScript**: Type-safe server-side code

### Development & Build
- **ESLint**: Code linting and style enforcement
- **npm**: Package management
- **Turbopack**: Fast development builds

## Core Components

### 1. R2 Operations Layer (`lib/r2/operations.ts`)

Central library for all R2 storage operations:

```typescript
// Core operations
export async function listObjects(prefix?: string): Promise<R2Object[]>
export async function createFolder(folderPath: string): Promise<void>
export async function deleteObject(key: string): Promise<void>
export async function renameObject(oldKey: string, newKey: string): Promise<void>

// Tree operations
export async function getFolderTree(prefix?: string): Promise<FolderTreeNode[]>
export async function listObjectsRecursive(prefix: string): Promise<R2Object[]>

// Metadata operations
export async function getFileMetadata(key: string): Promise<FileMetadata>
```

**Design Patterns:**
- **Repository Pattern**: Abstracts R2 API complexity
- **Async/Await**: Consistent promise handling
- **Error Propagation**: Lets callers handle errors appropriately

### 2. File Browser Component (`components/r2/file-browser.tsx`)

Main application interface with Windows Explorer-style layout:

```typescript
interface FileBrowserProps {
  initialPath?: string;
}

export function FileBrowser({ initialPath = '' }: FileBrowserProps)
```

**Features:**
- Dual-pane layout (sidebar + main content)
- Real-time file operations
- Drag & drop support
- Keyboard shortcuts
- Search functionality

### 3. Global Search Component (`components/r2/global-search.tsx`)

Command palette for searching across all files:

```typescript
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}
```

**Features:**
- Real-time search with debouncing (300ms)
- Keyboard navigation (⌘K/Ctrl+K)
- File actions (preview, download)
- Result limiting (50 items) for performance

### 4. Upload Manager (`lib/service-worker/upload-manager.ts`)

Service Worker-based file upload system:

**Features:**
- Background uploads
- Progress tracking
- Multipart upload support
- Upload queue management

## API Design

### RESTful Endpoints

All API routes follow REST conventions and return consistent JSON responses:

```typescript
// Standard response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### Core Endpoints

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/api/r2/list` | GET | List objects | `prefix` |
| `/api/r2/upload` | POST | Upload files | Form data |
| `/api/r2/download` | GET | Download file | `key` |
| `/api/r2/create-folder` | POST | Create folder | `path` |
| `/api/r2/delete` | DELETE | Delete object | `key` |
| `/api/r2/rename` | PUT | Rename object | `oldKey`, `newKey` |
| `/api/r2/folder-tree` | GET | Get folder tree | `prefix` |
| `/api/r2/search` | GET | Search files | `q` (query) |

#### Error Handling

All endpoints use consistent error handling:

```typescript
try {
  // Operation logic
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { success: false, error: 'Operation failed' },
    { status: 500 }
  );
}
```

## Data Flow

### 1. File Listing Flow

```
User Navigation → FileBrowser → loadObjects() → /api/r2/list → R2 API → Update UI
```

### 2. File Upload Flow

```
File Drop → UploadDialog → ServiceWorker → /api/r2/upload → R2 API → Progress Updates
```

### 3. Global Search Flow

```
Search Input → Debouncing → /api/r2/search → listObjectsRecursive → Filter Results → Update UI
```

### 4. Folder Tree Flow

```
Folder Expand → R2FileTree → /api/r2/folder-tree → getFolderTree → Update Tree State
```

## Error Handling

### Multi-Layer Error Handling Strategy

1. **API Layer**: Catch and log errors, return user-friendly messages
2. **Component Layer**: Handle API errors and show toast notifications
3. **Global Layer**: Error boundaries catch unhandled React errors
4. **User Layer**: Clear error messages with actionable guidance

### Error Boundary Implementation

```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Performance Optimizations

### 1. Lazy Loading
- Folder tree nodes load children on expansion
- File lists paginated with virtual scrolling potential
- Component code splitting with dynamic imports

### 2. Caching Strategies
- Folder tree state cached in React state
- Search results debounced to reduce API calls
- File metadata cached for quick access

### 3. Service Worker Optimization
- Background file uploads
- Upload queue management
- Progress tracking without blocking UI

### 4. React Performance
- `useCallback` for stable function references
- `useMemo` for expensive computations
- Component memoization where appropriate

### 5. Network Optimization
- Multipart uploads for large files
- Parallel API requests where possible
- Request deduplication for identical operations

## Security Considerations

### 1. Environment Variables
All sensitive configuration stored in `.env.local`:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### 2. Input Validation
- All user inputs sanitized and validated
- File paths validated to prevent directory traversal
- File type validation on uploads

### 3. Error Information
- Sensitive information excluded from error messages
- Error details logged server-side only
- Generic error messages for client

### 4. CORS and Headers
- Appropriate CORS policies for API endpoints
- Security headers configured
- Content-Type validation

## Code Quality Standards

### 1. TypeScript Configuration
- Strict mode enabled
- No implicit any
- Exhaustive type checking

### 2. ESLint Configuration
- Consistent code style enforcement
- React hooks rules
- Import/export organization

### 3. Documentation Standards
- TSDoc comments for all public APIs
- README files for major components
- Architecture decision records (ADRs)

### 4. Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows

## Deployment Considerations

### 1. Environment Configuration
- Production environment variables
- Build optimization settings
- CDN configuration for static assets

### 2. Monitoring
- Error tracking and logging
- Performance monitoring
- Usage analytics

### 3. Scaling Considerations
- Horizontal scaling with stateless design
- Database considerations for metadata
- CDN usage for file delivery