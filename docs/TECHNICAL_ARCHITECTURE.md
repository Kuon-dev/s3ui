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
- **Next.js 15**: App Router with Turbopack for fast development
- **React 19**: Latest React features with improved performance
- **TypeScript**: Static typing with strict mode enabled
- **Tailwind CSS v4**: Modern CSS with OKLCH color space
- **Shadcn UI**: Comprehensive component library
- **Motion (Framer Motion)**: Advanced animations with spring presets
- **Zustand**: State management with persistence
- **next-intl**: Internationalization with 6 language support
- **TanStack Query**: Data fetching (installed, ready for migration)
- **CMDK**: Command palette for search functionality
- **Sonner**: Toast notifications for user feedback

### Backend
- **Next.js API Routes**: RESTful server-side endpoints
- **AWS SDK v3**: Cloudflare R2 S3-compatible integration
- **TypeScript**: Type-safe server-side code

### UI Enhancements
- **tw-animate-css**: CSS animations for UI feedback
- **Lucide React**: Modern icon library
- **Radix UI**: Accessible component primitives
- **Class Variance Authority**: Dynamic styling utilities
- **Tailwind Merge**: Intelligent class merging

### Development & Build
- **ESLint**: Code linting and style enforcement
- **Turbopack**: Lightning-fast development builds
- **Standalone Output**: Optimized production builds
- **Docker**: Containerization support

## Core Components

### 1. State Management Layer (`lib/stores/`)

The application uses a modular state management architecture with specialized Zustand stores:

#### Core Stores

- **`file-system-store.ts`**: R2 objects and folder tree management
- **`navigation-store.ts`**: Path navigation and folder expansion state
- **`selection-store.ts`**: Multi-select operations and keyboard shortcuts
- **`drag-drop-store.ts`**: Drag and drop state management
- **`ui-state-store.ts`**: UI preferences, dialogs, and search
- **`clipboard-store.ts`**: Cut/copy/paste operations
- **`locale-store.ts`**: Language preferences and i18n state

#### File Browser Store (`lib/stores/file-browser-store.ts`)
Zustand-based central state management:

```typescript
interface FileBrowserStore {
  // State
  objects: R2Object[]
  folderTree: FolderTreeNode[]
  selectedObjects: Set<string>
  draggedObjects: R2Object[]
  
  // Actions
  loadObjects: (prefix: string) => Promise<void>
  loadFolderTree: () => Promise<void>
  setSelectedObjects: (keys: string[]) => void
  
  // Cache management
  clearCache: (prefix?: string) => void
  
  // Dialog states
  uploadDialogOpen: boolean
  deleteDialogOpen: boolean
  // ... other dialog states
}
```

**Features:**
- **60-second Object Caching**: Reduces API calls
- **Optimistic Updates**: Immediate UI feedback
- **Persistence**: View preferences saved to localStorage
- **Complex State**: Drag & drop, clipboard, multi-select

#### Theme Store (`lib/stores/theme-store.ts`)
Advanced theming system:

```typescript
interface ThemeStore {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themes: Theme[]
}
```

**12 Pre-built Themes:**
- Vibrant: Sunset, Ocean, Forest, Aurora
- Warm: Amber, Rose, Coral
- Cool: Arctic, Twilight, Mint
- Minimal: Mono, Neutral, Gray

### 2. R2 Operations Layer (`lib/r2/operations.ts`)

Enhanced R2 storage operations:

```typescript
// Core operations
export async function listObjects(prefix?: string): Promise<R2Object[]>
export async function createFolder(folderPath: string): Promise<void>
export async function deleteObject(key: string): Promise<void>
export async function renameObject(oldKey: string, newKey: string): Promise<void>
export async function copyObject(sourceKey: string, destKey: string): Promise<void>

// Tree operations
export async function getFolderTree(prefix?: string): Promise<FolderTreeNode[]>
export async function listObjectsRecursive(prefix: string): Promise<R2Object[]>

// Enhanced operations
export async function getFileMetadata(key: string): Promise<FileMetadata>
export async function getStorageStats(): Promise<StorageStats>
export async function searchObjects(query: string): Promise<SearchResult[]>
```

