/**
 * Caching utilities for optimizing API responses and reducing redundant requests.
 * Implements in-memory caching with TTL and LRU eviction strategies.
 * 
 * @fileoverview Caching system for performance optimization
 */

/**
 * Configuration for cache entries.
 * 
 * @public
 */
export interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Whether to serve stale data while revalidating in background */
  staleWhileRevalidate?: boolean;
  /** Maximum age for stale data in milliseconds */
  maxStaleAge?: number;
}

/**
 * Represents a cached entry with metadata.
 * 
 * @template T - The type of cached data
 * @internal
 */
interface CacheEntry<T> {
  /** The cached data */
  data: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry expires */
  expiresAt: number;
  /** Last access timestamp (for LRU) */
  lastAccessed: number;
  /** Cache configuration */
  config: CacheConfig;
  /** Whether entry is currently being revalidated */
  revalidating?: boolean;
}

/**
 * Statistics about cache performance.
 * 
 * @public
 */
export interface CacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Current number of entries */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Number of entries evicted due to size limit */
  evictions: number;
  /** Number of entries that expired */
  expirations: number;
}

/**
 * In-memory cache with TTL and LRU eviction.
 * 
 * @template T - The type of data being cached
 * @public
 */
export class Cache<T = unknown> {
  private entries = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };
  
  constructor(
    private maxSize: number = 1000,
    private defaultTtl: number = 5 * 60 * 1000 // 5 minutes
  ) {
    // Periodically clean up expired entries
    setInterval(() => this.cleanup(), 60000); // Every minute
  }
  
  /**
   * Gets a value from the cache.
   * 
   * @param key - Cache key
   * @param revalidate - Optional function to revalidate stale data
   * @returns Cached value or undefined if not found/expired
   * 
   * @example
   * ```typescript
   * const cache = new Cache<string>();
   * const value = await cache.get('user:123', async () => {
   *   return fetchUserFromAPI('123');
   * });
   * ```
   */
  async get(
    key: string,
    revalidate?: () => Promise<T>
  ): Promise<T | undefined> {
    const entry = this.entries.get(key);
    const now = Date.now();
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    // Update last accessed time
    entry.lastAccessed = now;
    
    // Check if entry is still valid
    if (now < entry.expiresAt) {
      this.stats.hits++;
      return entry.data;
    }
    
    // Entry is expired
    const maxStaleAge = entry.config.maxStaleAge || 0;
    const isStale = now > entry.expiresAt;
    const isTooStale = maxStaleAge > 0 && now > entry.expiresAt + maxStaleAge;
    
    // If stale-while-revalidate is enabled and data isn't too stale
    if (
      entry.config.staleWhileRevalidate &&
      isStale &&
      !isTooStale &&
      revalidate &&
      !entry.revalidating
    ) {
      // Serve stale data while revalidating in background
      entry.revalidating = true;
      
      // Background revalidation
      revalidate()
        .then(newData => {
          this.set(key, newData, entry.config);
        })
        .catch(error => {
          console.warn(`Cache revalidation failed for key ${key}:`, error);
        })
        .finally(() => {
          if (this.entries.has(key)) {
            this.entries.get(key)!.revalidating = false;
          }
        });
      
      this.stats.hits++;
      return entry.data;
    }
    
    // Entry is expired and can't use stale data
    this.entries.delete(key);
    this.stats.expirations++;
    this.stats.misses++;
    return undefined;
  }
  
  /**
   * Sets a value in the cache.
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param config - Cache configuration
   * 
   * @example
   * ```typescript
   * cache.set('user:123', userData, {
   *   ttl: 10 * 60 * 1000, // 10 minutes
   *   staleWhileRevalidate: true,
   *   maxStaleAge: 30 * 60 * 1000 // 30 minutes
   * });
   * ```
   */
  set(key: string, value: T, config?: Partial<CacheConfig>): void {
    const now = Date.now();
    const finalConfig: CacheConfig = {
      ttl: this.defaultTtl,
      staleWhileRevalidate: false,
      ...config,
    };
    
    const entry: CacheEntry<T> = {
      data: value,
      createdAt: now,
      expiresAt: now + finalConfig.ttl,
      lastAccessed: now,
      config: finalConfig,
    };
    
    this.entries.set(key, entry);
    
    // Evict oldest entries if cache is full
    if (this.entries.size > this.maxSize) {
      this.evictLRU();
    }
  }
  
  /**
   * Checks if a key exists and is not expired.
   * 
   * @param key - Cache key
   * @returns Whether the key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.entries.delete(key);
      this.stats.expirations++;
      return false;
    }
    
    return true;
  }
  
  /**
   * Deletes a cache entry.
   * 
   * @param key - Cache key to delete
   * @returns Whether the key was deleted
   */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }
  
  /**
   * Clears all cache entries.
   */
  clear(): void {
    this.entries.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }
  
  /**
   * Gets cache statistics.
   * 
   * @returns Cache performance statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      size: this.entries.size,
      maxSize: this.maxSize,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
    };
  }
  
  /**
   * Gets or sets a value with automatic revalidation.
   * 
   * @param key - Cache key
   * @param factory - Function to generate value if not cached
   * @param config - Cache configuration
   * @returns Cached or newly generated value
   * 
   * @example
   * ```typescript
   * const userData = await cache.getOrSet('user:123', async () => {
   *   return fetchUserFromAPI('123');
   * }, { ttl: 10 * 60 * 1000 });
   * ```
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const cached = await this.get(key, factory);
    
    if (cached !== undefined) {
      return cached;
    }
    
    // Generate new value
    const value = await factory();
    this.set(key, value, config);
    return value;
  }
  
  /**
   * Evicts least recently used entries to make space.
   * 
   * @private
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.entries) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.entries.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Removes expired entries from the cache.
   * 
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.entries) {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.entries.delete(key);
      this.stats.expirations++;
    }
  }
}

/**
 * Query cache specifically designed for search and API responses.
 * Includes deduplication and request coalescing.
 * 
 * @public
 */
