/**
 * Performance optimization utilities including debouncing, throttling,
 * memoization, and performance monitoring.
 * 
 * @fileoverview Performance utilities and optimizations
 */

/**
 * Configuration for debounced functions.
 * 
 * @public
 */
export interface DebounceConfig {
  /** Delay in milliseconds */
  delay: number;
  /** Whether to execute on the leading edge */
  leading?: boolean;
  /** Whether to execute on the trailing edge */
  trailing?: boolean;
  /** Maximum delay before forced execution */
  maxWait?: number;
}

/**
 * Configuration for throttled functions.
 * 
 * @public
 */
export interface ThrottleConfig {
  /** Delay in milliseconds */
  delay: number;
  /** Whether to execute on the leading edge */
  leading?: boolean;
  /** Whether to execute on the trailing edge */
  trailing?: boolean;
}

/**
 * Performance metrics for monitoring.
 * 
 * @public
 */
export interface PerformanceMetrics {
  /** Operation name */
  name: string;
  /** Start time */
  startTime: number;
  /** End time */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage before operation */
  memoryBefore?: number;
  /** Memory usage after operation */
  memoryAfter?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Creates a debounced version of a function that delays execution until
 * after the specified delay has elapsed since the last time it was invoked.
 * 
 * @template T - Function type
 * @param func - Function to debounce
 * @param config - Debounce configuration
 * @returns Debounced function with cancel method
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   searchFiles(query);
 * }, { delay: 300 });
 * 
 * // Cancel pending execution
 * debouncedSearch.cancel();
 * ```
 * 
 * @public
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  config: DebounceConfig
): T & { cancel: () => void; flush: () => void } {
  const { delay, leading = false, trailing = true, maxWait } = config;
  
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let result: ReturnType<T>;
  
  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thisArg = lastThis as any;
    
    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    result = func.apply(thisArg, args) as ReturnType<T>;
    return result;
  }
  
  function leadingEdge(time: number): ReturnType<T> {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }
  
  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;
    
    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }
  
  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }
  
  function timerExpired(): ReturnType<T> | void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }
  
  function trailingEdge(time: number): ReturnType<T> {
    timeoutId = null;
    
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }
  
  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = null;
    lastThis = null;
    timeoutId = null;
    maxTimeoutId = null;
  }
  
  function flush(): ReturnType<T> {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;
    
    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  }
  
  debounced.cancel = cancel;
  debounced.flush = flush;
  
  return debounced as unknown as T & { cancel: () => void; flush: () => void };
}

/**
 * Creates a throttled version of a function that only executes at most
 * once per specified delay period.
 * 
 * @template T - Function type
 * @param func - Function to throttle
 * @param config - Throttle configuration
 * @returns Throttled function with cancel method
 * 
 * @example
 * ```typescript
 * const throttledScroll = throttle((event: Event) => {
 *   handleScroll(event);
 * }, { delay: 100 });
 * ```
 * 
 * @public
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  config: ThrottleConfig
): T & { cancel: () => void } {
  const { delay, leading = true, trailing = true } = config;
  
  return debounce(func, {
    delay,
    leading,
    trailing,
    maxWait: delay,
  });
}

/**
 * Creates a memoized version of a function that caches results based on arguments.
 * 
 * @template T - Function type
 * @param func - Function to memoize
 * @param keyGenerator - Optional custom key generator
 * @param maxSize - Maximum cache size (LRU eviction)
 * @returns Memoized function with cache management methods
 * 
 * @example
 * ```typescript
 * const memoizedCalculation = memoize((a: number, b: number) => {
 *   return expensiveCalculation(a, b);
 * }, undefined, 100);
 * 
 * // Clear cache
 * memoizedCalculation.clear();
 * ```
 * 
 * @public
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  maxSize: number = 500
): T & {
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
  delete: (key: string) => boolean;
  has: (key: string) => boolean;
} {
  const cache = new Map<string, ReturnType<T>>();
  const accessOrder = new Map<string, number>();
  let accessCounter = 0;
  
  const defaultKeyGenerator = (...args: Parameters<T>): string => {
    return JSON.stringify(args);
  };
  
  const generateKey = keyGenerator || defaultKeyGenerator;
  
  function evictLRU(): void {
    if (cache.size <= maxSize) return;
    
    let oldestKey = '';
    let oldestAccess = Infinity;
    
    for (const [key, access] of accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
      accessOrder.delete(oldestKey);
    }
  }
  
  function memoized(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = generateKey(...args);
    
    if (cache.has(key)) {
      accessOrder.set(key, ++accessCounter);
      return cache.get(key)!;
    }
    
    const result = func.apply(this, args) as ReturnType<T>;
    
    cache.set(key, result);
    accessOrder.set(key, ++accessCounter);
    
    evictLRU();
    
    return result;
  }
  
  memoized.cache = cache;
  memoized.clear = () => {
    cache.clear();
    accessOrder.clear();
    accessCounter = 0;
  };
  memoized.delete = (key: string) => {
    accessOrder.delete(key);
    return cache.delete(key);
  };
  memoized.has = (key: string) => cache.has(key);
  
  return memoized as unknown as T & {
    cache: Map<string, ReturnType<T>>;
    clear: () => void;
    delete: (key: string) => boolean;
    has: (key: string) => boolean;
  };
}

/**
 * Performance monitoring utility for measuring operation durations.
 * 
 * @public
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations = new Map<string, { startTime: number; memoryBefore?: number }>();
  
  /**
   * Starts monitoring an operation.
   * 
   * @param name - Operation name
   * @param metadata - Additional metadata
   * @returns Operation ID for stopping the monitor
   */
  start(name: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    
    this.activeOperations.set(operationId, { startTime, memoryBefore });
    
    return operationId;
  }
  
  /**
   * Stops monitoring an operation and records metrics.
   * 
   * @param operationId - Operation ID from start()
   * @param metadata - Additional metadata
   */
  stop(operationId: string, metadata?: Record<string, unknown>): PerformanceMetrics | null {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`Performance monitor: Unknown operation ID ${operationId}`);
      return null;
    }
    
    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const name = operationId.split('_')[0];
    
    const metric: PerformanceMetrics = {
      name,
      startTime: operation.startTime,
      endTime,
      duration: endTime - operation.startTime,
      memoryBefore: operation.memoryBefore,
      memoryAfter,
      metadata,
    };
    
    this.metrics.push(metric);
    this.activeOperations.delete(operationId);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    return metric;
  }
  
  /**
   * Measures the performance of an async operation.
   * 
   * @template T - Return type of the operation
   * @param name - Operation name
   * @param operation - Async operation to measure
   * @param metadata - Additional metadata
   * @returns Promise that resolves to operation result
   * 
   * @example
   * ```typescript
   * const monitor = new PerformanceMonitor();
   * const files = await monitor.measure('listFiles', async () => {
   *   return listObjects('documents/');
   * }, { folder: 'documents' });
   * ```
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const operationId = this.start(name);
    
    try {
      const result = await operation();
      this.stop(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.stop(operationId, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Gets all recorded metrics.
   * 
   * @param filterFn - Optional filter function
   * @returns Array of performance metrics
   */
  getMetrics(filterFn?: (metric: PerformanceMetrics) => boolean): PerformanceMetrics[] {
    return filterFn ? this.metrics.filter(filterFn) : [...this.metrics];
  }
  
  /**
   * Gets performance statistics for operations.
   * 
   * @param operationName - Optional operation name filter
   * @returns Performance statistics
   */
  getStats(operationName?: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  } {
    const filteredMetrics = operationName
      ? this.metrics.filter(m => m.name === operationName)
      : this.metrics;
    
    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      };
    }
    
    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      count,
      averageDuration: totalDuration / count,
      minDuration: durations[0],
      maxDuration: durations[count - 1],
      totalDuration,
      p50: durations[Math.floor(count * 0.5)],
      p90: durations[Math.floor(count * 0.9)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }
  
  /**
   * Clears all recorded metrics.
   */
  clear(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }
  
  /**
   * Gets current memory usage if available.
   * 
   * @private
   */
  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (performance as any).memory?.usedJSHeapSize;
    }
    return undefined;
  }
}

/**
 * Utility for batching operations to reduce API calls.
 * 
 * @template T - Input type
 * @template R - Result type
 * @public
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private pendingPromises: Array<{
    resolve: (result: R[]) => void;
    reject: (error: Error) => void;
  }> = [];
  
  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize: number = 10,
    private delay: number = 100
  ) {}
  
  /**
   * Adds an item to the batch queue.
   * 
   * @param item - Item to process
   * @returns Promise that resolves when batch is processed
   * 
   * @example
   * ```typescript
   * const batcher = new BatchProcessor(
   *   (files: File[]) => uploadFiles(files),
   *   5, // batch size
   *   200 // delay in ms
   * );
   * 
   * const result = await batcher.add(file);
   * ```
   */
  add(item: T): Promise<R[]> {
    return new Promise<R[]>((resolve, reject) => {
      this.queue.push(item);
      this.pendingPromises.push({ resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => this.flush(), this.delay);
      }
    });
  }
  
  /**
   * Processes all queued items immediately.
   */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.queue.length === 0) return;
    
    const items = [...this.queue];
    const promises = [...this.pendingPromises];
    
    this.queue = [];
    this.pendingPromises = [];
    
    try {
      const results = await this.processor(items);
      promises.forEach(({ resolve }) => resolve(results));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      promises.forEach(({ reject }) => reject(err));
    }
  }
}

/**
 * Global performance monitor instance.
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * React hook for debounced values.
 * 
 * @template T - Value type
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 * 
 * @example
 * ```typescript
 * function SearchInput() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 * 
 *   useEffect(() => {
 *     if (debouncedQuery) {
 *       searchFiles(debouncedQuery);
 *     }
 *   }, [debouncedQuery]);
 * 
 *   return <input value={query} onChange={e => setQuery(e.target.value)} />;
 * }
 * ```
 * 
 * @public
 */
export function useDebounce<T>(value: T, delay: number): T {
  // This requires React to be available
  if (typeof React === 'undefined') {
    throw new Error('useDebounce requires React to be available');
  }
  
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Try to import React for hooks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let React: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  React = require('react');
} catch {
  // React not available
}

/**
 * Utility for virtual scrolling large lists.
 * Calculates which items should be rendered based on scroll position.
 * 
 * @public
 */
export class VirtualScrollCalculator {
  constructor(
    private itemHeight: number,
    private containerHeight: number,
    private overscan: number = 5
  ) {}
  
  /**
   * Calculates which items should be rendered.
   * 
   * @param scrollTop - Current scroll position
   * @param totalItems - Total number of items
   * @returns Render range and offset information
   */
  calculateVisibleRange(
    scrollTop: number,
    totalItems: number
  ): {
    startIndex: number;
    endIndex: number;
    offsetY: number;
    totalHeight: number;
  } {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / this.itemHeight) - this.overscan
    );
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + this.containerHeight) / this.itemHeight) + this.overscan
    );
    
    return {
      startIndex,
      endIndex,
      offsetY: startIndex * this.itemHeight,
      totalHeight: totalItems * this.itemHeight,
    };
  }
}