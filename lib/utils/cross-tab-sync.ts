import { fileEventBus, FileSystemEvent } from './file-event-bus';

interface TabSyncMessage {
  type: 'event' | 'state_change' | 'ping' | 'pong';
  event?: FileSystemEvent;
  state?: {
    currentPath?: string;
    expandedFolders?: string[];
  };
  tabId: string;
  timestamp: number;
}

class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  public readonly tabId: string;
  private isLeader = false;
  private otherTabs = new Set<string>();
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = new Map<string, number>();
  public enabled = true;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      this.initialize();
    } else {
      console.warn('BroadcastChannel API not supported - cross-tab sync disabled');
      this.enabled = false;
    }
  }

  private initialize(): void {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.warn('CrossTabSync: Running in SSR mode - skipping initialization');
        this.enabled = false;
        return;
      }

      this.channel = new BroadcastChannel('r2-file-manager-sync');
      
      // Listen for messages from other tabs
      this.channel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
        this.handleMessage(event.data);
      };

      // Listen for tab close to clean up
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });

      // Start leadership election
      this.startLeadershipElection();

      // Subscribe to local file events
      this.subscribeToFileEvents();
    } catch (error) {
      console.error('Failed to initialize cross-tab sync:', error);
      this.enabled = false;
    }
  }

  private handleMessage(message: TabSyncMessage): void {
    // Ignore own messages
    if (message.tabId === this.tabId) return;

    switch (message.type) {
      case 'event':
        // Re-emit file system event locally
        if (message.event) {
          this.handleRemoteEvent(message.event);
        }
        break;

      case 'state_change':
        // Handle state synchronization
        if (message.state) {
          this.handleStateChange(message.state);
        }
        break;

      case 'ping':
        // Respond to ping and track the tab
        this.otherTabs.add(message.tabId);
        this.lastPingTime.set(message.tabId, Date.now());
        this.sendMessage({ type: 'pong' });
        break;

      case 'pong':
        // Track responding tab
        this.otherTabs.add(message.tabId);
        this.lastPingTime.set(message.tabId, Date.now());
        break;
    }
  }

  private handleRemoteEvent(event: FileSystemEvent): void {
    // Re-emit the event locally, but mark it as remote to prevent loops
    const remoteEvent = { ...event, metadata: { ...event.payload.metadata, isRemote: true } };
    
    // Use the file event bus to emit locally
    fileEventBus.emit(event.type, remoteEvent.payload);
  }

  private handleStateChange(state: TabSyncMessage['state']): void {
    // Import stores dynamically to avoid circular dependencies
    import('../stores/navigation-store').then(({ useNavigationStore }) => {
      const navStore = useNavigationStore.getState();
      
      if (state?.currentPath !== undefined && state.currentPath !== navStore.currentPath) {
        // Navigate to the same path
        navStore.navigateToPath(state.currentPath, false);
      }

      if (state?.expandedFolders) {
        // Sync expanded folders
        useNavigationStore.setState({
          expandedFolders: new Set(state.expandedFolders)
        });
      }
    });
  }

  private subscribeToFileEvents(): void {
    // Subscribe to all file events
    fileEventBus.onAll((event) => {
      // Skip remote events to prevent loops
      if (event.payload.metadata?.isRemote) return;

      // Broadcast to other tabs
      this.sendMessage({
        type: 'event',
        event
      });
    });
  }

  private startLeadershipElection(): void {
    // Send initial ping
    this.sendMessage({ type: 'ping' });

    // Periodic ping to detect other tabs
    this.pingInterval = setInterval(() => {
      this.sendMessage({ type: 'ping' });
      
      // Clean up stale tabs (no response for 10 seconds)
      const now = Date.now();
      for (const [tabId, lastPing] of this.lastPingTime.entries()) {
        if (now - lastPing > 10000) {
          this.otherTabs.delete(tabId);
          this.lastPingTime.delete(tabId);
        }
      }

      // Determine leadership (oldest tab becomes leader)
      this.isLeader = this.otherTabs.size === 0;
    }, 3000);
  }

  private sendMessage(message: Omit<TabSyncMessage, 'tabId' | 'timestamp'>): void {
    if (!this.channel || !this.enabled) return;

    try {
      this.channel.postMessage({
        ...message,
        tabId: this.tabId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send cross-tab message:', error);
    }
  }

  /**
   * Broadcast a state change to other tabs
   */
  broadcastStateChange(state: TabSyncMessage['state']): void {
    this.sendMessage({
      type: 'state_change',
      state
    });
  }

  /**
   * Check if this tab is the leader
   */
  isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get the number of other active tabs
   */
  getOtherTabsCount(): number {
    return this.otherTabs.size;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.otherTabs.clear();
    this.lastPingTime.clear();
  }
}

// Singleton instance
export const crossTabSync = new CrossTabSync();

// Helper to broadcast navigation changes
export function broadcastNavigation(path: string): void {
  crossTabSync.broadcastStateChange({ currentPath: path });
}

// Helper to broadcast folder expansion changes
export function broadcastFolderExpansion(expandedFolders: Set<string>): void {
  crossTabSync.broadcastStateChange({ 
    expandedFolders: Array.from(expandedFolders) 
  });
}

// Initialize cross-tab sync (call this once when app starts)
export function initializeCrossTabSync(): void {
  // The constructor already initializes, but this provides an explicit entry point
  console.log('Cross-tab sync initialized:', {
    enabled: crossTabSync.enabled,
    tabId: crossTabSync.tabId
  });
}