**Design Patterns:**
- **Repository Pattern**: Abstracts R2 API complexity
- **Error Handling**: Comprehensive error catching and logging
- **Unicode Normalization**: Handles special characters in filenames

### 3. File Browser Component (`components/r2/file-browser.tsx`)

Enhanced main application interface:

```typescript
export function FileBrowser() {
  const store = useFileBrowserStore()
  
  return (
    <div className="h-screen flex flex-col">
      <UtilityHeader />
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={15}>
          <R2FileTree />
        </Panel>
        <PanelResizeHandle />
        <Panel>
          <FileList />
        </Panel>
      </PanelGroup>
    </div>
  )
}
```

**Features:**
- **Resizable Panels**: Using react-resizable-panels
- **Integrated Store**: Zustand state management
- **Utility Header**: Quick actions and navigation
- **Enhanced Drag & Drop**: Multi-file support with visual feedback
- **Keyboard Shortcuts**: Delete (Del), Rename (F2), Copy/Paste (⌘C/⌘V)
- **Empty States**: User-friendly empty folder messages
- **Bulk Operations**: Multi-select with bulk delete dialog
- **Context Menus**: Unified context menu for consistent operations

### 4. Global Search Component (`components/r2/global-search-enhanced.tsx`)

Advanced command palette using CMDK:

```typescript
export function GlobalSearchEnhanced() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  
  return (
    <CommandDialog>
      <CommandInput placeholder="Search files..." />
      <CommandList>
        <CommandGroup heading="Files">
          {results.map(result => (
            <CommandItem key={result.key}>
              {result.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

**Features:**
- **300ms Debouncing**: Reduces API calls
- **CMDK Integration**: Smooth keyboard navigation
- **File Actions**: Preview, download, navigate
- **Result Limiting**: 50 items max for performance
- **Search History**: Recent searches saved

### 5. Common File Operations Hook (`lib/hooks/use-common-file-operations.ts`)

Shared file operations for consistent behavior across components:

```typescript
export function useCommonFileOperations() {
  // Clipboard operations
  handleCopy(object, sourcePath)
  handleCut(object, sourcePath)
  
  // File operations  
  handleRename(object)
  handleDelete(object)
  handlePreview(object)
  handleDownload(object)
  
  // Utility operations
  handleCopyUrl(object)
  handleCopyPath(path)
}
```

**Features:**
- **Unified Operations**: Consistent behavior across file tree and table
- **Toast Notifications**: User feedback for all operations
- **Type Safety**: Works with both R2Object and simplified objects
- **Clipboard Integration**: Cut/copy operations with visual feedback

### 6. Unified Context Menu (`components/r2/unified-context-menu.tsx`)

Consistent context menu for all file operations:

```typescript
export function UnifiedContextMenu({
  object,
  currentPath,
  context: 'file-tree' | 'table',
  // Context-specific callbacks
  onNavigate,
  onCreateFolder,
  onRefresh,
  onExpandAll,
  onCollapseAll
})
```

**Features:**
- **Context-Aware**: Different options for file tree vs table
- **Keyboard Shortcuts**: Visual hints for all operations
- **Clipboard Status**: Shows paste availability and item count
- **Hierarchical Actions**: Primary, edit, view, and utility sections
- **Icon Consistency**: Lucide icons throughout

### 7. Service Worker (`public/upload-sw.js`)

Enhanced upload management system:

```javascript
// Version 2.0 features
self.addEventListener('message', event => {
  if (event.data.type === 'UPLOAD_FILE') {
    handleFileUpload(event.data)
  }
})

