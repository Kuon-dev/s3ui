/**
 * File type detection and categorization utilities.
 * Provides file type detection, MIME type mapping, and icon selection logic.
 * 
 * @fileoverview File type utilities for the R2 file manager
 */

import {
  File,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Code,
  Database,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Settings,
  Book,
  Hash,
  Terminal,
  Palette,
  Camera,
  Film,
  Headphones,
} from 'lucide-react';

/**
 * Supported file categories for categorization and icon selection.
 * 
 * @public
 */
export enum FileCategory {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code',
  ARCHIVE = 'archive',
  SPREADSHEET = 'spreadsheet',
  DATABASE = 'database',
  CONFIG = 'config',
  FONT = 'font',
  EXECUTABLE = 'executable',
  FOLDER = 'folder',
  UNKNOWN = 'unknown',
}

/**
 * File type information including category, MIME type, and display properties.
 * 
 * @public
 */
export interface FileTypeInfo {
  /** File category for grouping similar file types */
  category: FileCategory;
  /** MIME type for the file */
  mimeType: string;
  /** Human-readable description */
  description: string;
  /** Whether this file type supports preview */
  previewable: boolean;
  /** Icon color class name */
  iconColor: string;
}

/**
 * Comprehensive file extension to type information mapping.
 * Covers 50+ common file types with detailed metadata.
 */
