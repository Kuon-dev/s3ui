'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  Download, 
  Eye, 
  Clock,
  Star,
  Upload,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { getFileIcon, getFileType, FileCategory } from '@/lib/utils/file-types';
import { useFileBrowserStore } from '@/lib/stores/file-browser-store';
import { cn } from '@/lib/utils';

/**
 * Represents a search result from the R2 global search.
 * 
 * @internal
 */
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

/**
 * Props for the GlobalSearch component.
 * 
 * @public
 */
interface GlobalSearchProps {
  /** Whether the search modal is currently open */
  isOpen: boolean;
  /** Callback to close the search modal */
  onClose: () => void;
  /** Callback to navigate to a specific path */
  onNavigate: (path: string) => void;
}

/**
 * GlobalSearch component provides a command palette interface for searching across
 * all files and folders in the R2 bucket. Features real-time search with debouncing,
 * file actions (preview, download), and keyboard navigation.
 * 
 * @param props - The component props
 * @returns JSX element for the global search modal
 * 
 * @example
 * ```tsx
 * <GlobalSearch
 *   isOpen={showSearch}
 *   onClose={() => setShowSearch(false)}
 *   onNavigate={(path) => navigateToPath(path)}
 * />
 * ```
 * 
 * @public
 */
export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const {
    setShowUploadDialog,
    setShowCreateFolderDialog,
    setSelectedObject,
    setShowPreviewDialog,
  } = useFileBrowserStore();
  
  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('r2-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const searchFiles = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/r2/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        
        // Save to recent searches
        if (searchQuery.trim() && data.results?.length > 0) {
          const newRecentSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
          setRecentSearches(newRecentSearches);
          localStorage.setItem('r2-recent-searches', JSON.stringify(newRecentSearches));
        }
      } else {
        toast.error('Failed to search files');
        setResults([]);
      }
    } catch {
      toast.error('Error searching files');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFiles(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, searchFiles]);

  const handleSelect = (result: SearchResult) => {
    if (result.isFolder) {
      onNavigate(result.key.replace(/\/$/, ''));
    } else {
      // Open preview dialog for files
      const fileObject = {
        key: result.key,
        size: result.size,
        lastModified: new Date(result.lastModified),
        isFolder: false
      };
      setSelectedObject(fileObject);
      setShowPreviewDialog(true);
      // Navigate to the folder containing the file
      onNavigate(result.path);
    }
    onClose();
  };

  const handleDownload = async (result: SearchResult) => {
    if (result.isFolder) return;
    
    try {
      const response = await fetch(`/api/r2/download?key=${encodeURIComponent(result.key)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else {
        toast.error('Failed to download file');
      }
    } catch {
      toast.error('Error downloading file');
    }
  };

  const handlePreview = (result: SearchResult) => {
    if (result.isFolder) return;
    
    const fileObject = {
      key: result.key,
      size: result.size,
      lastModified: new Date(result.lastModified),
      isFolder: false
    };
    setSelectedObject(fileObject);
    setShowPreviewDialog(true);
    onClose();
  };
  
  const handleQuickAction = (action: string) => {
    onClose();
    switch(action) {
      case 'upload':
        setShowUploadDialog(true);
        break;
      case 'new-folder':
        setShowCreateFolderDialog(true);
        break;
      case 'recent':
        if (recentSearches.length > 0) {
          setQuery(recentSearches[0]);
        }
        break;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const fileType = result.isFolder ? 'folder' : getFileType(result.name).category;
    if (!acc[fileType]) acc[fileType] = [];
    acc[fileType].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog
      title="Search everything"
      description="Search files, folders, and quick actions"
      open={isOpen}
      onOpenChange={onClose}
      showCloseButton={false}
      className="max-w-2xl"
    >
      <CommandInput
        placeholder="Type to search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-8">
          <div className="text-center space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : 'No results found.'}
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        {!query && (
          <>
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => handleQuickAction('upload')}
                className="gap-3"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Files</span>
                <CommandShortcut>⌘U</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleQuickAction('new-folder')}
                className="gap-3"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Create Folder</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={search}
                      value={search}
                      onSelect={() => setQuery(search)}
                      className="gap-3"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{search}</span>
                      {index === 0 && <Star className="h-3 w-3 text-yellow-500" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* Search Results */}
        {query && Object.entries(groupedResults).map(([category, items]) => {
          const categoryName = category === 'folder' ? 'Folders' : 
                              category === FileCategory.IMAGE ? 'Images' :
                              category === FileCategory.VIDEO ? 'Videos' :
                              category === FileCategory.AUDIO ? 'Audio' :
                              category === FileCategory.CODE ? 'Code' :
                              category === FileCategory.DOCUMENT ? 'Documents' :
                              category === FileCategory.ARCHIVE ? 'Archives' : 'Other Files';

          return (
            <CommandGroup key={category} heading={categoryName}>
              {items.map((result) => {
                const fileType = result.isFolder ? null : getFileType(result.name);
                const FileIcon = result.isFolder ? Folder : getFileIcon(result.name, false);
                
                return (
                  <CommandItem
                    key={result.key}
                    value={result.key}
                    onSelect={() => handleSelect(result)}
                    className="group gap-3"
                  >
                    <FileIcon className={cn(
                      "h-4 w-4 flex-shrink-0",
                      result.isFolder ? "text-blue-500" : fileType?.iconColor || "text-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.name}</span>
                        {!result.isFolder && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(result.size)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.path || 'Root'}
                      </div>
                    </div>
                    {!result.isFolder && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(result);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(result);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">esc</kbd>
            Close
          </span>
        </div>
        {query && results.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </CommandDialog>
  );
}