async function handleFileUpload({ file, uploadUrl }) {
  // Progress tracking
  // Queue management
  // Multipart support for large files
  // Network resilience
}
```

**Features:**
- **Background Uploads**: Non-blocking file uploads
- **Progress Events**: Real-time upload progress
- **Queue Management**: Sequential upload processing
- **Error Recovery**: Automatic retry on failure
- **Large File Support**: Multipart uploads for files >5MB

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
| `/api/r2/upload` | POST | Upload files | Form data with validation |
| `/api/r2/download` | GET | Download file | `key` |
| `/api/r2/create-folder` | POST | Create folder | `path` |
| `/api/r2/delete` | DELETE | Delete object | `key` (recursive for folders) |
| `/api/r2/rename` | PUT | Rename object | `oldKey`, `newKey` |
| `/api/r2/copy` | POST | Copy object | `sourceKey`, `destKey` |
| `/api/r2/move` | POST | Move object | `sourcePath`, `destinationPath`, `isFolder` |
| `/api/r2/folder-tree` | GET | Get folder tree | `prefix` |
| `/api/r2/search` | GET | Search files | `q` (query) |
| `/api/r2/preview` | GET | File preview | `key` |
| `/api/r2/stats` | GET | Storage stats | - |

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

### 1. State Management & Caching
- **60-second Object Cache**: Automatic cache invalidation
- **Folder Tree Caching**: Lazy-loaded folder contents
- **Request Deduplication**: Prevents duplicate API calls
- **Optimistic Updates**: Immediate UI feedback

### 2. UI Performance
- **Virtual Scrolling Ready**: Components prepared for large lists
- **Debounced Search**: 300ms delay reduces API calls
- **Memoized Components**: React.memo for expensive renders
- **Spring Animations**: Hardware-accelerated Motion animations

### 3. Service Worker Optimization
- **Background Uploads**: Non-blocking file transfers
- **Queue Management**: Sequential processing
- **Progress Tracking**: Real-time upload feedback
- **Network Resilience**: Automatic retry on failure

### 4. Build & Bundle Optimization
- **Turbopack**: Fast development builds
- **Standalone Output**: Optimized production bundles
- **Dynamic Imports**: Code splitting for large components
- **Tree Shaking**: Removes unused code

### 5. Network Optimization
- **Multipart Uploads**: For files larger than 5MB
- **Parallel Requests**: Batch operations where possible
- **Unicode Normalization**: Handles special characters
- **File Size Validation**: 100MB limit per file

## Security Considerations

### 1. Environment Variables
All sensitive configuration stored in `.env.local`:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### 2. Input Validation & Sanitization
- **Unicode Normalization**: NFD normalization for filenames
- **Path Traversal Prevention**: Validates against ../ patterns
- **File Size Limits**: 100MB max per file
- **Content Type Validation**: Checks file MIME types
- **Special Character Handling**: Sanitizes filenames

### 3. Error Information
- **No Sensitive Data**: Error messages exclude credentials
- **Server-side Logging**: Detailed logs kept server-side
- **User-friendly Messages**: Generic errors for clients
- **Request Tracking**: Error correlation for debugging

### 4. Security Headers & Policies
- **CORS Configuration**: Restricted to application origin
- **Content Security Policy**: Prevents XSS attacks
- **File Upload Validation**: Server-side verification
- **API Rate Limiting**: Prevents abuse

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

### 1. Build Configuration
- **Standalone Output**: Self-contained Next.js builds
- **Turbopack**: Development optimization
- **Docker Support**: Multi-stage Dockerfile
- **Environment Variables**: Secure credential management

### 2. Production Deployment
```bash
# Docker deployment
docker compose up -d

# Traditional deployment
npm run build
npm start
```

### 3. Monitoring & Observability
- **Error Boundaries**: Graceful error handling
- **Performance Tracking**: Core Web Vitals
- **API Monitoring**: Response time tracking
- **Usage Analytics**: User behavior insights

### 4. Scaling Strategy
- **Stateless Design**: Easy horizontal scaling
- **CDN Integration**: Static asset caching
- **Service Worker**: Client-side resilience
- **Cache Headers**: Optimized caching policies

## Theme System Architecture

### OKLCH Color Space
The application uses the OKLCH (Oklab Lightness Chroma Hue) color space for perceptually uniform colors:

```css
--primary: oklch(70% 0.25 25);  /* L C H values */
```

**Benefits:**
- **Perceptual Uniformity**: Colors appear consistent across different hues
- **Better Gradients**: Smooth color transitions
- **Accessibility**: Easier to maintain contrast ratios
- **Modern Standard**: Future-proof color system

### Theme Structure
Each theme defines a complete color palette:

```typescript
interface Theme {
  id: string
  name: string
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    // ... more color tokens
  }
}
```

### Runtime Theme Switching
Themes are applied via CSS custom properties:

```typescript
function applyTheme(theme: Theme) {
  const root = document.documentElement
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}
```