const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  // Images
  'jpg': {
    category: FileCategory.IMAGE,
    mimeType: 'image/jpeg',
    description: 'JPEG Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'jpeg': {
    category: FileCategory.IMAGE,
    mimeType: 'image/jpeg',
    description: 'JPEG Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'png': {
    category: FileCategory.IMAGE,
    mimeType: 'image/png',
    description: 'PNG Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'gif': {
    category: FileCategory.IMAGE,
    mimeType: 'image/gif',
    description: 'GIF Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'webp': {
    category: FileCategory.IMAGE,
    mimeType: 'image/webp',
    description: 'WebP Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'svg': {
    category: FileCategory.IMAGE,
    mimeType: 'image/svg+xml',
    description: 'SVG Vector Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'bmp': {
    category: FileCategory.IMAGE,
    mimeType: 'image/bmp',
    description: 'Bitmap Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'tiff': {
    category: FileCategory.IMAGE,
    mimeType: 'image/tiff',
    description: 'TIFF Image',
    previewable: true,
    iconColor: 'text-green-500',
  },
  'ico': {
    category: FileCategory.IMAGE,
    mimeType: 'image/x-icon',
    description: 'Icon File',
    previewable: true,
    iconColor: 'text-green-500',
  },

  // Audio
  'mp3': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/mpeg',
    description: 'MP3 Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },
  'wav': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/wav',
    description: 'WAV Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },
  'flac': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/flac',
    description: 'FLAC Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },
  'aac': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/aac',
    description: 'AAC Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },
  'ogg': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/ogg',
    description: 'OGG Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },
  'm4a': {
    category: FileCategory.AUDIO,
    mimeType: 'audio/mp4',
    description: 'M4A Audio',
    previewable: true,
    iconColor: 'text-purple-500',
  },

  // Video
  'mp4': {
    category: FileCategory.VIDEO,
    mimeType: 'video/mp4',
    description: 'MP4 Video',
    previewable: true,
    iconColor: 'text-red-500',
  },
  'avi': {
    category: FileCategory.VIDEO,
    mimeType: 'video/x-msvideo',
    description: 'AVI Video',
    previewable: true,
    iconColor: 'text-red-500',
  },
  'mov': {
    category: FileCategory.VIDEO,
    mimeType: 'video/quicktime',
    description: 'QuickTime Video',
    previewable: true,
    iconColor: 'text-red-500',
  },
  'mkv': {
    category: FileCategory.VIDEO,
    mimeType: 'video/x-matroska',
    description: 'Matroska Video',
    previewable: true,
    iconColor: 'text-red-500',
  },
  'webm': {
    category: FileCategory.VIDEO,
    mimeType: 'video/webm',
    description: 'WebM Video',
    previewable: true,
    iconColor: 'text-red-500',
  },
  'wmv': {
    category: FileCategory.VIDEO,
    mimeType: 'video/x-ms-wmv',
    description: 'WMV Video',
    previewable: true,
    iconColor: 'text-red-500',
  },

  // Documents
  'pdf': {
    category: FileCategory.DOCUMENT,
    mimeType: 'application/pdf',
    description: 'PDF Document',
    previewable: true,
    iconColor: 'text-red-600',
  },
  'doc': {
    category: FileCategory.DOCUMENT,
    mimeType: 'application/msword',
    description: 'Word Document',
    previewable: false,
    iconColor: 'text-blue-600',
  },
  'docx': {
    category: FileCategory.DOCUMENT,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Word Document',
    previewable: false,
    iconColor: 'text-blue-600',
  },
  'txt': {
    category: FileCategory.DOCUMENT,
    mimeType: 'text/plain',
    description: 'Text File',
    previewable: true,
    iconColor: 'text-gray-400',
  },
  'md': {
    category: FileCategory.DOCUMENT,
    mimeType: 'text/markdown',
    description: 'Markdown File',
    previewable: true,
    iconColor: 'text-gray-400',
  },
  'rtf': {
    category: FileCategory.DOCUMENT,
    mimeType: 'application/rtf',
    description: 'Rich Text Format',
    previewable: false,
    iconColor: 'text-blue-600',
  },

  // Spreadsheets
  'xls': {
    category: FileCategory.SPREADSHEET,
    mimeType: 'application/vnd.ms-excel',
    description: 'Excel Spreadsheet',
    previewable: false,
    iconColor: 'text-green-600',
  },
  'xlsx': {
    category: FileCategory.SPREADSHEET,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Excel Spreadsheet',
    previewable: false,
    iconColor: 'text-green-600',
  },
  'csv': {
    category: FileCategory.SPREADSHEET,
    mimeType: 'text/csv',
    description: 'CSV File',
    previewable: true,
    iconColor: 'text-green-600',
  },

  // Code files
  'js': {
    category: FileCategory.CODE,
    mimeType: 'text/javascript',
    description: 'JavaScript File',
    previewable: true,
    iconColor: 'text-yellow-500',
  },
  'ts': {
    category: FileCategory.CODE,
    mimeType: 'text/typescript',
    description: 'TypeScript File',
    previewable: true,
    iconColor: 'text-blue-500',
  },
  'jsx': {
    category: FileCategory.CODE,
    mimeType: 'text/jsx',
    description: 'React JSX File',
    previewable: true,
    iconColor: 'text-cyan-500',
  },
  'tsx': {
    category: FileCategory.CODE,
    mimeType: 'text/tsx',
    description: 'React TSX File',
    previewable: true,
    iconColor: 'text-cyan-500',
  },
  'html': {
    category: FileCategory.CODE,
    mimeType: 'text/html',
    description: 'HTML File',
    previewable: true,
    iconColor: 'text-orange-500',
  },
  'css': {
    category: FileCategory.CODE,
    mimeType: 'text/css',
    description: 'CSS File',
    previewable: true,
    iconColor: 'text-blue-400',
  },
  'scss': {
    category: FileCategory.CODE,
    mimeType: 'text/scss',
    description: 'Sass File',
    previewable: true,
    iconColor: 'text-pink-500',
  },
  'py': {
    category: FileCategory.CODE,
    mimeType: 'text/x-python',
    description: 'Python File',
    previewable: true,
    iconColor: 'text-green-400',
  },
  'java': {
    category: FileCategory.CODE,
    mimeType: 'text/x-java-source',
    description: 'Java File',
    previewable: true,
    iconColor: 'text-red-400',
  },
  'php': {
    category: FileCategory.CODE,
    mimeType: 'application/x-php',
    description: 'PHP File',
    previewable: true,
    iconColor: 'text-purple-400',
  },
  'sql': {
    category: FileCategory.CODE,
    mimeType: 'application/sql',
    description: 'SQL File',
    previewable: true,
    iconColor: 'text-orange-400',
  },

  // Archives
  'zip': {
    category: FileCategory.ARCHIVE,
    mimeType: 'application/zip',
    description: 'ZIP Archive',
    previewable: false,
    iconColor: 'text-yellow-600',
  },
  'rar': {
    category: FileCategory.ARCHIVE,
    mimeType: 'application/vnd.rar',
    description: 'RAR Archive',
    previewable: false,
    iconColor: 'text-yellow-600',
  },
  '7z': {
    category: FileCategory.ARCHIVE,
    mimeType: 'application/x-7z-compressed',
    description: '7-Zip Archive',
    previewable: false,
    iconColor: 'text-yellow-600',
  },
  'tar': {
    category: FileCategory.ARCHIVE,
    mimeType: 'application/x-tar',
    description: 'TAR Archive',
    previewable: false,
    iconColor: 'text-yellow-600',
  },
  'gz': {
    category: FileCategory.ARCHIVE,
    mimeType: 'application/gzip',
    description: 'Gzip Archive',
    previewable: false,
    iconColor: 'text-yellow-600',
  },

  // Config files
  'json': {
    category: FileCategory.CONFIG,
    mimeType: 'application/json',
    description: 'JSON File',
    previewable: true,
    iconColor: 'text-yellow-400',
  },
  'xml': {
    category: FileCategory.CONFIG,
    mimeType: 'application/xml',
    description: 'XML File',
    previewable: true,
    iconColor: 'text-orange-400',
  },
  'yml': {
    category: FileCategory.CONFIG,
    mimeType: 'application/x-yaml',
    description: 'YAML File',
    previewable: true,
    iconColor: 'text-purple-400',
  },
  'yaml': {
    category: FileCategory.CONFIG,
    mimeType: 'application/x-yaml',
    description: 'YAML File',
    previewable: true,
    iconColor: 'text-purple-400',
  },
  'toml': {
    category: FileCategory.CONFIG,
    mimeType: 'application/toml',
    description: 'TOML File',
    previewable: true,
    iconColor: 'text-purple-400',
  },
  'ini': {
    category: FileCategory.CONFIG,
    mimeType: 'text/plain',
    description: 'INI Config File',
    previewable: true,
    iconColor: 'text-gray-400',
  },

  // Database
  'db': {
    category: FileCategory.DATABASE,
    mimeType: 'application/x-sqlite3',
    description: 'Database File',
    previewable: false,
    iconColor: 'text-gray-600',
  },
  'sqlite': {
    category: FileCategory.DATABASE,
    mimeType: 'application/x-sqlite3',
    description: 'SQLite Database',
    previewable: false,
    iconColor: 'text-gray-600',
  },
  'sqlite3': {
    category: FileCategory.DATABASE,
    mimeType: 'application/x-sqlite3',
    description: 'SQLite Database',
    previewable: false,
    iconColor: 'text-gray-600',
  },

  // Font files
  'ttf': {
    category: FileCategory.FONT,
    mimeType: 'font/ttf',
    description: 'TrueType Font',
    previewable: false,
    iconColor: 'text-indigo-500',
  },
  'otf': {
    category: FileCategory.FONT,
    mimeType: 'font/otf',
    description: 'OpenType Font',
    previewable: false,
    iconColor: 'text-indigo-500',
  },
  'woff': {
    category: FileCategory.FONT,
    mimeType: 'font/woff',
    description: 'Web Font',
    previewable: false,
    iconColor: 'text-indigo-500',
  },
  'woff2': {
    category: FileCategory.FONT,
    mimeType: 'font/woff2',
    description: 'Web Font 2',
    previewable: false,
    iconColor: 'text-indigo-500',
  },
};

