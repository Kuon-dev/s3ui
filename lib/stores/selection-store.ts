import { create } from 'zustand';
import { createSelectionSlice, SelectionSlice } from './utils/store-helpers';
import { R2Object } from '@/lib/r2/operations';

/**
 * Extended selection state with additional features
 */
export interface SelectionState extends SelectionSlice<string> {
  // Additional selection state
  selectedObject: R2Object | null;
  shiftStartKey: string | null;
  
  // Extended actions
  setSelectedObject: (object: R2Object | null) => void;
  selectRange: (startKey: string, endKey: string, allKeys: string[]) => void;
  selectAll: (keys: string[]) => void;
  toggleRangeSelection: (key: string, allKeys: string[], isShiftPressed: boolean) => void;
  
  // Getters
  getSelectionInfo: () => {
    count: number;
    hasSelection: boolean;
    isSingleSelection: boolean;
    isMultiSelection: boolean;
  };
}

export const useSelectionStore = create<SelectionState>()((set, get, api) => ({
  // Include base selection functionality
  ...createSelectionSlice<string>()(set, get, api),
  
  // Additional state
  selectedObject: null,
  shiftStartKey: null,
  
  // Extended actions
  setSelectedObject: (object: R2Object | null) => {
    set({ selectedObject: object });
  },
  
  selectRange: (startKey: string, endKey: string, allKeys: string[]) => {
    const startIndex = allKeys.indexOf(startKey);
    const endIndex = allKeys.indexOf(endKey);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex 
      ? [startIndex, endIndex] 
      : [endIndex, startIndex];
    
    const keysInRange = allKeys.slice(from, to + 1);
    
    set({
      selected: new Set(keysInRange),
      lastSelected: endKey
    });
  },
  
  selectAll: (keys: string[]) => {
    set({
      selected: new Set(keys),
      lastSelected: keys[keys.length - 1] || null
    });
  },
  
  toggleRangeSelection: (key: string, allKeys: string[], isShiftPressed: boolean) => {
    const state = get();
    
    if (isShiftPressed && state.lastSelected && state.lastSelected !== key) {
      // Shift+Click: Select range
      state.selectRange(state.lastSelected, key, allKeys);
      set({ shiftStartKey: state.lastSelected });
    } else {
      // Regular click or Ctrl/Cmd+Click
      if (state.selected.has(key)) {
        state.deselect(key);
      } else {
        if (!isShiftPressed && !state.shiftStartKey) {
          // Clear selection if not multi-selecting
          state.clearSelection();
        }
        state.select(key);
      }
      set({ shiftStartKey: null });
    }
  },
  
  getSelectionInfo: () => {
    const selected = get().selected;
    const count = selected.size;
    
    return {
      count,
      hasSelection: count > 0,
      isSingleSelection: count === 1,
      isMultiSelection: count > 1
    };
  }
}));

// Selectors
export const useSelectedKeys = () => 
  useSelectionStore(state => state.selected);

export const useIsSelected = (key: string) =>
  useSelectionStore(state => state.isSelected(key));

export const useSelectionInfo = () =>
  useSelectionStore(state => state.getSelectionInfo());

export const useSelectedObject = () =>
  useSelectionStore(state => state.selectedObject);

export const useSelectionActions = () =>
  useSelectionStore(state => ({
    select: state.select,
    deselect: state.deselect,
    toggleSelection: state.toggleSelection,
    selectAll: state.selectAll,
    clearSelection: state.clearSelection,
    toggleRangeSelection: state.toggleRangeSelection,
    setSelectedObject: state.setSelectedObject
  }));