import { StateCreator } from 'zustand';

/**
 * Generic loading state slice creator
 * Provides consistent loading state management across stores
 */
export interface LoadingSlice {
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;
  clearLoading: (key: string) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
}

export const createLoadingSlice: StateCreator<LoadingSlice> = (set, get) => ({
  loading: {},
  
  setLoading: (key: string, value: boolean) => 
    set((state) => ({
      loading: { ...state.loading, [key]: value }
    })),
    
  clearLoading: (key: string) => 
    set((state) => {
      const newLoading = { ...state.loading };
      delete newLoading[key];
      return { loading: newLoading };
    }),
    
  isLoading: (key: string) => get().loading[key] || false,
  
  isAnyLoading: () => Object.keys(get().loading).length > 0
});

/**
 * Generic dialog state slice creator
 * Creates consistent dialog management for any dialog type
 */
export type DialogSlice<T extends string> = {
  [K in `show${T}Dialog`]: boolean;
} & {
  [K in `setShow${T}Dialog`]: (show: boolean) => void;
}

export function createDialogSlice<T extends string>(
  dialogName: T
): StateCreator<DialogSlice<T>> {
  const showKey = `show${dialogName}Dialog` as const;
  const setterKey = `setShow${dialogName}Dialog` as const;
  
  return (set) => ({
    [showKey]: false,
    [setterKey]: (show: boolean) => set({ [showKey]: show } as DialogSlice<T>)
  } as DialogSlice<T>);
}

/**
 * Generic selection slice creator
 * Provides consistent selection management for any entity type
 */
export interface SelectionSlice<T> {
  selected: Set<T>;
  lastSelected: T | null;
  select: (item: T) => void;
  deselect: (item: T) => void;
  toggleSelection: (item: T) => void;
  selectMultiple: (items: T[]) => void;
  clearSelection: () => void;
  isSelected: (item: T) => boolean;
  getSelectedArray: () => T[];
}

export function createSelectionSlice<T>(): StateCreator<SelectionSlice<T>> {
  return (set, get) => ({
    selected: new Set<T>(),
    lastSelected: null,
    
    select: (item: T) => 
      set((state) => ({
        selected: new Set(state.selected).add(item),
        lastSelected: item
      })),
      
    deselect: (item: T) => 
      set((state) => {
        const newSet = new Set(state.selected);
        newSet.delete(item);
        return { 
          selected: newSet,
          lastSelected: state.lastSelected === item ? null : state.lastSelected
        };
      }),
      
    toggleSelection: (item: T) => {
      const state = get();
      if (state.selected.has(item)) {
        state.deselect(item);
      } else {
        state.select(item);
      }
    },
    
    selectMultiple: (items: T[]) =>
      set((state) => ({
        selected: new Set([...state.selected, ...items]),
        lastSelected: items[items.length - 1] || state.lastSelected
      })),
      
    clearSelection: () => 
      set({ selected: new Set<T>(), lastSelected: null }),
      
    isSelected: (item: T) => get().selected.has(item),
    
    getSelectedArray: () => Array.from(get().selected)
  });
}

/**
 * Generic cache management slice creator
 * Provides consistent caching with TTL support
 */
export interface CacheSlice<K, V> {
  cache: Map<K, { data: V; timestamp: number }>;
  cacheTimeout: number;
  setCache: (key: K, value: V) => void;
  getCache: (key: K) => V | null;
  invalidateCache: (key: K) => void;
  invalidateAllCache: () => void;
  isCacheValid: (key: K) => boolean;
}

export function createCacheSlice<K, V>(
  defaultTimeout: number = 60000 // 60 seconds default
): StateCreator<CacheSlice<K, V>> {
  return (set, get) => ({
    cache: new Map(),
    cacheTimeout: defaultTimeout,
    
    setCache: (key: K, value: V) =>
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.set(key, { data: value, timestamp: Date.now() });
        return { cache: newCache };
      }),
      
    getCache: (key: K) => {
      const state = get();
      const cached = state.cache.get(key);
      if (!cached) return null;
      
      if (state.isCacheValid(key)) {
        return cached.data;
      }
      
      // Cache expired, remove it
      state.invalidateCache(key);
      return null;
    },
    
    invalidateCache: (key: K) =>
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.delete(key);
        return { cache: newCache };
      }),
      
    invalidateAllCache: () => 
      set({ cache: new Map() }),
      
    isCacheValid: (key: K) => {
      const state = get();
      const cached = state.cache.get(key);
      if (!cached) return false;
      
      const now = Date.now();
      return now - cached.timestamp < state.cacheTimeout;
    }
  });
}

/**
 * Combine multiple slices into a single store
 * Utility for composing stores from multiple slices
 */
export function combineSlices<T extends object>(...slices: StateCreator<unknown>[]): StateCreator<T> {
  return (set, get, api) => 
    Object.assign(
      {},
      ...slices.map(slice => slice(set, get, api))
    ) as T;
}

/**
 * Create a persisted store slice with custom serialization
 * Handles Sets, Maps, and other non-JSON types
 */
export interface PersistOptions<T> {
  name: string;
  include?: (keyof T)[];
  exclude?: (keyof T)[];
}

export function createPersistedSlice<T extends object>(
  slice: StateCreator<T>
): StateCreator<T> {
  // This is a simplified version - in production, you'd use zustand/middleware persist
  // with proper serialization for Sets and Maps
  return slice;
}

/**
 * Type-safe store selector creator
 * Ensures proper typing for store selectors
 */
export function createSelector<T, R>(
  selector: (state: T) => R
): (state: T) => R {
  return selector;
}

/**
 * Debounced setter creator
 * Useful for search inputs and other frequently updated values
 */
export function createDebouncedSetter<T>(
  setter: (value: T) => void,
  delay: number = 300
): (value: T) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (value: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => setter(value), delay);
  };
}