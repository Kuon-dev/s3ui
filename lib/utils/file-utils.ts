export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_FILES_PER_UPLOAD = 50;
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  // Audio/Video
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  // Code files
  'application/javascript',
  'application/typescript',
  // Others
  'application/octet-stream',
];

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];

  // Check if file exists and has valid properties
  if (!file || !(file instanceof File)) {
    errors.push('Invalid file object.');
    return { isValid: false, errors };
  }

  // Check if file has a name
  if (!file.name || typeof file.name !== 'string') {
    errors.push('File must have a valid name.');
    return { isValid: false, errors };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push(`File "${file.name}" is empty.`);
  }

  // Validate filename
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    errors.push(`File "${file.name}" contains invalid characters.`);
  }

  // Check filename length
  if (file.name.length > 255) {
    errors.push(`File "${file.name}" name is too long (maximum 255 characters).`);
  }

  // Check for hidden files (starting with .)
  if (file.name.startsWith('.')) {
    errors.push(`Hidden files like "${file.name}" are not allowed.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFiles(files: File[]): FileValidationResult {
  const errors: string[] = [];

  // Check if files array is valid
  if (!files || !Array.isArray(files)) {
    errors.push('Invalid files array.');
    return { isValid: false, errors };
  }

  // Check for empty array
  if (files.length === 0) {
    errors.push('No files selected.');
    return { isValid: false, errors };
  }

  // Check number of files
  if (files.length > MAX_FILES_PER_UPLOAD) {
    errors.push(`Too many files selected. Maximum is ${MAX_FILES_PER_UPLOAD} files per upload.`);
  }

  // Check for duplicate names
  const names = files.map(f => f.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate filenames detected: ${duplicates.join(', ')}`);
  }

  // Validate each file
  files.forEach(file => {
    const fileValidation = validateFile(file);
    errors.push(...fileValidation.errors);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') return '';
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function isImageFile(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const ext = getFileExtension(filename).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

export function isVideoFile(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const ext = getFileExtension(filename).toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext);
}

export function isAudioFile(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const ext = getFileExtension(filename).toLowerCase();
  return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext);
}

export function sanitizePath(path: string): string {
  return path
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
}

export function validateFolderName(name: string): FileValidationResult {
  const errors: string[] = [];

  // Check for empty name
  if (!name.trim()) {
    errors.push('Folder name cannot be empty.');
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    errors.push('Folder name contains invalid characters.');
  }

  // Check length
  if (name.length > 255) {
    errors.push('Folder name is too long (maximum 255 characters).');
  }

  // Check for reserved names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(name.toUpperCase())) {
    errors.push('Folder name is reserved and cannot be used.');
  }

  // Check for hidden folders
  if (name.startsWith('.')) {
    errors.push('Hidden folders are not allowed.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function generateUniqueFileName(originalName: string, existingFiles: string[]): string {
  if (!originalName || typeof originalName !== 'string') {
    return `untitled_${Date.now()}`;
  }
  
  let fileName = originalName;
  let counter = 1;
  
  const lastDotIndex = originalName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';
  
  while (existingFiles.includes(fileName)) {
    fileName = `${nameWithoutExt} (${counter})${extension}`;
    counter++;
  }
  
  return fileName;
}