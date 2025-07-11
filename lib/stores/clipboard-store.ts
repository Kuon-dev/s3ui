import { create } from 'zustand';

/**
 * Clipboard item interface
 */
export interface ClipboardItem {
  key: string;
  name: string;
  isFolder: boolean;
  timestamp: number;
}

/**
 * Clipboard operation type
 */
export type ClipboardOperation = 'copy' | 'cut';

/**
 * Clipboard Store
 * Manages copy/cut/paste operations
 */
export interface ClipboardState {
  // Current clipboard state
  items: ClipboardItem[];
  operation: ClipboardOperation | null;
  sourcePath: string;
  
  // Actions
  copy: (items: Array<{ key: string; name: string; isFolder: boolean }>, sourcePath: string) => void;
  cut: (items: Array<{ key: string; name: string; isFolder: boolean }>, sourcePath: string) => void;
  clear: () => void;
  
  // Validation
  canPaste: (targetPath: string) => boolean;
  getPasteValidation: (targetPath: string) => {
    isValid: boolean;
    reason?: string;
    conflicts?: string[];
  };
  
  // Getters
  hasItems: () => boolean;
  isCutOperation: () => boolean;
  getItemCount: () => number;
  getOperationText: () => string;
}

export const useClipboardStore = create<ClipboardState>()((set, get) => ({
  // Initial state
  items: [],
  operation: null,
  sourcePath: '',
  
  // Copy items to clipboard
  copy: (items, sourcePath) => {
    const clipboardItems: ClipboardItem[] = items.map(item => ({
      ...item,
      timestamp: Date.now()
    }));
    
    set({
      items: clipboardItems,
      operation: 'copy',
      sourcePath
    });
  },
  
  // Cut items to clipboard
  cut: (items, sourcePath) => {
    const clipboardItems: ClipboardItem[] = items.map(item => ({
      ...item,
      timestamp: Date.now()
    }));
    
    set({
      items: clipboardItems,
      operation: 'cut',
      sourcePath
    });
  },
  
  // Clear clipboard
  clear: () => {
    set({
      items: [],
      operation: null,
      sourcePath: ''
    });
  },
  
  // Check if paste is allowed
  canPaste: (targetPath: string) => {
    const validation = get().getPasteValidation(targetPath);
    return validation.isValid;
  },
  
  // Get detailed paste validation
  getPasteValidation: (targetPath: string) => {
    const { items, operation, sourcePath } = get();
    
    if (!items.length || !operation) {
      return { isValid: false, reason: 'No items in clipboard' };
    }
    
    // Can't paste into the same location for cut operation
    if (operation === 'cut' && sourcePath === targetPath) {
      return { isValid: false, reason: 'Cannot move items to the same location' };
    }
    
    // Check for conflicts
    const conflicts: string[] = [];
    
    for (const item of items) {
      // Can't paste parent folder into its child
      if (item.isFolder && targetPath.startsWith(item.key)) {
        return { 
          isValid: false, 
          reason: `Cannot paste folder "${item.name}" into its own subfolder` 
        };
      }
      
      // Check for name conflicts (this would need to be validated against actual files)
      const targetKey = targetPath ? `${targetPath}/${item.name}` : item.name;
      if (item.isFolder && targetKey.endsWith('/')) {
        // Folder conflict check would go here
        conflicts.push(item.name);
      }
    }
    
    // If there are conflicts, we can still paste but should warn
    if (conflicts.length > 0) {
      return {
        isValid: true,
        conflicts,
        reason: `${conflicts.length} item(s) already exist and will be overwritten`
      };
    }
    
    return { isValid: true };
  },
  
  // Check if clipboard has items
  hasItems: () => {
    return get().items.length > 0;
  },
  
  // Check if current operation is cut
  isCutOperation: () => {
    return get().operation === 'cut';
  },
  
  // Get item count
  getItemCount: () => {
    return get().items.length;
  },
  
  // Get operation text for UI
  getOperationText: () => {
    const { items, operation } = get();
    const count = items.length;
    
    if (count === 0) return '';
    
    const itemText = count === 1 ? 'item' : 'items';
    const operationText = operation === 'cut' ? 'Cut' : 'Copied';
    
    return `${operationText} ${count} ${itemText}`;
  }
}));

// Selectors
export const useClipboardItems = () =>
  useClipboardStore(state => state.items);

export const useClipboardOperation = () =>
  useClipboardStore(state => state.operation);

export const useCanPaste = (targetPath: string) =>
  useClipboardStore(state => state.canPaste(targetPath));

export const useClipboardInfo = () =>
  useClipboardStore(state => ({
    hasItems: state.hasItems(),
    itemCount: state.getItemCount(),
    operation: state.operation,
    operationText: state.getOperationText()
  }));

export const useClipboardActions = () =>
  useClipboardStore(state => ({
    copy: state.copy,
    cut: state.cut,
    clear: state.clear,
    canPaste: state.canPaste
  }));