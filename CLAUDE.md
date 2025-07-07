# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare R2 file manager built with Next.js 15, featuring a complete CRUD interface for managing files and folders in R2 storage. The application is local-only and designed for desktop use with no responsive design or authentication requirements.

## Environment Setup

The application requires four environment variables in `.env.local`:
- `R2_ENDPOINT` - Your Cloudflare R2 endpoint URL
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key  
- `R2_BUCKET_NAME` - Target bucket name

## Development Commands

```bash
# Start development server (runs on port 4713 with turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture Overview

### Core Components Structure

**Main Application Flow:**
- `app/page.tsx` → `components/r2/file-browser.tsx` (main interface)
- Error handling via `components/error-boundary.tsx`
- Dark mode forced in `app/layout.tsx`

**R2 Integration Layer:**
- `lib/r2/client.ts` - AWS SDK S3Client configuration for R2
- `lib/r2/operations.ts` - Core R2 operations (list, create, delete, rename)
- `app/api/r2/` - Next.js API routes for all R2 operations

**Service Worker Architecture:**
- `public/upload-sw.js` - Service worker for file upload management
- `lib/service-worker/upload-manager.ts` - TypeScript interface for SW communication
- Enables background uploads with progress tracking

### Key Technical Patterns

**Path Handling for Folders:**
- Folders in R2 end with `/` for proper prefix matching
- Display paths remove trailing slashes for clean UI
- API calls ensure correct slash handling for folder navigation

**Component Architecture:**
- Modular dialog components for each operation (upload, create, rename, delete)
- Shadcn UI components with custom dark theme styling
- File browser uses table layout with dropdown menus for actions

**State Management:**
- React hooks for local state
- Service worker for upload queue management
- Toast notifications via Sonner for user feedback

## UI Framework

Built with Shadcn UI ("new-york" style) and Tailwind CSS. All components use dark theme styling. The component library includes:
- Button, Dialog, Dropdown Menu, Input, Table
- Custom toast integration with Sonner
- Lucide React icons

## File Upload System

Uses a service worker pattern for robust file uploads:
- Files queued in service worker for background processing
- Progress tracking via MessageChannel API
- Drag-and-drop support in main file browser
- Multipart upload support for large files

## API Route Patterns

All R2 operations follow consistent patterns:
- Error handling with appropriate HTTP status codes
- Input validation and sanitization
- Proper R2 key formatting (especially for folders)
- JSON responses with error messages

## Important Conventions

**Folder Navigation:**
- Always ensure folder paths have trailing slashes for R2 API calls
- Remove trailing slashes for display purposes
- Use prefix-based listing with delimiter for proper folder browsing

**File Operations:**
- Rename operations copy then delete (R2 doesn't have native rename)
- Folder deletion recursively removes all contents
- Download uses blob URLs for client-side file handling

**Error Boundaries:**
- Wrap main components in error boundaries
- Development mode shows detailed error information
- Production mode shows user-friendly error messages