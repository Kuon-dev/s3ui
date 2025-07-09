import {
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from './client';

/**
 * Represents an object (file or folder) in Cloudflare R2 storage.
 * 
 * @public
 */
export interface R2Object {
  /** The full path/key of the object in R2 storage */
  key: string;
  /** Size of the object in bytes (0 for folders) */
  size: number;
  /** Last modification timestamp */
  lastModified: Date;
  /** Whether this object represents a folder */
  isFolder: boolean;
}

/**
 * Lists objects (files and folders) in R2 storage with a given prefix.
 * Uses delimiter '/' to separate folders from files in the listing.
 * 
 * @param prefix - The prefix to filter objects by (defaults to empty string for root)
 * @returns Promise that resolves to an array of R2Objects
 * 
 * @example
 * ```typescript
 * // List all objects in root folder
 * const rootObjects = await listObjects();
 * 
 * // List objects in a specific folder
 * const folderObjects = await listObjects('documents/');
 * ```
 * 
 * @public
 */
export async function listObjects(prefix: string = ''): Promise<R2Object[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    Delimiter: '/',
  });

  const response = await r2Client.send(command);
  const objects: R2Object[] = [];

  // Add folders (CommonPrefixes)
  if (response.CommonPrefixes) {
    for (const prefix of response.CommonPrefixes) {
      if (prefix.Prefix) {
        objects.push({
          key: prefix.Prefix,
          size: 0,
          lastModified: new Date(),
          isFolder: true,
        });
      }
    }
  }

  // Add files (Contents)
  if (response.Contents) {
    for (const object of response.Contents) {
      if (object.Key && object.Key !== prefix) {
        objects.push({
          key: object.Key,
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
          isFolder: false,
        });
      }
    }
  }

  return objects;
}

/**
 * Creates a folder in R2 storage by uploading an empty object with a trailing slash.
 * 
 * @param folderPath - The path where the folder should be created
 * @throws {Error} When the folder creation fails
 * 
 * @example
 * ```typescript
 * // Create a folder in root
 * await createFolder('documents');
 * 
 * // Create nested folder
 * await createFolder('documents/images');
 * ```
 * 
 * @public
 */
export async function createFolder(folderPath: string): Promise<void> {
  const key = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: '',
  });

  await r2Client.send(command);
}

/**
 * Deletes an object (file or folder) from R2 storage.
 * For folders, recursively deletes all contained objects first.
 * 
 * @param key - The key/path of the object to delete
 * @throws {Error} When the deletion fails
 * 
 * @example
 * ```typescript
 * // Delete a file
 * await deleteObject('documents/file.pdf');
 * 
 * // Delete a folder and all its contents
 * await deleteObject('documents/');
 * ```
 * 
 * @public
 */
export async function deleteObject(key: string): Promise<void> {
  if (key.endsWith('/')) {
    // Delete folder and all its contents recursively
    const objects = await listObjectsRecursive(key);
    for (const obj of objects) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: obj.key,
      });
      await r2Client.send(deleteCommand);
    }
  }
  
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Renames an object in R2 storage by copying to new location and deleting original.
 * For folders, recursively renames all contained objects.
 * 
 * @param oldKey - The current key/path of the object
 * @param newKey - The desired new key/path for the object
 * @throws {Error} When the rename operation fails
 * 
 * @example
 * ```typescript
 * // Rename a file
 * await renameObject('old-name.pdf', 'new-name.pdf');
 * 
 * // Rename a folder
 * await renameObject('old-folder/', 'new-folder/');
 * ```
 * 
 * @public
 */
export async function renameObject(oldKey: string, newKey: string): Promise<void> {
  if (oldKey.endsWith('/')) {
    // Rename folder - need to copy all contents recursively
    const objects = await listObjectsRecursive(oldKey);
    for (const obj of objects) {
      const newObjKey = obj.key.replace(oldKey, newKey);
      await copyObject(obj.key, newObjKey);
      await deleteObject(obj.key);
    }
  } else {
    // Rename file
    await copyObject(oldKey, newKey);
    await deleteObject(oldKey);
  }
}

/**
 * Copies an object from one location to another within the same R2 bucket.
 * Used internally by rename operations.
 * 
 * @param sourceKey - The source object key/path
 * @param targetKey - The target object key/path
 * @throws {Error} When the copy operation fails
 * 
 * @internal
 */
async function copyObject(sourceKey: string, targetKey: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: R2_BUCKET_NAME,
    CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
    Key: targetKey,
  });

  await r2Client.send(command);
}

/**
 * Recursively lists all objects under a given prefix without delimiter.
 * This function will traverse the entire directory structure and return all files.
 * Used for operations that need to work with all files in a folder hierarchy.
 * 
 * @param prefix - The prefix to search under
 * @returns Promise that resolves to an array of all R2Objects under the prefix
 * 
 * @example
 * ```typescript
 * // Get all files in documents folder and subfolders
 * const allDocuments = await listObjectsRecursive('documents/');
 * ```
 * 
 * @public
 */
export async function listObjectsRecursive(prefix: string): Promise<R2Object[]> {
  const allObjects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          allObjects.push({
            key: object.Key,
            size: object.Size || 0,
            lastModified: object.LastModified || new Date(),
            isFolder: object.Key.endsWith('/'),
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return allObjects;
}

/**
 * Retrieves metadata for a specific file in R2 storage without downloading the content.
 * 
 * @param key - The key/path of the file to get metadata for
 * @returns Promise that resolves to an object containing file metadata
 * @throws {Error} When the file doesn't exist or metadata retrieval fails
 * 
 * @example
 * ```typescript
 * const metadata = await getFileMetadata('documents/file.pdf');
 * console.log(`File size: ${metadata.contentLength} bytes`);
 * console.log(`Content type: ${metadata.contentType}`);
 * ```
 * 
 * @public
 */
export async function getFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
  };
}