export class QueryCache {
  private cache = new Cache<unknown>();
  private pendingRequests = new Map<string, Promise<unknown>>();
  
  constructor(maxSize?: number, defaultTtl?: number) {
    this.cache = new Cache(maxSize, defaultTtl);
  }
  
  /**
   * Executes a query with automatic caching and deduplication.
   * 
   * @template T - Expected return type
   * @param key - Unique query key
   * @param queryFn - Function that performs the query
   * @param config - Cache configuration
   * @returns Promise that resolves to query result
   * 
   * @example
   * ```typescript
   * const queryCache = new QueryCache();
   * const files = await queryCache.query<R2Object[]>(
   *   'files:documents/',
   *   () => listObjects('documents/'),
   *   { ttl: 2 * 60 * 1000 } // 2 minutes
   * );
   * ```
   */
  async query<T>(
    key: string,
    queryFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    // Check cache first
    const cached = await this.cache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }
    
    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
    
    // Execute query
    const promise = queryFn()
      .then(result => {
        this.cache.set(key, result, config);
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  /**
   * Invalidates cache entries by key pattern.
   * 
   * @param pattern - String or RegExp pattern to match keys
   * 
   * @example
   * ```typescript
   * // Invalidate all file listings
   * queryCache.invalidate(/^files:/);
   * 
   * // Invalidate specific folder
   * queryCache.invalidate('files:documents/');
   * ```
   */
  invalidate(pattern: string | RegExp): void {
    const keys = Array.from((this.cache as unknown as { entries: Map<string, unknown> }).entries.keys());
    const toDelete: string[] = [];
    
    for (const key of keys) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          toDelete.push(key);
        }
      } else {
        if (pattern.test(key)) {
          toDelete.push(key);
        }
      }
    }
    
    for (const key of toDelete) {
      this.cache.delete(key);
    }
  }
  
  /**
   * Gets cache statistics.
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
  
  /**
   * Clears all cached queries.
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

/**
 * React hook for using the query cache.
 * 
 * @template T - Expected data type
 * @param key - Unique query key
 * @param queryFn - Function that performs the query
 * @param config - Cache and query configuration
 * @returns Query result with loading state
 * 
 * @example
 * ```typescript
 * function FileList() {
 *   const { data: files, loading, error } = useQuery(
 *     'files:documents/',
 *     () => listObjects('documents/'),
 *     { ttl: 2 * 60 * 1000 }
 *   );
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   return <div>{files?.length} files found</div>;
 * }
 * ```
 * 
 * @public
 */
interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

export function useQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  config: Partial<CacheConfig> & {
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
): {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  if (!React) {
    throw new Error('useQuery requires React to be available');
  }
  
  const [state, setState] = React.useState({
    data: undefined as T | undefined,
    loading: true,
    error: null as Error | null,
  });
  
  const { enabled = true, refetchOnMount = true, ...cacheConfig } = config;
  
  React.useEffect(() => {
    if (!enabled) return;
    
    let cancelled = false;
    
    const executeQuery = async () => {
      try {
        setState((prev: QueryState<T>) => ({ ...prev, loading: true, error: null }));
        
        const result = await globalQueryCache.query(key, queryFn, cacheConfig);
        
        if (!cancelled) {
          setState({ data: result, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: undefined,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };
    
    executeQuery();
    
    return () => {
      cancelled = true;
    };
  }, [key, enabled, refetchOnMount, queryFn, cacheConfig]);
  
  const refetch = React.useCallback(async () => {
    globalQueryCache.invalidate(key);
    try {
      setState((prev: QueryState<T>) => ({ ...prev, loading: true, error: null }));
      const result = await globalQueryCache.query(key, queryFn, cacheConfig);
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: undefined,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [key, queryFn, cacheConfig]);
  
  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}

// We need to import React for the hook
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let React: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  React = require('react');
} catch {
  // React not available in this context
}

/**
 * Global instances for application-wide caching.
 */

/** Global query cache instance */
export const globalQueryCache = new QueryCache(1000, 5 * 60 * 1000);

/** Global cache for folder trees */
export const folderTreeCache = new Cache<unknown>(500, 10 * 60 * 1000);

/** Global cache for file metadata */
export const metadataCache = new Cache<unknown>(2000, 30 * 60 * 1000);

/**
 * Utility functions for cache key generation.
 */

/**
 * Generates a cache key for file listings.
 * 
 * @param prefix - Folder prefix
 * @returns Cache key
 */
export function createFileListKey(prefix: string): string {
  return `files:${prefix}`;
}

/**
 * Generates a cache key for folder trees.
 * 
 * @param prefix - Folder prefix
 * @returns Cache key
 */
export function createFolderTreeKey(prefix: string): string {
  return `tree:${prefix}`;
}

/**
 * Generates a cache key for search results.
 * 
 * @param query - Search query
 * @param options - Search options
 * @returns Cache key
 */
export function createSearchKey(query: string, options: Record<string, unknown> = {}): string {
  const optionsHash = JSON.stringify(options);
  return `search:${query}:${btoa(optionsHash)}`;
}

/**
 * Generates a cache key for file metadata.
 * 
 * @param key - File key
 * @returns Cache key
 */
export function createMetadataKey(key: string): string {
  return `metadata:${key}`;
}