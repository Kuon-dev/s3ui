import { create } from 'zustand';
import { getParentPath } from '@/lib/utils/path';

/**
 * Drag item interface
 */
export interface DragItem {
  key: string;
  name: string;
  isFolder: boolean;
  selectedKeys?: string[];
}

/**
 * Drop target validation result
 */
interface DropValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Drag & Drop Store
 * Manages drag and drop state and validation
 */
export interface DragDropState {
  // Current drag state
  draggingItem: DragItem | null;
  currentDropTarget: string | null;
  validDropTargets: Set<string>;
  isDragging: boolean;
  
  // Drag position for auto-scroll
  dragPosition: { x: number; y: number } | null;
  
  // Actions
  startDrag: (item: DragItem, validTargets?: string[]) => void;
  endDrag: () => void;
  updateDragPosition: (x: number, y: number) => void;
  
  // Drop target management
  setDropTarget: (target: string | null) => void;
  addValidDropTarget: (target: string) => void;
  removeValidDropTarget: (target: string) => void;
  setValidDropTargets: (targets: string[]) => void;
  
  // Validation
  canDrop: (targetPath: string) => DropValidation;
  isValidDropTarget: (targetPath: string) => boolean;
  
  // Getters
  getDraggedKeys: () => string[];
  isDraggingFolder: () => boolean;
  isDraggingMultiple: () => boolean;
}

export const useDragDropStore = create<DragDropState>()((set, get) => ({
  // Initial state
  draggingItem: null,
  currentDropTarget: null,
  validDropTargets: new Set(),
  isDragging: false,
  dragPosition: null,
  
  // Start drag operation
  startDrag: (item: DragItem, validTargets?: string[]) => {
    set({
      draggingItem: item,
      isDragging: true,
      validDropTargets: new Set(validTargets || [])
    });
  },
  
  // End drag operation
  endDrag: () => {
    set({
      draggingItem: null,
      currentDropTarget: null,
      validDropTargets: new Set(),
      isDragging: false,
      dragPosition: null
    });
  },
  
  // Update drag position for auto-scroll
  updateDragPosition: (x: number, y: number) => {
    set({ dragPosition: { x, y } });
  },
  
  // Drop target management
  setDropTarget: (target: string | null) => {
    set({ currentDropTarget: target });
  },
  
  addValidDropTarget: (target: string) => {
    set((state) => ({
      validDropTargets: new Set(state.validDropTargets).add(target)
    }));
  },
  
  removeValidDropTarget: (target: string) => {
    set((state) => {
      const newTargets = new Set(state.validDropTargets);
      newTargets.delete(target);
      return { validDropTargets: newTargets };
    });
  },
  
  setValidDropTargets: (targets: string[]) => {
    set({ validDropTargets: new Set(targets) });
  },
  
  // Validation
  canDrop: (targetPath: string): DropValidation => {
    const { draggingItem, validDropTargets } = get();
    
    if (!draggingItem) {
      return { isValid: false, reason: 'No item being dragged' };
    }
    
    // Get all keys being dragged
    const draggedKeys = get().getDraggedKeys();
    
    // Can't drop on itself
    if (draggedKeys.includes(targetPath)) {
      return { isValid: false, reason: 'Cannot drop item on itself' };
    }
    
    // Can't drop parent folder into its child
    for (const key of draggedKeys) {
      if (key.endsWith('/') && targetPath.startsWith(key)) {
        return { isValid: false, reason: 'Cannot move folder into its own subfolder' };
      }
    }
    
    // Can't drop into the same parent folder
    const targetParent = targetPath || '';
    for (const key of draggedKeys) {
      const sourceParent = getParentPath(key);
      if (sourceParent === targetParent) {
        return { isValid: false, reason: 'Item already in this folder' };
      }
    }
    
    // Check if target is in valid drop targets (if specified)
    if (validDropTargets.size > 0 && !validDropTargets.has(targetPath)) {
      return { isValid: false, reason: 'Invalid drop target' };
    }
    
    return { isValid: true };
  },
  
  isValidDropTarget: (targetPath: string): boolean => {
    return get().canDrop(targetPath).isValid;
  },
  
  // Getters
  getDraggedKeys: (): string[] => {
    const { draggingItem } = get();
    if (!draggingItem) return [];
    
    // If multiple items selected, return all selected keys
    if (draggingItem.selectedKeys && draggingItem.selectedKeys.length > 0) {
      return draggingItem.selectedKeys;
    }
    
    // Otherwise just the single dragged item
    return [draggingItem.key];
  },
  
  isDraggingFolder: (): boolean => {
    const { draggingItem } = get();
    if (!draggingItem) return false;
    
    // Check if any of the dragged items is a folder
    const draggedKeys = get().getDraggedKeys();
    return draggedKeys.some(key => key.endsWith('/'));
  },
  
  isDraggingMultiple: (): boolean => {
    const draggedKeys = get().getDraggedKeys();
    return draggedKeys.length > 1;
  }
}));

// Selectors
export const useDraggingItem = () =>
  useDragDropStore(state => state.draggingItem);

export const useIsDragging = () =>
  useDragDropStore(state => state.isDragging);

export const useCurrentDropTarget = () =>
  useDragDropStore(state => state.currentDropTarget);

export const useCanDrop = (targetPath: string) =>
  useDragDropStore(state => state.canDrop(targetPath));

export const useDragPosition = () =>
  useDragDropStore(state => state.dragPosition);

export const useDragDropActions = () =>
  useDragDropStore(state => ({
    startDrag: state.startDrag,
    endDrag: state.endDrag,
    setDropTarget: state.setDropTarget,
    updateDragPosition: state.updateDragPosition
  }));