/**
 * Represents a node in the folder tree structure.
 * Used for building hierarchical views of R2 storage contents.
 * 
 * @public
 */
export interface FolderTreeNode {
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

/**
 * Builds a folder tree structure for a given prefix, including both folders and files.
 * Returns immediate children only (not recursive) for efficient lazy loading.
 * 
 * @param prefix - The folder prefix to get the tree for (defaults to root)
 * @returns Promise that resolves to an array of FolderTreeNode objects
 * 
 * @example
 * ```typescript
 * // Get root level folders and files
 * const rootTree = await getFolderTree();
 * 
 * // Get contents of a specific folder
 * const documentsTree = await getFolderTree('documents/');
 * ```
 * 
 * @public
 */
export async function getFolderTree(prefix: string = ''): Promise<FolderTreeNode[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    Delimiter: '/',
  });

  try {
    const response = await r2Client.send(command);
    const items: FolderTreeNode[] = [];

  // Add folders (CommonPrefixes)
  if (response.CommonPrefixes) {
    for (const commonPrefix of response.CommonPrefixes) {
      if (commonPrefix.Prefix) {
        const folderPath = commonPrefix.Prefix;
        const folderName = folderPath.replace(prefix, '').replace(/\/$/, '');
        
        if (folderName) {
          items.push({
            name: folderName,
            path: folderPath.replace(/\/$/, ''), // Remove trailing slash for display
            children: [],
            isExpanded: false,
            isFolder: true,
          });
        }
      }
    }
  }

  // Add files (Contents)
  if (response.Contents) {
    for (const object of response.Contents) {
      if (object.Key && object.Key !== prefix) {
        const fileName = object.Key.replace(prefix, '');
        
        // Skip if this is a folder marker (empty object ending with /)
        if (fileName && !fileName.endsWith('/')) {
          items.push({
            name: fileName,
            path: object.Key,
            children: [],
            isExpanded: false,
            isFolder: false,
            size: object.Size || 0,
            lastModified: object.LastModified || new Date(),
          });
        }
      }
    }
  }

  // Sort: folders first, then files, both alphabetically
  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });
  } catch (error) {
    // Handle NoSuchKey error (bucket doesn't exist or is empty)
    if (error && typeof error === 'object') {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return [];
      }
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Recursively builds a complete folder tree structure.
 * This is a legacy function that loads the entire tree at once.
 * Consider using getFolderTree() with lazy loading for better performance.
 * 
 * @returns Promise that resolves to a complete FolderTreeNode representing the root
 * @deprecated Use getFolderTree() with lazy loading instead for better performance
 * 
 * @public
 */
export async function getAllFolders(): Promise<FolderTreeNode> {
  const rootFolders = await getFolderTree('');
  
  const buildTree = async (folders: FolderTreeNode[]): Promise<FolderTreeNode[]> => {
    const result: FolderTreeNode[] = [];
    
    for (const folder of folders) {
      if (folder.isFolder) {
        const children = await getFolderTree(folder.path + '/');
        const processedChildren = await buildTree(children);
        
        result.push({
          ...folder,
          children: processedChildren,
        });
      } else {
        result.push(folder);
      }
    }
    
    return result;
  };

  const tree = await buildTree(rootFolders);
  
  return {
    name: 'Root',
    path: '',
    children: tree,
    isExpanded: true,
    isFolder: true,
  };
}

/**
 * Copies an object or folder from one location to another within R2 storage.
 * For folders, recursively copies all contained objects.
 * 
 * @param sourcePath - The source object/folder path
 * @param destinationPath - The destination path where the object/folder will be copied
 * @param isFolder - Whether the source is a folder
 * @returns Promise that resolves when the copy is complete
 * @throws {Error} When the copy operation fails
 * 
 * @example
 * ```typescript
 * // Copy a file
 * await copyObjectOrFolder('documents/file.pdf', 'backup/file.pdf', false);
 * 
 * // Copy a folder with all contents
 * await copyObjectOrFolder('documents/', 'backup/documents/', true);
 * ```
 * 
 * @public
 */
export async function copyObjectOrFolder(
  sourcePath: string, 
  destinationPath: string, 
  isFolder: boolean
): Promise<void> {
  if (isFolder) {
    // Ensure paths end with /
    const sourcePrefix = sourcePath.endsWith('/') ? sourcePath : `${sourcePath}/`;
    const destPrefix = destinationPath.endsWith('/') ? destinationPath : `${destinationPath}/`;
    
    // Prevent copying a folder into itself
    if (destPrefix.startsWith(sourcePrefix)) {
      throw new Error('Cannot copy a folder into itself');
    }
    
    // Copy the folder itself (empty object)
    await copyObject(sourcePrefix, destPrefix);
    
    // Copy all contents recursively
    const objects = await listObjectsRecursive(sourcePrefix);
    for (const obj of objects) {
      const relativePath = obj.key.substring(sourcePrefix.length);
      const newKey = destPrefix + relativePath;
      await copyObject(obj.key, newKey);
    }
  } else {
    // Copy single file
    await copyObject(sourcePath, destinationPath);
  }
}