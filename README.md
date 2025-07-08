# S3UI - Cloudflare R2 File Manager

A modern, desktop-focused file manager for Cloudflare R2 storage built with Next.js 15. Features a complete CRUD interface for managing files and folders with drag-and-drop uploads, background processing, and a clean dark theme UI.

## Features

- **Complete File Management**: Create, read, update, and delete files and folders
- **Drag & Drop Upload**: Intuitive file uploads with progress tracking
- **Background Processing**: Service worker-powered uploads for large files
- **Folder Navigation**: Browse and organize files in a familiar folder structure
- **File Preview**: Preview images and supported file types
- **Dark Theme**: Beautiful dark UI using Shadcn components
- **Desktop Optimized**: Designed for desktop use with keyboard shortcuts

## Screenshots

![File Browser](docs/screenshot-browser.png)
*Main file browser interface*

![Upload Progress](docs/screenshot-upload.png)
*Background upload with progress tracking*

## Environment Setup

Create a `.env.local` file with your Cloudflare R2 credentials:

```env
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/s3ui.git
cd s3ui

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your R2 credentials

# Start development server
npm run dev
```

## Development

### Local Development

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

### Docker Development

```bash
# Build and run with Docker Compose (production)
docker-compose up --build

# Run development environment with hot reload
docker-compose --profile dev up --build

# Build Docker image manually
docker build -t s3ui .

# Run Docker container
docker run -p 4713:3000 --env-file .env.local s3ui
```

## Architecture

### Core Components

- **File Browser** (`components/r2/file-browser.tsx`) - Main interface for file management
- **Upload System** (`public/upload-sw.js`) - Service worker for background uploads
- **R2 Client** (`lib/r2/client.ts`) - AWS SDK S3Client configured for R2
- **API Routes** (`app/api/r2/`) - Next.js API endpoints for all R2 operations

### Key Features

**Service Worker Upload System**
- Background file uploads with progress tracking
- Multipart upload support for large files
- Queue management for multiple uploads
- Resilient error handling and retry logic

**Folder Management**
- Proper R2 prefix handling for folder navigation
- Recursive folder deletion
- Folder creation and renaming
- Breadcrumb navigation

**File Operations**
- File upload, download, and deletion
- File renaming (copy + delete pattern)
- File preview for images and supported formats
- Drag-and-drop interface

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with Shadcn UI components
- **Storage**: Cloudflare R2 via AWS SDK
- **Icons**: Lucide React
- **Notifications**: Sonner for toast messages
- **Upload Processing**: Service Worker API
- **State Management**: React hooks with local state

## API Routes

All R2 operations are handled through Next.js API routes:

- `GET /api/r2/list` - List files and folders
- `POST /api/r2/upload` - Upload files
- `POST /api/r2/folder` - Create folders
- `PUT /api/r2/rename` - Rename files/folders
- `DELETE /api/r2/delete` - Delete files/folders
- `GET /api/r2/download` - Download files
- `GET /api/r2/preview` - Preview files

## Configuration

The application uses environment variables for R2 configuration and runs on port 4713 by default. All configuration is local-only with no authentication required.

### Docker Configuration

The Docker setup includes:
- **Production Dockerfile**: Multi-stage build with optimized Node.js Alpine image
- **Development Dockerfile**: Hot reload support for development
- **Docker Compose**: Production and development profiles
- **Health Checks**: Built-in health monitoring
- **Environment**: R2 credentials via .env.local file

Docker services:
- `s3ui`: Production build (port 4713:3000)
- `s3ui-dev`: Development with hot reload (port 4713:4713)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.