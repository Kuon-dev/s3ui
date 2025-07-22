'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Folder, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getFileIcon, getFileType } from '@/lib/utils/file-types';
import { toast } from 'sonner';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => Promise<void>;
}

interface SearchResult {
  key: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
  matchType: 'name' | 'path';
  score: number;
}

export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Search function using API endpoint
  const searchFiles = useCallback(async (query: string, controller: AbortController) => {
    if (!query.trim()) {
      setApiResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/r2/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });
      const data = await response.json();
      
      if (response.ok) {
        // Convert API results to SearchResult format with scoring
        const results: SearchResult[] = data.results.map((result: {
          key: string;
          name: string;
          path: string;
          size: number;
          lastModified: string;
          isFolder: boolean;
        }) => {
          const name = result.name;
          const nameLower = name.toLowerCase();
          const queryLower = query.toLowerCase();
          
          let score = 0;
          let matchType: 'name' | 'path' = 'name';
          
          // Exact name match
          if (nameLower === queryLower) {
            score = 100;
          }
          // Name starts with query
          else if (nameLower.startsWith(queryLower)) {
            score = 80;
          }
          // Name contains query
          else if (nameLower.includes(queryLower)) {
            score = 60;
          }
          // Path contains query
          else if (result.path.toLowerCase().includes(queryLower)) {
            score = 40;
            matchType = 'path';
          }
          else {
            score = 20;
          }
          
          // Boost folders slightly
          if (result.isFolder) score += 5;
          
          return {
            key: result.key,
            name: result.name,
            path: result.path,
            size: result.size,
            lastModified: result.lastModified,
            isFolder: result.isFolder,
            matchType,
            score,
          };
        }).sort((a: SearchResult, b: SearchResult) => b.score - a.score);
        
        setApiResults(results);
        console.log('Search results:', results); // Debug log
        
        // Save to recent searches if we have results - use functional update to avoid dependency
        if (results.length > 0) {
          setRecentSearches(prev => {
            const newRecent = [query, ...prev.filter(s => s !== query)].slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(newRecent));
            return newRecent;
          });
        }
      } else {
        toast.error(t('errors.searchFailed'));
        setApiResults([]);
      }
    } catch (error) {
      // Only show error if it's not an abort error
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error(t('errors.searchError'));
      }
      setApiResults([]);
    } finally {
      setLoading(false);
    }
  }, [t]); // Translation dependency

  // Debounced search effect with request cancellation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      const newController = new AbortController();
      abortControllerRef.current = newController;
      
      searchFiles(searchQuery, newController);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      // Cancel any pending request when component unmounts or searchQuery changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, searchFiles]);

  // Use API results instead of local search
  const searchResults = useMemo(() => {
    return apiResults.slice(0, 20); // Limit to 20 results for UI performance
  }, [apiResults]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const folders = searchResults.filter(r => r.isFolder);
    const files = searchResults.filter(r => !r.isFolder);
    
    // Further group files by type
    const filesByType = files.reduce((acc, file) => {
      const type = getFileType(file.key).category;
      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    }, {} as Record<string, SearchResult[]>);
    
    console.log('Grouped results:', { folders, filesByType }); // Debug log
    return { folders, filesByType };
  }, [searchResults]);

  const handleSelect = useCallback(async (result: SearchResult) => {
    // Navigate to the folder containing the item
    if (result.isFolder) {
      await onNavigate(result.key);
    } else {
      await onNavigate(result.path);
    }
    
    onClose();
    setSearchQuery('');
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalResults = searchResults.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalResults);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
    }
  }, [searchResults, selectedIndex, handleSelect]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Cleanup abort controller when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const highlightMatch = (text: string, query: string) => {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/30 text-primary-foreground font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };


  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder={t('globalSearch.placeholder')}
        value={searchQuery}
        onValueChange={setSearchQuery}
        onKeyDown={handleKeyDown}
        className="h-12 text-base"
      />
      
      <CommandList>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('globalSearch.searching')}</span>
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t('globalSearch.noResultsFor', { query: searchQuery })}
                </p>
              </div>
            </CommandEmpty>
          ) : searchQuery && searchResults.length > 0 ? (
            <div>
              {/* Folders */}
              {groupedResults.folders.length > 0 && (
                <CommandGroup heading={t('globalSearch.foldersCount', { count: groupedResults.folders.length })}>
                  {groupedResults.folders.map((result) => {
                    const name = result.key.replace(/\/$/, '').split('/').pop() || t('common.home');
                    const isSelected = searchResults.indexOf(result) === selectedIndex;
                    
                    return (
                      <CommandItem
                        key={result.key}
                        value={result.key}
                        onSelect={() => handleSelect(result)}
                        className={`flex items-center gap-3 ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {highlightMatch(name, searchQuery)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.path || t('common.home')}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              
              {/* Files by type */}
              {Object.entries(groupedResults.filesByType).map(([type, files]) => {
                const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
                
                return (
                  <CommandGroup key={type} heading={t('globalSearch.typeCount', { type: typeLabel, count: files.length })}>
                    {files.map((result) => {
                      const name = result.key.split('/').pop() || result.key;
                      const Icon = getFileIcon(name, false);
                      const isSelected = searchResults.indexOf(result) === selectedIndex;
                      
                      return (
                        <CommandItem
                          key={result.key}
                          value={result.key}
                          onSelect={() => handleSelect(result)}
                          className={`flex items-center gap-3 ${isSelected ? 'bg-accent' : ''}`}
                        >
                          <Icon className={`h-4 w-4 file-type-${type} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {highlightMatch(name, searchQuery)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.path || t('common.home')}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </div>
          ) : !searchQuery && recentSearches.length > 0 ? (
            <CommandGroup heading={t('globalSearch.recentSearches')}>
              {recentSearches.map((search) => (
                <CommandItem
                  key={search}
                  onSelect={() => setSearchQuery(search)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
      </CommandList>
      
      <div className="flex items-center justify-between p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">↑↓</kbd>
            {t('common.navigate')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">↵</kbd>
            {t('common.open')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Esc</kbd>
            {t('common.close')}
          </span>
        </div>
        {searchResults.length > 0 && (
          <span>{t('globalSearch.resultsCount', { count: searchResults.length })}</span>
        )}
      </div>
    </CommandDialog>
  );
}