/**
 * Gets file type information from a file path or filename.
 * 
 * @param filename - File name or path to analyze
 * @returns File type information object
 * 
 * @example
 * ```typescript
 * const info = getFileType('document.pdf');
 * console.log(info.category); // FileCategory.DOCUMENT
 * console.log(info.previewable); // true
 * ```
 * 
 * @public
 */
export function getFileType(filename: string): FileTypeInfo {
  const extension = getFileExtension(filename);
  
  return FILE_TYPE_MAP[extension] || {
    category: FileCategory.UNKNOWN,
    mimeType: 'application/octet-stream',
    description: 'Unknown File',
    previewable: false,
    iconColor: 'text-gray-400',
  };
}

/**
 * Extracts the file extension from a filename or path.
 * 
 * @param filename - File name or path
 * @returns Lowercase file extension without the dot
 * 
 * @example
 * ```typescript
 * getFileExtension('image.JPG'); // 'jpg'
 * getFileExtension('path/to/file.txt'); // 'txt'
 * ```
 * 
 * @public
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()!.toLowerCase();
}

/**
 * Gets the appropriate Lucide icon component for a file type.
 * 
 * @param filename - File name or path
 * @param isFolder - Whether this is a folder
 * @param isOpen - Whether folder is open (for folders only)
 * @returns React component for the icon
 * 
 * @example
 * ```typescript
 * const IconComponent = getFileIcon('image.jpg');
 * return <IconComponent className="h-4 w-4" />;
 * ```
 * 
 * @public
 */
