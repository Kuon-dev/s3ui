# CLAUDE.md

This file provides guidance to Claude Code when working with this Cloudflare R2 file manager.

## Project Overview

Next.js 15 application for managing files and folders in Cloudflare R2 storage. Local-only desktop application with dark theme.

Documentation is located in the `/docs` folder.

## Environment Setup

Required environment variables in `.env.local`:
- `R2_ENDPOINT` - Cloudflare R2 endpoint URL
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key  
- `R2_BUCKET_NAME` - Target bucket name

## Development Commands

```bash
npm run dev    # Start development server (port 4713)
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run linting
```

## Key Architecture

**Main Components:**
- `app/page.tsx` → `components/r2/file-browser.tsx` (main interface)
- `lib/stores/` - Modular state management (6 specialized stores)
  - `file-system-store.ts` - R2 objects and folder tree
  - `navigation-store.ts` - Path navigation and folder expansion
  - `selection-store.ts` - Multi-select operations
  - `drag-drop-store.ts` - Drag and drop state
  - `ui-state-store.ts` - UI preferences, dialogs, search
  - `clipboard-store.ts` - Copy/paste operations
- `lib/services/r2-service.ts` - Centralized R2 API service layer
- `lib/r2/client.ts` - R2 client configuration
- `lib/r2/operations.ts` - Core R2 operations
- `app/api/r2/` - API routes for R2 operations
- `public/upload-sw.js` - Service worker for file uploads

**Drag & Drop System:**
- HTML5 Drag and Drop API with visual feedback
- `components/r2/drag-preview.tsx` - Animated drag previews
- `components/r2/drop-zone.tsx` - Enhanced drop indicators
- Auto-scrolling and multi-selection support

**UI Framework:** Shadcn UI with Tailwind CSS (OKLCH theme system)

## Important Conventions

**Folder Paths:**
- R2 folder keys must end with `/` for proper prefix matching
- Remove trailing slashes for display purposes

**File Operations:**
- Rename = copy then delete (R2 limitation)
- Folder deletion recursively removes all contents
- Service worker handles background uploads with progress tracking