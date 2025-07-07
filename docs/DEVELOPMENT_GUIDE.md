# Development Guide

## Overview

This guide provides comprehensive information for developers working on the Cloudflare R2 File Manager project, including setup, development workflows, coding standards, and contribution guidelines.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Testing Strategy](#testing-strategy)
7. [Performance Guidelines](#performance-guidelines)
8. [Debugging Tips](#debugging-tips)
9. [Deployment Process](#deployment-process)
10. [Contributing Guidelines](#contributing-guidelines)

## Prerequisites

### Required Software

- **Node.js**: Version 18.17 or higher
- **npm**: Version 9.0 or higher
- **Git**: Version 2.30 or higher
- **Code Editor**: VS Code recommended with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

### Development Environment

- **Operating System**: macOS, Linux, or Windows with WSL2
- **Browser**: Chrome/Edge (latest) for development
- **Terminal**: Modern terminal with color support

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd s3ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env.local` file:

```bash
# Cloudflare R2 Configuration
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

### 4. Verify Setup

```bash
# Check if environment is configured correctly
npm run build

# Start development server
npm run dev
```

Visit `http://localhost:4713` to verify the application is running.

## Development Workflow

### Daily Development Process

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Make Changes**
   - Write code following coding standards
   - Test changes locally
   - Run linting and type checking

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start development server (port 4713)

# Building
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript type checking

# Utilities
npm run clean       # Clean build artifacts
```

## Project Structure

```
s3ui/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── r2/           # R2 storage endpoints
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── r2/               # R2-specific components
│   ├── ui/               # Reusable UI components
│   └── magicui/          # Magic UI components
├── lib/                  # Shared utilities
│   ├── r2/               # R2 operations
│   ├── service-worker/   # Upload management
│   └── utils.ts          # General utilities
├── public/               # Static assets
├── docs/                 # Documentation
├── .env.local           # Environment variables
├── .eslintrc.json       # ESLint configuration
├── .gitignore           # Git ignore rules
├── CLAUDE.md            # Claude Code instructions
├── components.json      # Shadcn UI configuration
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies and scripts
├── tailwind.config.ts   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

### Component Organization

```
components/
├── r2/                   # Domain-specific components
│   ├── file-browser.tsx  # Main file browser
│   ├── global-search.tsx # Global search modal
│   ├── r2-file-tree.tsx  # Folder tree sidebar
│   ├── upload-dialog.tsx # File upload modal
│   └── ...               # Other R2 components
├── ui/                   # Reusable UI components
│   ├── button.tsx        # Button component
│   ├── dialog.tsx        # Modal dialog
│   ├── input.tsx         # Form input
│   └── ...               # Other UI components
└── magicui/              # Third-party UI components
    └── file-tree.tsx     # File tree component
```

## Coding Standards

### TypeScript Guidelines

1. **Strict Type Checking**
   ```typescript
   // ✅ Good: Explicit types
   interface UserData {
     id: string;
     name: string;
     email: string;
   }
   
   // ❌ Bad: Any types
   const userData: any = fetchUser();
   ```

2. **Interface Documentation**
   ```typescript
   /**
    * Represents a file or folder in R2 storage.
    * 
    * @public
    */
   interface R2Object {
     /** The full path/key of the object in R2 storage */
     key: string;
     /** Size of the object in bytes (0 for folders) */
     size: number;
   }
   ```

3. **Function Documentation**
   ```typescript
   /**
    * Lists objects in R2 storage with optional prefix filtering.
    * 
    * @param prefix - The prefix to filter objects by
    * @returns Promise that resolves to an array of R2Objects
    * 
    * @example
    * ```typescript
    * const files = await listObjects('documents/');
    * ```
    */
   export async function listObjects(prefix?: string): Promise<R2Object[]>
   ```

### React Component Guidelines

1. **Component Structure**
   ```typescript
   interface ComponentProps {
     /** Component prop description */
     prop: string;
   }
   
   /**
    * Component description with purpose and usage.
    * 
    * @param props - Component props
    * @returns JSX element
    */
   export function Component({ prop }: ComponentProps) {
     // State declarations
     const [state, setState] = useState<Type>(initialValue);
     
     // Effect hooks
     useEffect(() => {
       // Effect logic
     }, [dependencies]);
     
     // Event handlers
     const handleEvent = useCallback(() => {
       // Handler logic
     }, [dependencies]);
     
     // Render
     return (
       <div>
         {/* Component JSX */}
       </div>
     );
   }
   ```

2. **Hooks Usage**
   ```typescript
   // ✅ Good: Proper dependency arrays
   const memoizedValue = useMemo(() => {
     return expensiveCalculation(data);
   }, [data]);
   
   const stableCallback = useCallback((id: string) => {
     onSelect(id);
   }, [onSelect]);
   
   // ❌ Bad: Missing dependencies
   useEffect(() => {
     fetchData();
   }, []); // Should include dependencies
   ```

### Error Handling Standards

1. **API Error Handling**
   ```typescript
   async function apiCall<T>(endpoint: string): Promise<T | null> {
     try {
       const response = await fetch(endpoint);
       const data = await response.json();
       
       if (!data.success) {
         throw new Error(data.error || 'Operation failed');
       }
       
       return data.data;
     } catch (error) {
       console.error(`API call failed: ${endpoint}`, error);
       toast.error(error instanceof Error ? error.message : 'Unknown error');
       return null;
     }
   }
   ```

2. **Component Error Boundaries**
   ```typescript
   export function ErrorBoundary({ children }: { children: React.ReactNode }) {
     return (
       <ErrorBoundaryComponent
         fallback={<ErrorFallback />}
         onError={(error, errorInfo) => {
           console.error('Component error:', error, errorInfo);
         }}
       >
         {children}
       </ErrorBoundaryComponent>
     );
   }
   ```

### CSS and Styling Guidelines

1. **Tailwind Usage**
   ```typescript
   // ✅ Good: Semantic class combinations
   <div className="flex items-center space-x-2 p-4 bg-gray-900 border border-gray-800 rounded-lg">
   
   // ✅ Good: Conditional classes
   <button className={`px-4 py-2 rounded ${
     isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
   }`}>
   
   // ❌ Bad: Inline styles for complex styling
   <div style={{ backgroundColor: '#1a1a1a', padding: '16px' }}>
   ```

2. **Responsive Design**
   ```typescript
   // ✅ Good: Mobile-first responsive design
   <div className="w-full md:w-1/2 lg:w-1/3 p-2 md:p-4">
   ```

## Testing Strategy

### Unit Testing

```typescript
// utils.test.ts
import { formatFileSize } from './utils';

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
```

### Integration Testing

```typescript
// api.test.ts
import { listObjects } from './r2/operations';

describe('R2 Operations', () => {
  it('should list objects successfully', async () => {
    const objects = await listObjects();
    expect(Array.isArray(objects)).toBe(true);
  });
});
```

### Component Testing

```typescript
// component.test.tsx
import { render, screen } from '@testing-library/react';
import { FileBrowser } from './file-browser';

describe('FileBrowser', () => {
  it('should render file browser interface', () => {
    render(<FileBrowser />);
    expect(screen.getByText('Folders')).toBeInTheDocument();
  });
});
```

## Performance Guidelines

### React Performance

1. **Avoid Unnecessary Re-renders**
   ```typescript
   // ✅ Good: Memoized component
   const ExpensiveComponent = React.memo(({ data }: Props) => {
     return <div>{/* Complex rendering */}</div>;
   });
   
   // ✅ Good: Stable callbacks
   const handleClick = useCallback((id: string) => {
     onClick(id);
   }, [onClick]);
   ```

2. **Lazy Loading**
   ```typescript
   // ✅ Good: Code splitting
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   
   function App() {
     return (
       <Suspense fallback={<Loading />}>
         <HeavyComponent />
       </Suspense>
     );
   }
   ```

### API Performance

1. **Request Optimization**
   ```typescript
   // ✅ Good: Debounced search
   const debouncedSearch = useMemo(
     () => debounce((query: string) => {
       searchFiles(query);
     }, 300),
     []
   );
   ```

2. **Caching Strategy**
   ```typescript
   // ✅ Good: Cache folder tree data
   const [folderCache, setFolderCache] = useState<Map<string, FolderTreeNode[]>>(new Map());
   
   const loadFolderTree = useCallback(async (prefix: string) => {
     if (folderCache.has(prefix)) {
       return folderCache.get(prefix);
     }
     
     const tree = await getFolderTree(prefix);
     setFolderCache(prev => new Map(prev).set(prefix, tree));
     return tree;
   }, [folderCache]);
   ```

## Debugging Tips

### Browser DevTools

1. **Network Tab**: Monitor API requests and responses
2. **Console**: Check for errors and warnings
3. **React DevTools**: Inspect component state and props
4. **Performance Tab**: Profile React renders

### Common Issues

1. **State Updates**
   ```typescript
   // ❌ Problem: State not updating
   const [items, setItems] = useState([]);
   items.push(newItem); // Mutating state directly
   
   // ✅ Solution: Immutable updates
   setItems(prev => [...prev, newItem]);
   ```

2. **Memory Leaks**
   ```typescript
   // ✅ Good: Cleanup effects
   useEffect(() => {
     const timer = setInterval(updateData, 1000);
     
     return () => {
       clearInterval(timer);
     };
   }, []);
   ```

### Logging Standards

```typescript
// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Error logging
console.error('Operation failed:', {
  operation: 'uploadFile',
  error: error.message,
  timestamp: new Date().toISOString()
});
```

## Deployment Process

### Build Process

```bash
# 1. Install dependencies
npm install

# 2. Run type checking
npm run type-check

# 3. Run linting
npm run lint

# 4. Build application
npm run build

# 5. Test production build
npm start
```

### Environment Variables

Production environment requires:
```bash
R2_ENDPOINT=production_endpoint
R2_ACCESS_KEY_ID=production_key
R2_SECRET_ACCESS_KEY=production_secret
R2_BUCKET_NAME=production_bucket
```

### Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Environment variables configured
- [ ] Build succeeds without warnings
- [ ] Manual testing of critical paths

## Contributing Guidelines

### Pull Request Process

1. **Branch Naming**
   ```
   feat/feature-name      # New features
   fix/bug-description    # Bug fixes
   docs/update-readme     # Documentation
   refactor/component     # Code refactoring
   ```

2. **Commit Messages**
   ```
   feat: add global search functionality
   fix: resolve folder navigation issue
   docs: update API documentation
   refactor: improve error handling
   ```

3. **PR Description Template**
   ```markdown
   ## Summary
   Brief description of changes
   
   ## Changes
   - List of specific changes
   - Made in this PR
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Manual testing completed
   - [ ] No regressions identified
   
   ## Screenshots (if applicable)
   Add screenshots for UI changes
   ```

### Code Review Guidelines

**For Authors:**
- Ensure PR is focused and atomic
- Include comprehensive description
- Test all changes thoroughly
- Update documentation if needed

**For Reviewers:**
- Check code quality and standards
- Verify test coverage
- Test functionality manually
- Provide constructive feedback

### Documentation Requirements

- Update TSDoc comments for new/changed APIs
- Add examples for complex functionality
- Update README if user-facing changes
- Include migration guides for breaking changes

## Troubleshooting

### Common Development Issues

1. **Module Resolution Errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **TypeScript Errors**
   ```bash
   # Restart TypeScript server in VS Code
   Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
   ```

3. **Environment Variable Issues**
   ```bash
   # Verify .env.local exists and has correct values
   cat .env.local
   ```

### Performance Issues

1. **Slow Builds**
   - Use Turbopack: `npm run dev` (enabled by default)
   - Clear node_modules and reinstall

2. **Runtime Performance**
   - Use React DevTools Profiler
   - Check for memory leaks in DevTools
   - Monitor network requests

### Getting Help

1. **Documentation**: Check docs/ folder first
2. **Code Examples**: Look at existing similar components
3. **Console Logs**: Enable detailed logging in development
4. **Error Messages**: Read error messages carefully
5. **Stack Overflow**: Search for specific error messages