export function getFileIcon(filename: string, isFolder: boolean = false, isOpen: boolean = false) {
  if (isFolder) {
    return isOpen ? FolderOpen : Folder;
  }

  const fileType = getFileType(filename);
  
  switch (fileType.category) {
    case FileCategory.IMAGE:
      // Use specific icons for certain image types
      const ext = getFileExtension(filename);
      if (['ico', 'png', 'gif'].includes(ext)) {
        return Camera;
      }
      return Image;

    case FileCategory.AUDIO:
      const audioExt = getFileExtension(filename);
      if (['mp3', 'flac', 'wav'].includes(audioExt)) {
        return Music;
      }
      return Headphones;

    case FileCategory.VIDEO:
      const videoExt = getFileExtension(filename);
      if (['mp4', 'mov', 'avi'].includes(videoExt)) {
        return Video;
      }
      return Film;

    case FileCategory.DOCUMENT:
      const docExt = getFileExtension(filename);
      if (docExt === 'pdf') {
        return Book;
      }
      return FileText;

    case FileCategory.SPREADSHEET:
      return FileSpreadsheet;

    case FileCategory.CODE:
      const codeExt = getFileExtension(filename);
      if (['sh', 'bash', 'zsh', 'fish'].includes(codeExt)) {
        return Terminal;
      }
      return Code;

    case FileCategory.ARCHIVE:
      return Archive;

    case FileCategory.CONFIG:
      const configExt = getFileExtension(filename);
      if (configExt === 'json') {
        return Hash;
      }
      return Settings;

    case FileCategory.DATABASE:
      return Database;

    case FileCategory.FONT:
      return Palette;

    default:
      return File;
  }
}

/**
 * Checks if a file type supports preview functionality.
 * 
 * @param filename - File name or path
 * @returns Whether the file type supports preview
 * 
 * @example
 * ```typescript
 * isPreviewable('image.jpg'); // true
 * isPreviewable('document.zip'); // false
 * ```
 * 
 * @public
 */
export function isPreviewable(filename: string): boolean {
  return getFileType(filename).previewable;
}

/**
 * Gets all supported file extensions for a specific category.
 * 
 * @param category - File category to filter by
 * @returns Array of file extensions
 * 
 * @example
 * ```typescript
 * getExtensionsByCategory(FileCategory.IMAGE);
 * // ['jpg', 'jpeg', 'png', 'gif', ...]
 * ```
 * 
 * @public
 */
export function getExtensionsByCategory(category: FileCategory): string[] {
  return Object.entries(FILE_TYPE_MAP)
    .filter(([, info]) => info.category === category)
    .map(([ext]) => ext);
}

/**
 * Gets file type statistics for an array of filenames.
 * 
 * @param filenames - Array of file names
 * @returns Object with counts per file category
 * 
 * @example
 * ```typescript
 * const stats = getFileTypeStats(['image.jpg', 'doc.pdf', 'music.mp3']);
 * // { image: 1, document: 1, audio: 1, total: 3 }
 * ```
 * 
 * @public
 */
export function getFileTypeStats(filenames: string[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  filenames.forEach(filename => {
    const category = getFileType(filename).category;
    stats[category] = (stats[category] || 0) + 1;
  });
  
  stats.total = filenames.length;
  return stats;
}